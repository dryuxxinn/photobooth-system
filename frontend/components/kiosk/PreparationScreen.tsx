"use client";

import React, { useState } from "react";
import {
  CameraStatus,
  FrameThemeOption,
  PrinterStatus,
  TemplateOption,
} from "@/types/photobooth";
import { PREPARATION_IDLE_SECONDS } from "@/lib/config";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { CameraPreview } from "./CameraPreview";
import {
  CameraSourceMode,
  WebcamFacingMode,
  formatCameraLabel,
  isCaptureCardDevice,
} from "@/hooks/useWebcam";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LayoutMock } from "@/components/LayoutMock";
import { PHOTO_FILTERS, getFilterCss } from "@/lib/defaults";
import { playSuccessChime } from "@/lib/sound";
import {
  ArrowLeftIcon,
  CheckIcon,
  FlowerIcon,
  HeartIcon,
  SparkleIcon,
} from "@/components/icons";

interface PreparationScreenProps {
  cameraStatus: CameraStatus | null;
  printerStatus?: PrinterStatus | null;
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  selectedTemplate: TemplateOption;
  onSelectTemplate: (tpl: TemplateOption) => void;
  selectedFrameColor: string;
  onSelectFrameColor: (colorId: string) => void;
  selectedCountdownSeconds: number;
  onSelectCountdownSeconds: (sec: number) => void;
  selectedFilter?: string;
  onSelectFilter?: (filterId: string) => void;
  cameraSource: CameraSourceMode;
  onChangeCameraSource: (source: CameraSourceMode) => void;
  facingMode: WebcamFacingMode;
  onToggleFacingMode: () => void;
  devices?: MediaDeviceInfo[];
  selectedDeviceId?: string | null;
  onSelectDeviceId?: (deviceId: string) => void;
  isMirrored?: boolean;
  onToggleMirror?: () => void;
  streamReady: boolean;
  webcamError: string | null;
  deviceLabel: string;
  attachVideoRef: (node: HTMLVideoElement | null) => void;
  onRetryWebcam: () => void;
  isBusy: boolean;
  onBack: () => void;
  onStartCapture: (customerName?: string) => void;
}

export function PreparationScreen({
  cameraStatus,
  printerStatus,
  templates,
  frameThemes,
  selectedTemplate,
  onSelectTemplate,
  selectedFrameColor,
  onSelectFrameColor,
  selectedCountdownSeconds,
  onSelectCountdownSeconds,
  selectedFilter = "original",
  onSelectFilter,
  cameraSource,
  onChangeCameraSource,
  facingMode,
  onToggleFacingMode,
  devices,
  selectedDeviceId,
  onSelectDeviceId,
  isMirrored,
  onToggleMirror,
  streamReady,
  webcamError,
  deviceLabel,
  attachVideoRef,
  onRetryWebcam,
  isBusy,
  onBack,
  onStartCapture,
}: PreparationScreenProps) {
  const [customerName, setCustomerName] = useState("");
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isUsingWebcam = cameraSource === "webcam";
  const cameraReady = isUsingWebcam ? streamReady : (cameraStatus?.connected ?? true);
  const isCapture = isCaptureCardDevice(deviceLabel);

  const { secondsLeft } = useIdleCountdown({
    enabled: !isBusy,
    totalSeconds: PREPARATION_IDLE_SECONDS,
    onExpire: onBack,
  });

  const cameraSummaryText = isUsingWebcam
    ? streamReady
      ? isCapture
        ? "DSLR USB Capture Card (Live HD)"
        : `Kamera Perangkat: ${deviceLabel}`
      : "Menyiapkan Kamera..."
    : cameraStatus?.connected
    ? cameraStatus?.driver === "wifi"
      ? `Wi-Fi Sony (${cameraStatus?.model || "a6400"})`
      : `Kamera Server (${cameraStatus?.model || "Canon EOS DSLR"})`
    : "Kamera Server Terputus";

  const handleStartWithPreflight = () => {
    if (!cameraReady) {
      setReadinessModalOpen(true);
      return;
    }
    if (isBusy || isStarting) return;
    setIsStarting(true);
    playSuccessChime();
    setTimeout(() => {
      onStartCapture(customerName.trim() || undefined);
    }, 200);
  };

  return (
    <section
      aria-labelledby="prep-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-3 sm:px-6 py-2 sm:py-3 overflow-hidden animate-screen-fade relative"
    >
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pb-1">
        <Button
          variant="surface"
          size="sm"
          leftIcon={<ArrowLeftIcon className="size-4" />}
          onClick={onBack}
          disabled={isBusy || isStarting}
        >
          Back
        </Button>

        <div className="text-center">
          <h1
            id="prep-heading"
            className="font-heading font-extrabold text-xl sm:text-2xl text-sweet-text flex items-center justify-center gap-1.5"
          >
            <span>READY, CUTIES?</span>
            <HeartIcon className="size-5 text-sweet-primaryStrong" />
          </h1>
          <p className="text-[11px] sm:text-xs text-sweet-muted font-heading font-semibold">
            Stand here and look at the camera • Sesi 6 Pose • Pilih {selectedTemplate.photos_required} Foto Terbaik untuk Frame ♡
          </p>
        </div>

        <StatusBadge tone="neutral"> Reset {secondsLeft}d </StatusBadge>
      </div>

      {/* Main Content Grid: Left Viewport (~60%) & Right Frame Configuration (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 items-start max-w-7xl w-full mx-auto my-auto flex-1 min-h-0">
        {/* Left Column: Live Camera Viewport, Consolidated Camera Controls & Live Filters */}
        <div className="lg:col-span-7 flex flex-col items-center gap-2.5 animate-container-left">
          <CameraPreview
            cameraStatus={cameraStatus}
            photosRequired={selectedTemplate.photos_required}
            photosTaken={0}
            mode="preparation"
            cameraSource={cameraSource}
            onChangeCameraSource={onChangeCameraSource}
            facingMode={facingMode}
            onToggleFacingMode={onToggleFacingMode}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDeviceId={onSelectDeviceId}
            isMirrored={isMirrored}
            onToggleMirror={onToggleMirror}
            streamReady={streamReady}
            webcamError={webcamError}
            deviceLabel={deviceLabel}
            attachVideoRef={attachVideoRef}
            onRetryWebcam={onRetryWebcam}
            filterCss={getFilterCss(selectedFilter)}
            faceGuideStatus="ready"
            className="w-full"
          />

          {/* 1. Consolidated Camera Settings Bar (Clean Primary View + Collapsible Accordion) */}
          <div className="w-full max-w-[calc(76dvh*1.5)] mx-auto p-2.5 sm:p-3 rounded-2xl bg-white/85 backdrop-blur-md border-2 border-white/90 shadow-sweet-card flex flex-col gap-2 transition-all">
            {/* Primary Status & Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    cameraReady ? "bg-emerald-500 animate-ping" : "bg-rose-500 animate-pulse"
                  }`}
                />
                <span className="font-heading font-extrabold text-xs text-[#3F3D56] flex items-center gap-1.5">
                  <span className="truncate max-w-[210px] sm:max-w-none">{cameraSummaryText}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    1080p
                  </span>
                </span>

                {/* Pre-session System Readiness Status Trigger */}
                <button
                  type="button"
                  onClick={() => setReadinessModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-full bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-[11px] font-heading font-extrabold text-sweet-primaryStrong inline-flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span>● Sistem Siap</span>
                  <span className="text-[10px]">▾</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isUsingWebcam && onToggleMirror && (
                  <button
                    type="button"
                    onClick={onToggleMirror}
                    className="min-h-[32px] px-3 py-1 rounded-full bg-sweet-surface hover:bg-sweet-blush/80 border border-sweet-border text-xs font-heading font-bold text-sweet-text inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>🪞 Cermin:</span>
                    <span className={isMirrored ? "text-[#F472B6] font-extrabold" : "text-sweet-muted"}>
                      {isMirrored ? "Aktif" : "Mati"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCameraSettingsOpen((p) => !p)}
                  className="min-h-[32px] px-3 py-1 rounded-full bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-extrabold text-[#3F3D56] inline-flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <span>⚙ Opsi Kamera</span>
                  <span className="text-[10px] text-sweet-muted">
                    {cameraSettingsOpen ? "▲" : "▼"}
                  </span>
                </button>
              </div>
            </div>

            {/* Collapsible Technical Controls (For Operators & Advanced Users) */}
            {cameraSettingsOpen && (
              <div className="pt-2 border-t border-sweet-border/60 flex flex-col gap-2 animate-container-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-heading font-bold text-sweet-muted">
                    Sumber Kamera:
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeCameraSource("webcam")}
                    className={`min-h-[30px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all ${
                      cameraSource === "webcam"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-400 font-extrabold shadow-2xs"
                        : "bg-white/80 text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                    }`}
                  >
                    📷 Kamera Perangkat / USB Capture Card {cameraSource === "webcam" ? "✓" : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCameraSource("server")}
                    className={`min-h-[30px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all ${
                      cameraSource === "server"
                        ? "bg-purple-100 text-purple-900 border-purple-400 font-extrabold shadow-2xs"
                        : "bg-white/80 text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                    }`}
                  >
                    📡 Kamera Server ({cameraStatus?.driver === "wifi" ? "Wi-Fi Sony" : cameraStatus?.driver || "Canon EOS DSLR"}) {cameraSource === "server" ? "✓" : ""}
                  </button>
                </div>

                {cameraSource === "webcam" && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {devices && devices.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-heading font-bold text-sweet-muted">
                          Pilih Input:
                        </span>
                        {devices.map((dev, idx) => {
                          const isSelected =
                            selectedDeviceId === dev.deviceId || (!selectedDeviceId && idx === 0);
                          const isCap = isCaptureCardDevice(dev.label);
                          return (
                            <button
                              key={dev.deviceId || idx}
                              type="button"
                              onClick={() => onSelectDeviceId && onSelectDeviceId(dev.deviceId)}
                              className={`min-h-[30px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? isCap
                                    ? "bg-purple-100 text-purple-900 border-purple-400 shadow-2xs font-extrabold"
                                    : "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-2xs font-extrabold"
                                  : "bg-white/80 text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                              }`}
                            >
                              <span>{formatCameraLabel(dev, idx)}</span>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-sweet-muted font-heading font-semibold">
                        Input Video: <strong className="text-sweet-text">{deviceLabel}</strong>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={onRetryWebcam}
                      className="min-h-[30px] px-3 py-1 rounded-full bg-sweet-blush/80 hover:bg-sweet-primary text-[11px] font-heading font-bold text-sweet-text border border-sweet-primaryStrong/40 shadow-2xs"
                    >
                      🔄 Hubungkan Ulang Kamera
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Live Camera Filter Bar */}
          <div className="w-full max-w-[calc(76dvh*1.5)] mx-auto p-2.5 sm:p-3 rounded-2xl bg-white/85 backdrop-blur-md border-2 border-white/90 shadow-sweet-card flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-heading font-extrabold text-xs text-[#3F3D56] flex items-center gap-1.5">
                <SparkleIcon className="size-3.5 text-[#F472B6]" />
                <span>Live Filter Kamera</span>
              </span>
              <span className="text-[11px] font-heading font-extrabold text-[#F472B6]">
                {PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.name || "Natural ✨"}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Pilih filter kamera live"
              className="flex items-center gap-1.5 overflow-x-auto kiosk-scroll pb-0.5 pr-1"
            >
              {PHOTO_FILTERS.map((flt) => {
                const isSelected = selectedFilter === flt.id;
                return (
                  <button
                    key={flt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectFilter && onSelectFilter(flt.id)}
                    className={`min-h-[34px] px-3 py-1 rounded-full border-2 font-heading font-extrabold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#F472B6] text-[#3F3D56] shadow-sweet scale-[1.02] ring-1 ring-[#FBCFE8]"
                        : "bg-white/85 hover:bg-white border-white/90 text-sweet-muted hover:text-sweet-text"
                    }`}
                  >
                    <span>{flt.name}</span>
                    {isSelected && <span className="text-[11px] text-[#F472B6]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Frame Selection, Swatches, Timer & Action CTA (~40%) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5 animate-container-right">
          <Card variant="glass" padding="sm" className="space-y-2.5 shadow-sweet-card">
            {/* 1. Pilih Desain Frame (Compact Scroll Area - Fits 100vh) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                  <FlowerIcon className="size-3.5 text-sweet-primaryStrong" />
                  <span>1. Pilih Desain Frame</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FBCFE8] text-[11px] font-heading font-extrabold text-[#3F3D56] shadow-xs">
                  {selectedTemplate.photos_required} Slot Cetak • {selectedTemplate.aspect_label || "2x6 Strip"}
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label="Pilih template frame"
                className="grid grid-cols-2 gap-2 max-h-[145px] sm:max-h-[160px] overflow-y-auto kiosk-scroll pr-1"
              >
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectTemplate(tpl)}
                      className={`min-h-[105px] p-2 rounded-xl border-2 text-left transition-all duration-200 flex flex-col items-center justify-between gap-1 ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.01]"
                          : "bg-white/85 hover:bg-[#FFF0F5]/50 border-white/90"
                      }`}
                    >
                      <div className="h-[64px] w-full flex items-center justify-center overflow-hidden py-0.5 pointer-events-none">
                        <LayoutMock
                          template={tpl}
                          frameColorId={selectedFrameColor}
                          frameThemes={frameThemes}
                          className="h-[64px] w-auto drop-shadow-xs"
                        />
                      </div>
                      <div className="w-full">
                        <div className="font-heading font-extrabold text-[11px] text-sweet-text truncate flex items-center justify-between">
                          <span className="truncate">{tpl.name}</span>
                          {isSelected && (
                            <span className="text-[#F472B6] text-[11px] font-bold shrink-0">✓</span>
                          )}
                        </div>
                        <div className="text-[10px] font-heading font-semibold text-sweet-muted flex items-center justify-between">
                          <span>{tpl.photos_required} Slot Foto</span>
                          <span className="capitalize">{tpl.aspect_label || tpl.category || "strip"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Pilihan Warna Frame (Compact Circular Swatches - 1 Single Row, No Cutoff) */}
            {frameThemes && frameThemes.length > 0 && (
              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-heading font-extrabold text-xs text-sweet-text flex items-center gap-1.5">
                    <HeartIcon className="size-3.5 text-sweet-primaryStrong" />
                    <span>2. Warna Frame:</span>
                  </label>
                  <span className="text-[11px] font-heading font-extrabold text-[#F472B6]">
                    {frameThemes.find((t) => t.id === selectedFrameColor)?.name || "Sweet Pink"}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Pilih warna frame awal"
                  className="flex flex-wrap gap-1.5 pt-0.5"
                >
                  {frameThemes.map((theme) => {
                    const isSelected = selectedFrameColor === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        title={theme.name}
                        onClick={() => onSelectFrameColor(theme.id)}
                        className={`size-7 sm:size-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "scale-110 border-[#F472B6] ring-2 ring-[#FBCFE8] shadow-xs"
                            : "border-black/15 hover:scale-105"
                        }`}
                        style={{ backgroundColor: theme.hex || "#FFF" }}
                      >
                        {isSelected && (
                          <CheckIcon
                            className={`size-3 stroke-[3] ${
                              theme.id === "black" ? "text-white" : "text-[#493B3B]"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Timer Hitung Mundur Selection (1s, 3s, 5s) - Compact Row */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <label className="font-heading font-extrabold text-xs text-sweet-text flex items-center gap-1.5">
                  <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
                  <span>3. Timer Hitung Mundur:</span>
                </label>
                <span className="px-2 py-0.5 rounded-full bg-[#DCD6F7] text-[11px] font-heading font-extrabold text-[#3F3D56]">
                  {selectedCountdownSeconds} Detik
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Pilih durasi hitung mundur per foto"
                className="grid grid-cols-3 gap-1.5"
              >
                {[
                  { sec: 1, label: "1 Detik", desc: "Cepat ⚡" },
                  { sec: 3, label: "3 Detik", desc: "Standar ✨" },
                  { sec: 5, label: "5 Detik", desc: "Santai ♡" },
                ].map((item) => {
                  const isSelected = selectedCountdownSeconds === item.sec;
                  return (
                    <button
                      key={item.sec}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectCountdownSeconds(item.sec)}
                      className={`min-h-[36px] py-1 px-2 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#F472B6] shadow-xs ring-1 ring-[#FBCFE8] scale-[1.01]"
                          : "bg-white/80 hover:bg-[#FFF0F5]/50 border-white/90"
                      }`}
                    >
                      <span className="font-heading font-extrabold text-xs text-sweet-text block">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Optional Custom Name / Caption + Compact 1-Line Footer Preview */}
            <div className="pt-0.5 space-y-1.5">
              <label
                htmlFor="customer-caption-input"
                className="block font-heading font-extrabold text-xs text-sweet-text"
              >
                Nama / Catatan di Frame (Opsional):
              </label>
              <input
                id="customer-caption-input"
                type="text"
                maxLength={24}
                autoComplete="nickname"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Rina & Besties ♡"
                className="w-full min-h-[36px] px-3 py-1 rounded-xl bg-white/90 border border-white/90 text-sweet-text placeholder:text-sweet-muted/60 text-xs font-heading font-semibold focus:border-[#F472B6] shadow-xs outline-none transition-colors"
              />

              {/* Compact 1-Line Photostrip Footer Name Preview */}
              <div className="px-3 py-1 rounded-xl bg-white/90 border border-[#FBCFE8] flex items-center justify-between text-[11px] shadow-2xs">
                <span className="text-sweet-muted font-heading font-semibold">Tampilan di frame:</span>
                <span className="font-heading font-extrabold text-sweet-text tracking-wider truncate max-w-[200px]">
                  ✦ {(customerName.trim() || "SWEET STUDIO").toUpperCase()} ✦
                </span>
              </div>
            </div>
          </Card>

          {/* Big High-Impact CTA Button - 100% Above the Fold & Always Visible */}
          <div className="space-y-1 pt-0.5">
            <Button
              variant="strong"
              size="xl"
              loading={isBusy || isStarting}
              disabled={!cameraReady || isBusy || isStarting}
              onClick={handleStartWithPreflight}
              rightIcon={<FlowerIcon className="size-5 text-white" />}
              className="w-full min-h-[58px] sm:min-h-[62px] text-lg sm:text-xl font-heading font-extrabold shadow-sweetLg animate-pulse-cta"
            >
              MULAI FOTO SEKARANG! ♡
            </Button>
            <p className="text-[11px] font-heading font-semibold text-sweet-muted text-center">
              Ambil 6 pose seru • Pilih {selectedTemplate.photos_required} foto terbaik untuk frame ✨
            </p>
          </div>
        </div>
      </div>

      {/* Pre-session System Readiness Modal (Separates iPad Viewport vs Server Camera Status) */}
      {readinessModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="readiness-modal-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-screen-fade"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sweetLg border-2 border-[#FBCFE8] space-y-4 animate-sticker-pop">
            <div className="flex items-center justify-between border-b border-sweet-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 id="readiness-modal-title" className="font-heading font-extrabold text-base text-sweet-text">
                  Status Kesiapan Sistem Booth
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReadinessModalOpen(false)}
                className="size-7 rounded-full bg-sweet-surface text-sweet-muted hover:text-sweet-text flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-heading font-semibold text-sweet-text">
              <div className="p-3 rounded-2xl bg-sweet-surface border border-sweet-border flex items-center justify-between">
                <div>
                  <strong className="block text-sweet-text font-bold">1. Live View Kiosk iPad (UVC)</strong>
                  <span className="text-[11px] text-sweet-muted">
                    {streamReady ? `Aktif (${deviceLabel})` : "Menyiapkan Kamera iPad..."}
                  </span>
                </div>
                <span className={streamReady ? "text-emerald-600 font-extrabold text-sm" : "text-rose-500 font-extrabold text-sm"}>
                  {streamReady ? "Ready ✓" : "Offline ✗"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sweet-surface border border-sweet-border flex items-center justify-between">
                <div>
                  <strong className="block text-sweet-text font-bold">2. Kamera Server (Mini PC / Backend)</strong>
                  <span className="text-[11px] text-sweet-muted">
                    {cameraStatus?.connected
                      ? `Driver: ${cameraStatus.driver} (${cameraStatus.model || "Canon EOS 700D / Sony Alpha"})`
                      : "Server Camera Terputus"}
                  </span>
                </div>
                <span className={cameraStatus?.connected ? "text-emerald-600 font-extrabold text-sm" : "text-amber-500 font-extrabold text-sm"}>
                  {cameraStatus?.connected ? "Ready ✓" : "Offline (Gunakan UVC)"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sweet-surface border border-sweet-border flex items-center justify-between">
                <div>
                  <strong className="block text-sweet-text font-bold">3. Konfigurasi Frame Cetak</strong>
                  <span className="text-[11px] text-sweet-muted">
                    {selectedTemplate.name} • {selectedTemplate.photos_required} Slot Foto
                  </span>
                </div>
                <span className="text-emerald-600 font-extrabold text-sm">
                  Ready ✓
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sweet-surface border border-sweet-border flex items-center justify-between">
                <div>
                  <strong className="block text-sweet-text font-bold">4. Penyimpanan Foto & Galeri</strong>
                  <span className="text-[11px] text-sweet-muted">
                    Storage capture & processed lokal aktif
                  </span>
                </div>
                <span className="text-emerald-600 font-extrabold text-sm">
                  Ready ✓
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sweet-surface border border-sweet-border flex items-center justify-between">
                <div>
                  <strong className="block text-sweet-text font-bold">5. Printer Photobooth</strong>
                  <span className="text-[11px] text-sweet-muted">
                    {printerStatus?.ready
                      ? `${printerStatus.printer_name} (Siap)`
                      : "Siap (Simulasi / Digital QR)"}
                  </span>
                </div>
                <span className="text-emerald-600 font-extrabold text-sm">
                  Ready ✓
                </span>
              </div>
            </div>

            <Button
              variant="strong"
              size="md"
              onClick={() => setReadinessModalOpen(false)}
              className="w-full min-h-[46px] text-sm font-extrabold"
            >
              MENGERTI & TUTUP ♡
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
