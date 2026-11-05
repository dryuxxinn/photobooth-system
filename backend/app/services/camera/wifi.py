import json
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from PIL import Image

from backend.app.services.camera.base import CameraInterface
from backend.app.services.camera.simulated import SimulatedCamera


class WifiCamera(CameraInterface):
    """
    Wireless camera driver supporting:
    1. 'sony_http': Sony Camera Remote API over HTTP JSON-RPC (Sony Alpha a6400 / ILCE-6400, a6000, a6500, a7 series).
       Default IP when connected to Sony camera Wi-Fi hotspot ("Ctrl w/ Smartphone"): 192.168.122.1
       Auto-detects Sony RPC port (10000 on a6400/a6100/a6600/a7III, 8080 on a6000/a5100/a7).
    2. 'ptpip': Wireless PTP/IP over TCP/IP via gphoto2 (--port ptpip:<ip>) for Sony, Canon, Nikon Wi-Fi.
    """

    def __init__(
        self,
        model_name: str = "Sony Alpha a6400 (Wi-Fi)",
        wifi_ip: str = "192.168.122.1",
        wifi_port: int = 10000,
        protocol: str = "sony_http",
        timeout: float = 4.0,
        allow_simulation_fallback: bool = True,
    ):
        self.model_name = model_name
        self.wifi_ip = wifi_ip.strip() or "192.168.122.1"
        self.wifi_port = int(wifi_port or 10000)
        self.protocol = protocol.lower().strip() if protocol else "sony_http"
        if self.protocol not in ("sony_http", "ptpip"):
            self.protocol = "sony_http"
        self.timeout = timeout
        self.allow_simulation_fallback = allow_simulation_fallback

        self.connected: bool = False
        self.hardware_reachable: bool = False
        self.last_error: str = ""
        self._capture_count: int = 0
        self._liveview_url: Optional[str] = None
        self._latest_liveview_jpeg: Optional[bytes] = None
        self._liveview_stop_event = threading.Event()
        self._liveview_thread: Optional[threading.Thread] = None
        self._capture_in_progress = threading.Event()
        self._sim_fallback = SimulatedCamera(
            model_name=f"{self.model_name} [{self.wifi_ip}]",
            capture_delay=0.05,
        )

    def _sony_rpc(
        self,
        method: str,
        params: Optional[list] = None,
        version: str = "1.0",
        port_override: Optional[int] = None,
        timeout_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Execute a JSON-RPC 2.0 call against Sony Camera Remote API."""
        port = port_override or self.wifi_port
        url = f"http://{self.wifi_ip}:{port}/sony/camera"
        payload = {
            "method": method,
            "params": params if params is not None else [],
            "id": 1,
            "version": version,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout_override or self.timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)

    def _start_liveview_worker(self) -> None:
        """Start background thread that continuously reads JPEG frames from Sony liveviewstream."""
        if self._liveview_thread and self._liveview_thread.is_alive():
            return
        self._liveview_stop_event.clear()
        self._liveview_thread = threading.Thread(
            target=self._liveview_loop,
            name="sony-wifi-liveview",
            daemon=True,
        )
        self._liveview_thread.start()

    def _stop_liveview_worker(self) -> None:
        self._liveview_stop_event.set()
        self._liveview_url = None

    def _liveview_loop(self) -> None:
        """Continuously stream liveview frames (~25 FPS) from Sony HTTP liveviewstream."""
        while not self._liveview_stop_event.is_set() and self.connected:
            if self._capture_in_progress.is_set():
                time.sleep(0.1)
                continue

            stream = None
            try:
                res = self._sony_rpc("startLiveview", timeout_override=3.0)
                result_list = res.get("result", [])
                if not result_list or not result_list[0]:
                    time.sleep(0.5)
                    continue
                self._liveview_url = result_list[0]
                stream = urllib.request.urlopen(self._liveview_url, timeout=4.0)
                buf = bytearray()

                while not self._liveview_stop_event.is_set() and not self._capture_in_progress.is_set():
                    part = stream.read(8192)
                    if not part:
                        break
                    buf.extend(part)
                    soi = buf.find(b"\xff\xd8")
                    if soi != -1:
                        eoi = buf.find(b"\xff\xd9", soi + 2)
                        if eoi != -1:
                            self._latest_liveview_jpeg = bytes(buf[soi : eoi + 2])
                            del buf[: eoi + 2]
                            if len(buf) > 262144:
                                buf.clear()
            except Exception:
                time.sleep(0.3)
            finally:
                if stream is not None:
                    try:
                        stream.close()
                    except Exception:
                        pass

    def connect(self) -> bool:
        self.last_error = ""
        if self.protocol == "sony_http":
            # Probe configured port first, then standard Sony Alpha ports (10000 for a6400/a7III, 8080 for a6000/a7)
            candidate_ports = []
            for p in (self.wifi_port, 10000, 8080):
                if p not in candidate_ports:
                    candidate_ports.append(p)

            for port in candidate_ports:
                try:
                    res = self._sony_rpc("getVersions", port_override=port, timeout_override=2.0)
                    if "result" in res:
                        self.wifi_port = port
                        # Some older Sony models require startRecMode; a6400 is already in rec mode
                        try:
                            avail = self._sony_rpc("getAvailableApiList", timeout_override=2.0)
                            methods = avail.get("result", [[]])[0]
                            if "startRecMode" in methods:
                                self._sony_rpc("startRecMode", timeout_override=3.0)
                        except Exception:
                            pass
                        self.connected = True
                        self.hardware_reachable = True
                        self._start_liveview_worker()
                        return True
                except Exception as exc:
                    self.last_error = f"Sony Wi-Fi API ({self.wifi_ip}:{port}) unreachable: {exc}"
        elif self.protocol == "ptpip":
            if shutil.which("gphoto2") is None:
                self.last_error = "gphoto2 binary not installed for PTP/IP mode"
            else:
                try:
                    res = subprocess.run(
                        ["gphoto2", "--port", f"ptpip:{self.wifi_ip}", "--summary"],
                        capture_output=True,
                        text=True,
                        timeout=4,
                    )
                    if res.returncode == 0:
                        self.connected = True
                        self.hardware_reachable = True
                        return True
                    self.last_error = (
                        res.stderr.strip()
                        or res.stdout.strip()
                        or f"PTP/IP camera at {self.wifi_ip} did not respond"
                    )
                except Exception as exc:
                    self.last_error = f"PTP/IP connection error ({self.wifi_ip}): {exc}"

        if self.allow_simulation_fallback:
            self.connected = True
            self.hardware_reachable = False
            self._sim_fallback.connect()
            return True

        self.connected = False
        self.hardware_reachable = False
        return False

    def disconnect(self) -> None:
        self.connected = False
        self.hardware_reachable = False
        self._stop_liveview_worker()
        self._sim_fallback.disconnect()

    def is_connected(self) -> bool:
        return self.connected

    def get_status(self) -> Dict[str, Any]:
        proto_label = "Sony HTTP API" if self.protocol == "sony_http" else "PTP/IP (gphoto2)"
        if not self.connected:
            msg = self.last_error or f"Disconnected ({proto_label} @ {self.wifi_ip})"
        elif self.hardware_reachable:
            msg = f"Wi-Fi Terhubung ({proto_label} @ {self.wifi_ip}:{self.wifi_port})"
        else:
            msg = f"Wi-Fi Standby / Sim Fallback ({proto_label} @ {self.wifi_ip}:{self.wifi_port})"

        return {
            "connected": self.connected,
            "model": self.model_name,
            "driver": "wifi",
            "battery_level": 100 if self.connected else 0,
            "message": msg,
            "wifi_ip": self.wifi_ip,
            "wifi_port": self.wifi_port,
            "wifi_protocol": self.protocol,
            "hardware_reachable": self.hardware_reachable,
        }

    def _capture_sony_http(self, target_path: Path) -> Dict[str, Any]:
        """
        Trigger shutter via Sony Camera Remote JSON-RPC API and download the JPEG.
        On Sony ILCE-6400 (a6400), actHalfPressShutter must precede actTakePicture,
        followed by cancelHalfPressShutter.
        """
        self._capture_in_progress.set()
        try:
            # Ensure we have the active port if not yet connected to hardware
            if not self.hardware_reachable:
                for p in (self.wifi_port, 10000, 8080):
                    try:
                        ver = self._sony_rpc("getVersions", port_override=p, timeout_override=1.5)
                        if "result" in ver:
                            self.wifi_port = p
                            self.hardware_reachable = True
                            self._start_liveview_worker()
                            break
                    except Exception:
                        pass

            # 1. Half-press shutter to engage autofocus / metering (required by ILCE-6400)
            try:
                self._sony_rpc("actHalfPressShutter", timeout_override=3.0)
                time.sleep(0.35)
            except Exception:
                pass

            # 2. Trigger shutter release
            try:
                res = self._sony_rpc("actTakePicture", timeout_override=10.0)
                if "error" in res:
                    err_code = (
                        res["error"][0]
                        if isinstance(res["error"], list) and res["error"]
                        else -1
                    )
                    if err_code == 40403:
                        # Long shooting / AF still in progress -> awaitTakePicture
                        res = self._sony_rpc("awaitTakePicture", timeout_override=10.0)
                    elif err_code == 40400:
                        # Retry once after an extra brief AF settle delay
                        time.sleep(0.4)
                        res = self._sony_rpc("actTakePicture", timeout_override=10.0)
                        if "error" in res:
                            raise RuntimeError(f"Sony actTakePicture RPC error: {res['error']}")
                    else:
                        raise RuntimeError(f"Sony actTakePicture RPC error: {res['error']}")
            finally:
                # 3. Always release half-press shutter
                try:
                    self._sony_rpc("cancelHalfPressShutter", timeout_override=2.0)
                except Exception:
                    pass

            result_list = res.get("result", [])
            if not result_list or not result_list[0]:
                raise RuntimeError(f"Sony actTakePicture returned empty result: {res}")

            image_url = result_list[0][0]
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(image_url, timeout=15.0) as img_resp:
                img_bytes = img_resp.read()
            target_path.write_bytes(img_bytes)

            width, height = 1800, 1200
            try:
                with Image.open(target_path) as im:
                    width, height = im.size
            except Exception:
                pass

            self._capture_count += 1
            return {
                "success": True,
                "file_path": str(target_path),
                "filename": target_path.name,
                "width": width,
                "height": height,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "capture_number": self._capture_count,
                "protocol": "sony_http",
                "wifi_ip": self.wifi_ip,
            }
        finally:
            self._capture_in_progress.clear()

    def _capture_ptpip(self, target_path: Path) -> Dict[str, Any]:
        """Trigger shutter via gphoto2 over PTP/IP wireless connection."""
        if shutil.which("gphoto2") is None:
            raise RuntimeError("gphoto2 is not installed for PTP/IP capture")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "gphoto2",
            "--port",
            f"ptpip:{self.wifi_ip}",
            "--capture-image-and-download",
            "--filename",
            str(target_path),
            "--force-overwrite",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if res.returncode != 0 or not target_path.exists():
            err_msg = res.stderr.strip() or res.stdout.strip() or "Unknown gphoto2 PTP/IP error"
            raise RuntimeError(f"PTP/IP capture failed ({self.wifi_ip}): {err_msg}")

        width, height = 1800, 1200
        try:
            with Image.open(target_path) as im:
                width, height = im.size
        except Exception:
            pass

        self._capture_count += 1
        return {
            "success": True,
            "file_path": str(target_path),
            "filename": target_path.name,
            "width": width,
            "height": height,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "capture_number": self._capture_count,
            "protocol": "ptpip",
            "wifi_ip": self.wifi_ip,
        }

    def capture_image(self, target_path: Path) -> Dict[str, Any]:
        if not self.connected:
            raise RuntimeError("Wi-Fi camera is disconnected.")

        try:
            if self.protocol == "sony_http":
                result = self._capture_sony_http(target_path)
                self.hardware_reachable = True
                return result
            else:
                result = self._capture_ptpip(target_path)
                self.hardware_reachable = True
                return result
        except Exception as exc:
            self.last_error = str(exc)
            # If Sony liveview frame is available (e.g. AF failed to lock in dark room),
            # use the real Sony liveview frame before falling back to synthetic simulation!
            if self._latest_liveview_jpeg:
                try:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with Image.open(io_bytes := __import__("io").BytesIO(self._latest_liveview_jpeg)) as lv_img:
                        resized = lv_img.convert("RGB").resize((1800, 1200), Image.Resampling.LANCZOS)
                        resized.save(target_path, format="JPEG", quality=94)
                    self._capture_count += 1
                    return {
                        "success": True,
                        "file_path": str(target_path),
                        "filename": target_path.name,
                        "width": 1800,
                        "height": 1200,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "capture_number": self._capture_count,
                        "protocol": "sony_http_liveview",
                        "wifi_ip": self.wifi_ip,
                    }
                except Exception:
                    pass

            self.hardware_reachable = False
            if self.allow_simulation_fallback:
                self._capture_count += 1
                sim_res = self._sim_fallback.capture_image(target_path)
                sim_res["protocol"] = f"{self.protocol}_fallback"
                sim_res["wifi_ip"] = self.wifi_ip
                return sim_res
            raise RuntimeError(f"Wi-Fi camera capture failed: {exc}") from exc

    def _fetch_sony_liveview_jpeg_once(self) -> Optional[bytes]:
        """Fetch a single JPEG frame if background worker hasn't populated one yet."""
        for p in (self.wifi_port, 10000, 8080):
            try:
                res = self._sony_rpc("startLiveview", port_override=p, timeout_override=2.0)
                result_list = res.get("result", [])
                if result_list and result_list[0]:
                    self.wifi_port = p
                    self.hardware_reachable = True
                    self._liveview_url = result_list[0]
                    self._start_liveview_worker()
                    break
            except Exception:
                continue

        if not self._liveview_url:
            return None

        # Wait briefly for background worker to grab the first frame
        for _ in range(15):
            if self._latest_liveview_jpeg:
                return self._latest_liveview_jpeg
            time.sleep(0.03)
        return self._latest_liveview_jpeg

    def capture_preview_bytes(self) -> Optional[bytes]:
        if not self.connected:
            return None

        if self.protocol == "sony_http":
            if self._latest_liveview_jpeg:
                return self._latest_liveview_jpeg
            frame = self._fetch_sony_liveview_jpeg_once()
            if frame:
                return frame

        if self.protocol == "ptpip" and self.hardware_reachable and shutil.which("gphoto2"):
            try:
                res = subprocess.run(
                    [
                        "gphoto2",
                        "--port",
                        f"ptpip:{self.wifi_ip}",
                        "--capture-preview",
                        "--stdout",
                    ],
                    capture_output=True,
                    timeout=4,
                )
                if res.returncode == 0 and res.stdout:
                    return res.stdout
            except Exception:
                pass

        if self.allow_simulation_fallback:
            return self._sim_fallback.capture_preview_bytes()
        return None
