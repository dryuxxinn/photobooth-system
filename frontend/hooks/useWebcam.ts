"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadOperatorConfig, saveOperatorConfig } from "@/lib/config";

export type CameraSourceMode = "webcam" | "server";
export type WebcamFacingMode = "user" | "environment";

export function isCaptureCardDevice(label: string = ""): boolean {
  const l = label.toLowerCase();
  // Don't misclassify standard laptop or USB webcams as capture cards
  if (l.includes("webcam") || l.includes("integrated") || l.includes("facetime") || l.includes("laptop")) {
    return false;
  }
  return (
    l.includes("usb video") ||
    l.includes("capture") ||
    l.includes("cam link") ||
    l.includes("hdmi") ||
    l.includes("fhd capture") ||
    l.includes("ezcap") ||
    l.includes("elgato")
  );
}

export function formatCameraLabel(device: MediaDeviceInfo, index: number): string {
  const label = device.label || "";
  if (isCaptureCardDevice(label)) {
    return `[HDMI/Capture] ${label || "Capture Card / USB Video"}`;
  }
  const l = label.toLowerCase();
  if (l.includes("front") || l.includes("user") || l.includes("facetime") || l.includes("depan")) {
    return "Kamera Depan";
  }
  if (l.includes("back") || l.includes("environment") || l.includes("rear") || l.includes("belakang")) {
    return "Kamera Belakang";
  }
  return label ? label : `Kamera ${index + 1}`;
}

interface UseWebcamOptions {
  active: boolean;
}

export function useWebcam({ active }: UseWebcamOptions) {
  const [cameraSource, setCameraSourceState] = useState<CameraSourceMode>("webcam");
  const [facingMode, setFacingMode] = useState<WebcamFacingMode>("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(null);
  const [isMirrored, setIsMirroredState] = useState<boolean>(true);
  const [streamReady, setStreamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>("Webcam / Kamera Perangkat");

  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // Load saved preferences on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedSource = localStorage.getItem("dryu_camera_source") as CameraSourceMode | null;
    if (savedSource === "webcam" || savedSource === "server") {
      setCameraSourceState(savedSource);
    }
    const savedDevice = localStorage.getItem("dryu_camera_device_id");
    if (savedDevice) {
      setSelectedDeviceIdState(savedDevice);
    }
    const savedMirror = localStorage.getItem("dryu_camera_mirrored");
    if (savedMirror !== null) {
      setIsMirroredState(savedMirror === "true");
    }
  }, []);

  const setCameraSource = useCallback((source: CameraSourceMode) => {
    setCameraSourceState(source);
    if (typeof window !== "undefined") {
      localStorage.setItem("dryu_camera_source", source);
      const cfg = loadOperatorConfig();
      saveOperatorConfig({ ...cfg, cameraSourceMode: source });
    }
  }, []);

  const setSelectedDeviceId = useCallback((deviceId: string | null) => {
    setSelectedDeviceIdState(deviceId);
    if (typeof window !== "undefined") {
      if (deviceId) {
        localStorage.setItem("dryu_camera_device_id", deviceId);
      } else {
        localStorage.removeItem("dryu_camera_device_id");
      }
      const cfg = loadOperatorConfig();
      saveOperatorConfig({ ...cfg, preferredDeviceId: deviceId });
    }
  }, []);

  const setIsMirrored = useCallback((mirrored: boolean) => {
    setIsMirroredState(mirrored);
    if (typeof window !== "undefined") {
      localStorage.setItem("dryu_camera_mirrored", String(mirrored));
    }
  }, []);

  const toggleMirror = useCallback(() => {
    setIsMirroredState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("dryu_camera_mirrored", String(next));
      }
      return next;
    });
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    setStreamReady(false);
  }, []);

  // Enumerate connected video devices (Built-in Webcam, USB Capture Card, EOS Webcam, etc.)
  const enumerateDevices = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
    } catch {
      // Ignore enumeration failure if permissions not yet granted
    }
  }, []);

  const startStream = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStreamReady(false);
      setWebcamError(
        "Browser ini belum mengizinkan akses kamera langsung (gunakan http://localhost:3000 atau HTTPS)."
      );
      return;
    }

    stopStream();
    setWebcamError(null);

    const requestMediaStream = async (deviceIdToUse: string | null): Promise<MediaStream> => {
      const videoConstraint: MediaTrackConstraints = deviceIdToUse
        ? {
            deviceId: { exact: deviceIdToUse },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraint,
      });
    };

    try {
      let stream: MediaStream;
      try {
        stream = await requestMediaStream(selectedDeviceId);
      } catch (firstErr) {
        // If a specific saved deviceId failed (e.g., unplugged USB Video or inactive virtual cam),
        // automatically fall back to the default system camera!
        if (selectedDeviceId) {
          setSelectedDeviceIdState(null);
          localStorage.removeItem("dryu_camera_device_id");
          stream = await requestMediaStream(null);
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const activeLabel = videoTrack?.label || "";

      if (activeLabel) {
        setDeviceLabel(activeLabel);
        if (isCaptureCardDevice(activeLabel) && localStorage.getItem("dryu_camera_mirrored") === null) {
          setIsMirroredState(false);
        }
      } else {
        setDeviceLabel(
          facingMode === "user" ? "Webcam / Kamera Depan" : "Kamera Belakang"
        );
      }

      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        videoElRef.current.play().catch(() => {});
      }
      setStreamReady(true);

      // Refresh device list now that user granted camera permission
      enumerateDevices();
    } catch (err: any) {
      setStreamReady(false);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setWebcamError(
          "Izin kamera ditolak di browser. Klik ikon kamera/gembok di address bar browser untuk mengizinkan akses kamera."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setWebcamError(
          "Tidak ditemukan perangkat kamera/webcam aktif pada perangkat ini."
        );
      } else {
        setWebcamError(
          `Kamera sedang digunakan aplikasi lain atau tidak merespons (${name || "Error"}). Coba pilih input kamera lain di bawah.`
        );
      }
    }
  }, [facingMode, selectedDeviceId, stopStream, enumerateDevices]);

  // Listen for USB device plug / unplug (e.g. plugging HDMI Capture card into iPad USB-C)
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.addEventListener) {
      return;
    }
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateDevices]);

  useEffect(() => {
    if (active && cameraSource === "webcam") {
      startStream();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [active, cameraSource, startStream, stopStream]);

  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      videoElRef.current = node;
      if (streamRef.current) {
        if (node.srcObject !== streamRef.current) {
          node.srcObject = streamRef.current;
        }
        node.play().catch(() => {});
      }
    } else if (videoElRef.current && !videoElRef.current.isConnected) {
      videoElRef.current = null;
    }
  }, []);

  const toggleFacingMode = useCallback(() => {
    setSelectedDeviceIdState(null);
    setFacingMode((prev) => {
      const next = prev === "user" ? "environment" : "user";
      setIsMirroredState(next === "user");
      return next;
    });
  }, []);

  const captureFrameDataUrl = useCallback((filterCss?: string): string | null => {
    const video = videoElRef.current;
    if (
      cameraSource !== "webcam" ||
      !streamRef.current ||
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    const targetW = 1800;
    const targetH = 1200; // 3:2 DSLR / Photobooth aspect ratio
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetAspect = targetW / targetH;
    const videoAspect = vw / vh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (videoAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    // Mirror horizontally if isMirrored is active so captured photo matches viewfinder
    if (isMirrored) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    // Apply active filter to high-res canvas snapshot
    if (filterCss && filterCss !== "none") {
      try {
        ctx.filter = filterCss;
      } catch {
        // fallback gracefully if ctx.filter isn't supported
      }
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.94);
  }, [cameraSource, isMirrored]);

  return {
    cameraSource,
    setCameraSource,
    facingMode,
    toggleFacingMode,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isMirrored,
    setIsMirrored,
    toggleMirror,
    streamReady,
    webcamError,
    deviceLabel,
    attachVideoRef,
    retryWebcam: startStream,
    captureFrameDataUrl,
  };
}
