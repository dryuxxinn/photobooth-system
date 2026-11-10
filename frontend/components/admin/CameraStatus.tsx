"use client";

import React, { useEffect, useState } from "react";
import { CameraStatus as CameraStatusType } from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CameraIcon, RefreshIcon } from "@/components/icons";

interface CameraStatusProps {
  cameraStatus: CameraStatusType | null;
  onRefresh: () => Promise<void>;
}

export function CameraStatus({ cameraStatus, onRefresh }: CameraStatusProps) {
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const [driver, setDriver] = useState<"simulation" | "gphoto" | "wifi">(
    (cameraStatus?.driver as "simulation" | "gphoto" | "wifi") || "simulation"
  );
  const [modelName, setModelName] = useState(
    cameraStatus?.model || "Sony Alpha a6400"
  );
  const [wifiIp, setWifiIp] = useState(cameraStatus?.wifi_ip || "192.168.122.1");
  const [wifiPort, setWifiPort] = useState(
    String(cameraStatus?.wifi_port || 10000)
  );
  const [wifiProtocol, setWifiProtocol] = useState<"sony_http" | "ptpip">(
    (cameraStatus?.wifi_protocol as "sony_http" | "ptpip") || "sony_http"
  );

  useEffect(() => {
    if (cameraStatus) {
      if (
        cameraStatus.driver === "simulation" ||
        cameraStatus.driver === "gphoto" ||
        cameraStatus.driver === "wifi"
      ) {
        setDriver(cameraStatus.driver);
      }
      if (cameraStatus.model) setModelName(cameraStatus.model);
      if (cameraStatus.wifi_ip) setWifiIp(cameraStatus.wifi_ip);
      if (cameraStatus.wifi_port) setWifiPort(String(cameraStatus.wifi_port));
      if (
        cameraStatus.wifi_protocol === "sony_http" ||
        cameraStatus.wifi_protocol === "ptpip"
      ) {
        setWifiProtocol(cameraStatus.wifi_protocol);
      }
    }
  }, [cameraStatus]);

  const isConnected = cameraStatus?.connected ?? false;

  const handleTestCapture = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await photoboothApi.captureStandaloneTest();
      setTestResult(`Berhasil: ${res.filename}`);
      await onRefresh();
    } catch (err: any) {
      setTestResult(`Gagal: ${err?.message || "Kesalahan kamera"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCameraConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setTestResult(null);
    try {
      const defaultModel =
        driver === "wifi" && modelName.includes("Canon")
          ? "Sony Alpha a6400 (Wi-Fi)"
          : modelName;
      const updated = await photoboothApi.configureCamera({
        driver,
        model: defaultModel,
        wifi_ip: wifiIp.trim() || "192.168.122.1",
        wifi_port: Number(wifiPort) || 8080,
        wifi_protocol: wifiProtocol,
      });
      setTestResult(`Mode kamera diperbarui: ${updated.driver.toUpperCase()} (${updated.message})`);
      await onRefresh();
    } catch (err: any) {
      setTestResult(`Gagal menyimpan konfigurasi: ${err?.message || "Error"}`);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <Card variant="surface" padding="md" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-sweet-blush flex items-center justify-center text-sweet-primaryStrong">
            <CameraIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-sweet-text">
              CAMERA
            </h3>
            <p className="text-xs text-sweet-muted">
              {cameraStatus?.model || "Canon EOS 700D"}
            </p>
          </div>
        </div>
        <StatusBadge tone={isConnected ? "success" : "error"}>
          {isConnected ? "Connected" : "Offline"}
        </StatusBadge>
      </div>

      <dl className="text-xs space-y-1 bg-sweet-bg p-3 rounded-2xl border border-sweet-border">
        <div className="flex justify-between">
          <dt className="text-sweet-muted">Driver:</dt>
          <dd className="font-mono font-bold text-sweet-text uppercase">
            {cameraStatus?.driver || "-"}
          </dd>
        </div>
        {cameraStatus?.driver === "wifi" && (
          <div className="flex justify-between">
            <dt className="text-sweet-muted">Wi-Fi Target:</dt>
            <dd className="font-mono font-semibold text-sweet-primaryStrong">
              {cameraStatus.wifi_ip || "192.168.122.1"}:
              {cameraStatus.wifi_port || 8080} (
              {cameraStatus.wifi_protocol || "sony_http"})
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-sweet-muted">Baterai:</dt>
          <dd className="font-bold text-sweet-text">
            {cameraStatus?.battery_level != null
              ? `${cameraStatus.battery_level}%`
              : "AC / USB Power"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-sweet-muted shrink-0">Pesan:</dt>
          <dd className="text-sweet-text truncate text-right">
            {cameraStatus?.message || "-"}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowConfig((prev) => !prev)}
          className="text-xs font-semibold text-sweet-primaryStrong hover:underline"
        >
          {showConfig
            ? "Sembunyikan Pengaturan Koneksi (USB / Wi-Fi)"
            : "Atur Koneksi Kamera (USB / Wi-Fi Sony a6400)"}
        </button>
      </div>

      {showConfig && (
        <form
          onSubmit={handleSaveCameraConfig}
          className="space-y-2.5 p-3 rounded-2xl bg-sweet-bg border border-sweet-border text-xs"
        >
          <div className="space-y-1">
            <label
              htmlFor="camera-driver-select"
              className="block font-semibold text-sweet-text"
            >
              Mode Driver Kamera
            </label>
            <select
              id="camera-driver-select"
              value={driver}
              onChange={(e) => {
                const nextDriver = e.target.value as
                  | "simulation"
                  | "gphoto"
                  | "wifi";
                setDriver(nextDriver);
                if (nextDriver === "wifi" && modelName.includes("Canon")) {
                  setModelName("Sony Alpha a6400 (Wi-Fi)");
                }
              }}
              className="w-full px-2.5 py-2 rounded-xl bg-sweet-surface border border-sweet-border text-sweet-text font-medium"
            >
              <option value="simulation">Simulasi (Tanpa Kamera Fisik)</option>
              <option value="gphoto">Kabel USB (gphoto2 DSLR / Mirrorless)</option>
              <option value="wifi">
                Nirkabel Wi-Fi (Sony a6400 HTTP API / PTP-IP)
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="camera-model-input"
              className="block font-semibold text-sweet-text"
            >
              Nama / Model Kamera
            </label>
            <input
              id="camera-model-input"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Sony Alpha a6400"
              className="w-full px-2.5 py-1.5 rounded-xl bg-sweet-surface border border-sweet-border text-sweet-text"
            />
          </div>

          {driver === "wifi" && (
            <>
              <div className="space-y-1">
                <label
                  htmlFor="camera-wifi-protocol-select"
                  className="block font-semibold text-sweet-text"
                >
                  Protokol Wi-Fi Kamera
                </label>
                <select
                  id="camera-wifi-protocol-select"
                  value={wifiProtocol}
                  onChange={(e) =>
                    setWifiProtocol(e.target.value as "sony_http" | "ptpip")
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-sweet-surface border border-sweet-border text-sweet-text font-medium"
                >
                  <option value="sony_http">
                    Sony Camera Remote HTTP API (a6400 / Alpha Smart Remote)
                  </option>
                  <option value="ptpip">
                    PTP/IP Wireless (gphoto2 --port ptpip:IP)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label
                    htmlFor="camera-wifi-ip-input"
                    className="block font-semibold text-sweet-text"
                  >
                    IP Kamera Wi-Fi
                  </label>
                  <input
                    id="camera-wifi-ip-input"
                    type="text"
                    value={wifiIp}
                    onChange={(e) => setWifiIp(e.target.value)}
                    placeholder="192.168.122.1"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-sweet-surface border border-sweet-border font-mono text-sweet-text"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="camera-wifi-port-input"
                    className="block font-semibold text-sweet-text"
                  >
                    Port HTTP
                  </label>
                  <input
                    id="camera-wifi-port-input"
                    type="number"
                    value={wifiPort}
                    onChange={(e) => setWifiPort(e.target.value)}
                    placeholder="8080"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-sweet-surface border border-sweet-border font-mono text-sweet-text"
                  />
                </div>
              </div>

              <p className="text-[11px] text-sweet-muted leading-relaxed">
                Untuk <strong>Sony a6400</strong>: aktifkan{" "}
                <em>Ctrl w/ Smartphone</em> di menu Network kamera, lalu
                sambungkan Wi-Fi server/PC ke SSID kamera (IP bawaan Sony a6400:{" "}
                <code className="font-mono">192.168.122.1:10000</code>).
              </p>
            </>
          )}

          <Button
            type="submit"
            variant="secondary"
            size="md"
            loading={savingConfig}
            className="w-full text-xs"
          >
            Simpan & Hubungkan Kamera
          </Button>
        </form>
      )}

      {testResult && (
        <p className="text-xs font-mono px-3 py-2 rounded-xl bg-sweet-blush text-sweet-text border border-sweet-primary">
          {testResult}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="md"
          loading={testing}
          onClick={handleTestCapture}
          className="flex-1 text-xs"
        >
          Tes Jepret Kamera
        </Button>
        <Button
          variant="surface"
          size="md"
          onClick={onRefresh}
          aria-label="Segarkan status kamera"
        >
          <RefreshIcon className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
