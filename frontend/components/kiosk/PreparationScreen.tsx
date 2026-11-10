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
import { Modal } from "@/components/ui/Modal";
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
            Stand here and look at the camera • Sesi 6 Pose • Pilih {selectedTemplate.photos_required} Foto Terbaik untuk Frame
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
          <div className="w-full max-w-[calc(76dvh*1.5)] mx-auto p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-[#F3E6EE] shadow-sweet-card flex flex-col gap-2 transition-all">
            {/* Primary Status & Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    cameraReady ? "bg-[#54866A]" : "bg-[#B84C58]"
                  }`}
                />
                <span className="font-heading font-extrabold text-xs text-[#3F3D56] flex items-center gap-1.5">
                  <span className="truncate max-w-[210px] sm:max-w-none">{cameraSummaryText}</span>
                  <span className="text-[10px] text-[#54866A] bg-[#E0F5E9] px-2 py-0.5 rounded-md font-bold">
                    1080p
                  </span>
                </span>

                {/* Pre-session System Readiness Status Trigger */}
                <button
                  type="button"
                  onClick={() => setReadinessModalOpen(true)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-extrabold text-sweet-primaryStrong inline-flex items-center gap-1.5 transition-colors"
                >
                  <span className="size-2 rounded-full bg-[#54866A]" aria-hidden="true" />
                  <span>Sistem Siap</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isUsingWebcam && onToggleMirror && (
                  <button
                    type="button"
                    onClick={onToggleMirror}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-sweet-surface hover:bg-sweet-blush/80 border border-sweet-border text-xs font-heading font-bold text-sweet-text inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Cermin:</span>
                    <span className={isMirrored ? "text-[#F472B6] font-extrabold" : "text-sweet-muted"}>
                      {isMirrored ? "Aktif" : "Mati"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  aria-expanded={cameraSettingsOpen}
                  onClick={() => setCameraSettingsOpen((p) => !p)}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-extrabold text-[#3F3D56] inline-flex items-center gap-1.5 transition-all"
                >
                  <span>Opsi Kamera</span>
                  <span className="text-[10px] text-sweet-muted">
                    {cameraSettingsOpen ? "Tutup" : "Buka"}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Warning / Recovery Banner if Server Camera Disconnected */}
            {!isUsingWebcam && !cameraStatus?.connected && (
              <div className="p-2.5 rounded-xl bg-[#FCECEE] border border-[#EABAC0] text-[#3F3D56] text-xs flex flex-wrap items-center justify-between gap-2 animate-screen-fade">
                <span className="flex-1">Kamera server terputus. Jika menggunakan webcam USB atau kamera laptop, beralihlah ke Kamera Perangkat.</span>
                <button
                  type="button"
                  onClick={() => onChangeCameraSource("webcam")}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#F472B6] hover:bg-[#EC4899] text-white font-heading font-extrabold text-xs transition-colors"
                >
                  Gunakan Kamera Perangkat
                </button>
              </div>
            )}

            {/* Quick Warning if Webcam Access Denied / Failed */}
            {isUsingWebcam && webcamError && (
              <div className="p-2.5 rounded-xl bg-[#FCECEE] border border-[#EABAC0] text-[#3F3D56] text-xs flex flex-wrap items-center justify-between gap-2 animate-screen-fade">
                <span className="flex-1">{webcamError}</span>
                {onRetryWebcam && (
                  <button
                    type="button"
                    onClick={onRetryWebcam}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#B84C58] hover:bg-[#9F3E49] text-white font-heading font-extrabold text-xs transition-colors"
                  >
                    Coba Hubungkan Ulang
                  </button>
                )}
              </div>
            )}

            {/* Collapsible Technical Controls (For Operators & Advanced Users) */}
            {cameraSettingsOpen && (
              <div className="pt-2 border-t border-sweet-border/60 flex flex-col gap-2 animate-container-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-heading font-bold text-sweet-muted">
                    Sumber Kamera:
                  </span>
                  <button
                    type="button"
                    aria-pressed={cameraSource === "webcam"}
                    onClick={() => onChangeCameraSource("webcam")}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-all inline-flex items-center gap-1.5 ${
                      cameraSource === "webcam"
                        ? "bg-[#E0F5E9] text-[#1E5037] border-[#54866A] font-extrabold"
                        : "bg-white text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                    }`}
                  >
                    <span>Kamera Perangkat / USB Capture Card</span>
                    {cameraSource === "webcam" && <CheckIcon className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-pressed={cameraSource === "server"}
                    onClick={() => onChangeCameraSource("server")}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-all inline-flex items-center gap-1.5 ${
                      cameraSource === "server"
                        ? "bg-[#F3E8FF] text-[#3F3D56] border-[#9E8CE0] font-extrabold"
                        : "bg-white text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                    }`}
                  >
                    <span>Kamera Server ({cameraStatus?.driver === "wifi" ? "Wi-Fi Sony" : cameraStatus?.driver || "Canon EOS DSLR"})</span>
                    {cameraSource === "server" && <CheckIcon className="size-3.5" />}
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
                              aria-pressed={isSelected}
                              onClick={() => onSelectDeviceId && onSelectDeviceId(dev.deviceId)}
                              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? isCap
                                    ? "bg-[#F3E8FF] text-[#3F3D56] border-[#9E8CE0] font-extrabold"
                                    : "bg-sweet-primary text-sweet-text border-sweet-primaryStrong font-extrabold"
                                  : "bg-white text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                              }`}
                            >
                              <span>{formatCameraLabel(dev, idx)}</span>
                              {isSelected && <CheckIcon className="size-3.5" />}
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
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-sweet-blush hover:bg-sweet-primary text-xs font-heading font-bold text-sweet-text border border-sweet-primaryStrong/40"
                    >
                      Hubungkan Ulang Kamera
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Live Camera Filter Bar (Zero-Scroll 5x2 Grid - All 10 Filters Visible) */}
          <div className="w-full max-w-[calc(76dvh*1.5)] mx-auto p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-[#F3E6EE] shadow-sweet-card flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-heading font-extrabold text-xs text-[#3F3D56] flex items-center gap-1.5">
                <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
                <span>Live Filter Kamera (10 Efek)</span>
              </span>
              <span className="text-[11px] font-heading font-extrabold text-sweet-primaryStrong">
                Aktif: {PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.name || "Natural"}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Pilih filter kamera live"
              className="grid grid-cols-2 sm:grid-cols-5 gap-1.5"
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
                    className={`min-h-[44px] px-2.5 py-1 rounded-xl border-2 font-heading font-extrabold text-[11px] transition-all flex items-center justify-between gap-1 active:scale-95 ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#DB2777] text-[#3F3D56] shadow-xs"
                        : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-muted hover:text-sweet-text"
                    }`}
                  >
                    <span className="truncate">{flt.name}</span>
                    {isSelected && <CheckIcon className="size-3 text-sweet-primaryStrong shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Frame Selection, Swatches, Timer & Action CTA (~40%) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5 animate-container-right">
          <Card variant="glass" padding="sm" className="space-y-2.5 shadow-sweet-card">
            {/* 1. Pilih Desain Frame (Horizontal Card Grid - 2 Rows Fit 100% Without Clipping) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                  <FlowerIcon className="size-3.5 text-sweet-primaryStrong" />
                  <span>1. Pilih Desain Frame</span>
                </h2>
                <span
                  key={`${selectedTemplate.id}-${selectedFrameColor}`}
                  className="px-2.5 py-0.5 rounded-full bg-[#FBCFE8] text-[11px] font-heading font-extrabold text-[#3F3D56] shadow-xs animate-spring-swap"
                >
                  {selectedTemplate.photos_required} Slot Cetak • {selectedTemplate.aspect_label || "2x6 Strip"}
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label="Pilih template frame"
                className="grid grid-cols-2 gap-2 max-h-[156px] overflow-y-auto kiosk-scroll pr-1"
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
                      className={`min-h-[72px] p-2 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-2.5 active:scale-95 ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#DB2777] shadow-sweet ring-2 ring-[#FBCFE8]"
                          : "bg-white/90 hover:bg-[#FFF5F7] border-white/95"
                      }`}
                    >
                      <div className="h-[54px] w-[42px] shrink-0 flex items-center justify-center rounded-lg bg-[#FFF5F7] border border-[#F3E6EE] overflow-hidden py-0.5 pointer-events-none">
                        <LayoutMock
                          template={tpl}
                          frameColorId={selectedFrameColor}
                          frameThemes={frameThemes}
                          className="h-[48px] w-auto drop-shadow-xs"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-heading font-extrabold text-[11px] text-sweet-text flex items-center justify-between gap-1">
                          <span className="truncate">{tpl.name}</span>
                          {isSelected && (
                            <CheckIcon className="size-3.5 text-sweet-primaryStrong shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] font-heading font-semibold text-sweet-muted mt-0.5">
                          <span className="block">{tpl.photos_required} Slot Foto</span>
                          <span className="text-sweet-primaryStrong font-bold capitalize">
                            {tpl.aspect_label || tpl.category || "2x6 Strip"}
                          </span>
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
                        aria-label={`Warna frame ${theme.name}`}
                        title={theme.name}
                        onClick={() => onSelectFrameColor(theme.id)}
                        className={`size-11 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "scale-105 border-[#F472B6] ring-2 ring-[#FBCFE8]"
                            : "border-black/15 hover:scale-105"
                        }`}
                        style={{ backgroundColor: theme.hex || "#FFF" }}
                      >
                        {isSelected && (
                          <CheckIcon
                            className={`size-4 stroke-[3] ${
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
                  { sec: 1, label: "1 Detik", desc: "Cepat" },
                  { sec: 3, label: "3 Detik", desc: "Standar" },
                  { sec: 5, label: "5 Detik", desc: "Santai" },
                ].map((item) => {
                  const isSelected = selectedCountdownSeconds === item.sec;
                  return (
                    <button
                      key={item.sec}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectCountdownSeconds(item.sec)}
                      className={`min-h-[44px] py-1.5 px-2 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#F472B6] ring-1 ring-[#FBCFE8]"
                          : "bg-white hover:bg-[#FFF0F5]/50 border-[#F3E6EE]"
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
                placeholder="Contoh: Rina & Besties"
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl bg-white border border-[#F3E6EE] text-sweet-text placeholder:text-sweet-muted/60 text-xs font-heading font-semibold focus:border-[#F472B6] transition-colors"
              />

              {/* Compact 1-Line Photostrip Footer Name Preview */}
              <div className="px-3 py-1.5 rounded-xl bg-white border border-[#FBCFE8] flex items-center justify-between text-[11px]">
                <span className="text-sweet-muted font-heading font-semibold">Tampilan di frame:</span>
                <span className="font-heading font-extrabold text-sweet-text tracking-wider truncate max-w-[200px]">
                  {(customerName.trim() || "SWEET STUDIO").toUpperCase()}
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
              className="w-full min-h-[58px] sm:min-h-[62px] text-lg sm:text-xl font-heading font-extrabold animate-pulse-cta"
            >
              MULAI FOTO SEKARANG
            </Button>
            <p className="text-[11px] font-heading font-semibold text-sweet-muted text-center">
              Ambil 6 pose seru • Pilih {selectedTemplate.photos_required} foto terbaik untuk frame
            </p>
          </div>
        </div>
      </div>

      {/* Pre-session System Readiness Modal (Native <dialog> via Modal component for Escape key & focus trap per R-32) */}
      <Modal
        isOpen={readinessModalOpen}
        onClose={() => setReadinessModalOpen(false)}
        title="Status Kesiapan Sistem Booth"
        subtitle="Pemeriksaan perangkat kamera, konfigurasi frame, penyimpanan, dan printer."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2.5 text-xs font-heading font-semibold text-sweet-text">
            <div className="p-3 rounded-2xl bg-sweet-bg border border-sweet-border flex items-center justify-between">
              <div>
                <strong className="block text-sweet-text font-bold">1. Live View Kiosk iPad (UVC)</strong>
                <span className="text-[11px] text-sweet-muted">
                  {streamReady ? `Aktif (${deviceLabel})` : "Menyiapkan Kamera iPad..."}
                </span>
              </div>
              <StatusBadge tone={streamReady ? "success" : "error"}>
                {streamReady ? "Ready" : "Offline"}
              </StatusBadge>
            </div>

            <div className="p-3 rounded-2xl bg-sweet-bg border border-sweet-border flex items-center justify-between">
              <div>
                <strong className="block text-sweet-text font-bold">2. Kamera Server (Mini PC / Backend)</strong>
                <span className="text-[11px] text-sweet-muted">
                  {cameraStatus?.connected
                    ? `Driver: ${cameraStatus.driver} (${cameraStatus.model || "Canon EOS 700D / Sony Alpha"})`
                    : "Server Camera Terputus"}
                </span>
              </div>
              <StatusBadge tone={cameraStatus?.connected ? "success" : "neutral"}>
                {cameraStatus?.connected ? "Ready" : "Gunakan UVC"}
              </StatusBadge>
            </div>

            <div className="p-3 rounded-2xl bg-sweet-bg border border-sweet-border flex items-center justify-between">
              <div>
                <strong className="block text-sweet-text font-bold">3. Konfigurasi Frame Cetak</strong>
                <span className="text-[11px] text-sweet-muted">
                  {selectedTemplate.name} • {selectedTemplate.photos_required} Slot Foto
                </span>
              </div>
              <StatusBadge tone="success">Ready</StatusBadge>
            </div>

            <div className="p-3 rounded-2xl bg-sweet-bg border border-sweet-border flex items-center justify-between">
              <div>
                <strong className="block text-sweet-text font-bold">4. Penyimpanan Foto & Galeri</strong>
                <span className="text-[11px] text-sweet-muted">
                  Storage capture & processed lokal aktif
                </span>
              </div>
              <StatusBadge tone="success">Ready</StatusBadge>
            </div>

            <div className="p-3 rounded-2xl bg-sweet-bg border border-sweet-border flex items-center justify-between">
              <div>
                <strong className="block text-sweet-text font-bold">5. Printer Photobooth</strong>
                <span className="text-[11px] text-sweet-muted">
                  {printerStatus?.ready
                    ? `${printerStatus.printer_name} (Siap)`
                    : "Siap (Simulasi / Digital QR)"}
                </span>
              </div>
              <StatusBadge tone="success">Ready</StatusBadge>
            </div>
          </div>

          <Button
            variant="strong"
            size="md"
            onClick={() => setReadinessModalOpen(false)}
            className="w-full min-h-[48px] text-sm font-extrabold"
          >
            MENGERTI & TUTUP
          </Button>
        </div>
      </Modal>
    </section>
  );
}
