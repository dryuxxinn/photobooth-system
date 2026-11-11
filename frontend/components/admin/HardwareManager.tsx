"use client";

import React, { useState } from "react";
import {
  BoothOperatorConfig,
  CameraStatus as CameraStatusType,
  PrinterStatus as PrinterStatusType,
  PrintJobRecord,
} from "@/types/photobooth";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
import { CameraStatus } from "./CameraStatus";
import { PrinterStatus } from "./PrinterStatus";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import {
  CameraIcon,
  CheckIcon,
  PrinterIcon,
  RefreshIcon,
  SettingsIcon,
  SpinnerIcon,
} from "@/components/icons";

interface HardwareManagerProps {
  config: BoothOperatorConfig;
  onUpdateConfig: (next: BoothOperatorConfig) => void;
  cameraStatus: CameraStatusType | null;
  printerStatus: PrinterStatusType | null;
  printJobs?: PrintJobRecord[];
  onRefresh: () => Promise<void>;
  readOnly?: boolean;
}

export function HardwareManager({
  config,
  onUpdateConfig,
  cameraStatus,
  printerStatus,
  printJobs = [],
  onRefresh,
  readOnly = false,
}: HardwareManagerProps) {
  const [testingCamera, setTestingCamera] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraTestNotice, setCameraTestNotice] = useState<string | null>(null);

  const handleTestShutter = async () => {
    setTestingCamera(true);
    setCameraTestNotice(null);
    setCapturedPhotoUrl(null);
    try {
      const res = await photoboothApi.captureStandaloneTest();
      if (res.filename) {
        setCapturedPhotoUrl(resolveStorageUrl(`/storage/captures/${res.filename}`));
        setCameraTestNotice(`Jepretan berhasil disimpan: ${res.filename}`);
      } else {
        setCameraTestNotice("Jepretan berhasil dilakukan.");
      }
      await onRefresh();
    } catch (err: any) {
      setCameraTestNotice(`Gagal jepret: ${err?.message || "Kesalahan koneksi kamera"}`);
    } finally {
      setTestingCamera(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 2 Hardware Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CameraStatus cameraStatus={cameraStatus} onRefresh={onRefresh} />
        <PrinterStatus printerStatus={printerStatus} />
      </div>

      {/* Shutter Test with Visual Preview */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <CameraIcon className="size-5 text-sweet-primaryStrong" />
              <span>Uji Jepret Kamera & Kalibrasi Flash</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Uji rana kamera mekanik dan sinkronisasi lampu studio flash sebelum sesi pelanggan dimulai.
            </p>
          </div>

          <button
            type="button"
            disabled={testingCamera}
            onClick={handleTestShutter}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {testingCamera ? (
              <>
                <SpinnerIcon className="size-4 animate-spin" />
                <span>Menjepret...</span>
              </>
            ) : (
              <>
                <CameraIcon className="size-4" />
                <span>Uji Jepret Shutter</span>
              </>
            )}
          </button>
        </div>

        {cameraTestNotice && (
          <p className="text-xs font-heading font-bold text-sweet-text">
            {cameraTestNotice}
          </p>
        )}

        {/* Thumbnail Preview if captured */}
        {capturedPhotoUrl && (
          <div className="p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border space-y-2">
            <span className="text-xs font-heading font-bold text-sweet-muted block">
              Pratinjau Hasil Foto Uji Coba:
            </span>
            <div className="relative max-w-sm rounded-xl overflow-hidden border border-sweet-border bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPhotoUrl}
                alt="Pratinjau Uji Kamera"
                className="w-full h-auto object-contain max-h-60"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Pengaturan Arsitektur Kamera Kiosk */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <SettingsIcon className="size-5 text-sweet-primaryStrong" />
              <span>Arsitektur Kamera Kiosk</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Tentukan sumber video preview dan hardware yang terhubung ke bilik Kiosk.
            </p>
          </div>
          <StatusBadge tone={config.cameraSourceMode === "server" ? "lavender" : "pink"}>
            Mode: {config.cameraSourceMode === "server" ? "DSLR Server (USB)" : "iPad / Capture Card"}
          </StatusBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const next = { ...config, cameraSourceMode: "webcam" as const };
              onUpdateConfig(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("dryu_camera_source", "webcam");
              }
            }}
            className={`min-h-[44px] p-4 rounded-3xl border-3 text-left transition-all flex flex-col gap-2 disabled:opacity-75 disabled:cursor-not-allowed ${
              config.cameraSourceMode !== "server"
                ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8]"
                : "bg-sweet-bg border-sweet-border hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-sm text-[#3F3D56]">
                iPad / Dongle Capture Card
              </span>
              {config.cameraSourceMode !== "server" && (
                <span className="text-[#F472B6] font-bold text-xs inline-flex items-center gap-1">
                  <CheckIcon className="size-3.5" />
                  <span>Aktif</span>
                </span>
              )}
            </div>
            <p className="text-xs text-sweet-muted">
              Kamera DSLR dihubungkan via HDMI-to-USB-C Capture Card ke tablet atau browser kios. Langsung live di layar.
            </p>
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const next = { ...config, cameraSourceMode: "server" as const };
              onUpdateConfig(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("dryu_camera_source", "server");
              }
            }}
            className={`min-h-[44px] p-4 rounded-3xl border-3 text-left transition-all flex flex-col gap-2 disabled:opacity-75 disabled:cursor-not-allowed ${
              config.cameraSourceMode === "server"
                ? "bg-[#F3E8FF] border-[#A855F7] shadow-sweet ring-2 ring-[#E9D5FF]"
                : "bg-sweet-bg border-sweet-border hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-sm text-[#3F3D56]">
                DSLR USB Laptop (Server Backend)
              </span>
              {config.cameraSourceMode === "server" && (
                <span className="text-[#A855F7] font-bold text-xs inline-flex items-center gap-1">
                  <CheckIcon className="size-3.5" />
                  <span>Aktif</span>
                </span>
              )}
            </div>
            <p className="text-xs text-sweet-muted">
              Kamera DSLR dihubungkan langsung via kabel USB ke PC server (driver gPhoto2). Mendukung sinkronisasi flash studio.
            </p>
          </button>
        </div>

        {/* Cermin Viewfinder */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
          <div>
            <span className="font-heading font-bold text-sm text-sweet-text block">
              Cermin Kamera (Mirror Viewfinder)
            </span>
            <span className="text-xs text-sweet-muted">
              Balik preview kamera secara horizontal layaknya cermin untuk kenyamanan pose pelanggan
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.isMirrored ?? true}
            onChange={(e) => {
              const next = { ...config, isMirrored: e.target.checked };
              onUpdateConfig(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("dryu_camera_mirrored", String(e.target.checked));
              }
            }}
            className="size-5 accent-sweet-primaryStrong"
          />
        </label>
      </Card>

      {/* Konfigurasi Alur Kiosk & Attract Mode */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text">
              Alur Pengalaman Kiosk (Kiosk UX Flow)
            </h3>
            <p className="text-xs text-sweet-muted">
              Sesuaikan langkah yang dilewati pengunjung saat berfoto di bilik photobooth.
            </p>
          </div>
          <StatusBadge tone="success">Tersimpan Otomatis</StatusBadge>
        </div>

        {/* Pilihan Attract Screen */}
        <div className="p-4 rounded-3xl bg-sweet-bg border border-sweet-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-heading font-bold text-sm text-sweet-text">
              Tampilan Layar Awal (Attract Screen)
            </span>
            <StatusBadge tone={config.welcomeScreenMode === "live_preview" ? "pink" : "lavender"}>
              {config.welcomeScreenMode === "live_preview" ? "Live Mirror Kamera" : "3D Strips Statis"}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onUpdateConfig({ ...config, welcomeScreenMode: "static" })}
              className={`min-h-[44px] p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 ${
                (config.welcomeScreenMode ?? "static") === "static"
                  ? "bg-[#FFF0F5] border-[#DB2777] shadow-xs"
                  : "bg-white hover:bg-sweet-surface border-sweet-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-extrabold text-xs text-[#3F3D56]">
                  1. Showcase Statis (3D Floating Strips)
                </span>
                {(config.welcomeScreenMode ?? "static") === "static" && (
                  <CheckIcon className="size-4 text-sweet-primaryStrong" />
                )}
              </div>
              <p className="text-[11px] text-sweet-muted">
                Panggung 3D estetik dengan contoh photostrip Sweet Studio.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onUpdateConfig({ ...config, welcomeScreenMode: "live_preview" })}
              className={`min-h-[44px] p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 ${
                config.welcomeScreenMode === "live_preview"
                  ? "bg-[#FFF0F5] border-[#DB2777] shadow-xs"
                  : "bg-white hover:bg-sweet-surface border-sweet-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-extrabold text-xs text-[#3F3D56]">
                  2. Cermin Interaktif (Live Viewfinder)
                </span>
                {config.welcomeScreenMode === "live_preview" && (
                  <CheckIcon className="size-4 text-sweet-primaryStrong" />
                )}
              </div>
              <p className="text-[11px] text-sweet-muted">
                Kamera aktif live di layar beranda untuk menarik pengunjung merapikan pose.
              </p>
            </button>
          </div>
        </div>

        {/* Toggles Alur Sesi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Tahap Pilih Foto
              </span>
              <span className="text-xs text-sweet-muted">
                Review foto sebelum frame
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enablePhotoSelectionStep ?? true}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enablePhotoSelectionStep: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Tahap Pilih Frame
              </span>
              <span className="text-xs text-sweet-muted">
                Pilih tema vibe frame
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enableTemplateSelectionStep ?? true}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enableTemplateSelectionStep: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Efek Audio Kiosk
              </span>
              <span className="text-xs text-sweet-muted">
                Suara beep, shutter, chime
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enableSoundEffects ?? true}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enableSoundEffects: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>
        </div>

        {/* Domain Cloud URL */}
        <div>
          <label
            htmlFor="hw-cloud-url-input"
            className="font-heading font-bold text-xs text-sweet-text block mb-1"
          >
            Domain Cloud / Public Share Base URL:
          </label>
          <input
            id="hw-cloud-url-input"
            type="url"
            autoComplete="off"
            placeholder="Contoh: https://booth.sweetstudio.id"
            value={config.publicShareBaseUrl || ""}
            onChange={(e) =>
              onUpdateConfig({
                ...config,
                publicShareBaseUrl: e.target.value,
              })
            }
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-semibold text-sweet-text"
          />
          <p className="text-[11px] text-sweet-muted mt-1">
            Jika diisi, QR code galeri digital pelanggan akan menggunakan domain ini (misal via Cloudflare Tunnel).
          </p>
        </div>
      </Card>

      {/* Printer Jobs History */}
      <PrinterStatus
        printerStatus={printerStatus}
        printJobs={printJobs}
        showJobsTable
      />
    </div>
  );
}