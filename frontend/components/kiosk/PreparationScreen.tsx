"use client";

import React, { useState } from "react";
import {
  CameraStatus,
  FrameThemeOption,
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
import {
  ArrowLeftIcon,
  FlowerIcon,
  HeartIcon,
  SparkleIcon,
} from "@/components/icons";

interface PreparationScreenProps {
  cameraStatus: CameraStatus | null;
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
  const cameraReady =
    cameraSource === "webcam" ? true : (cameraStatus?.connected ?? true);

  const { secondsLeft } = useIdleCountdown({
    enabled: !isBusy,
    totalSeconds: PREPARATION_IDLE_SECONDS,
    onExpire: onBack,
  });

  // Group available pose counts (e.g., 4 photos, 3 photos, 2 photos, 1 photo)
  const posePackages = [
    {
      poses: 4,
      label: "4 Foto • Korean Strip",
      desc: "4 pose seru + pilih desain frame",
    },
    {
      poses: 3,
      label: "3 Foto • Classic Trio",
      desc: "3 pose manis + cetak cepat",
    },
    {
      poses: 2,
      label: "2 Foto • Bestie Duo",
      desc: "2 pose besar bergaya duo",
    },
    {
      poses: 1,
      label: "1 Foto • Polaroid",
      desc: "1 foto potret / widescreen",
    },
  ];

  const handleSelectPoseCount = (poses: number) => {
    if (selectedTemplate.photos_required === poses) return;
    const match = templates.find((t) => t.photos_required === poses);
    if (match) {
      onSelectTemplate(match);
    }
  };

  return (
    <section
      aria-labelledby="prep-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-6 py-4 md:py-5 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto">
        <Button
          variant="surface"
          size="md"
          leftIcon={<ArrowLeftIcon className="size-4" />}
          onClick={onBack}
          disabled={isBusy}
        >
          Back
        </Button>

        <div className="text-center">
          <h1
            id="prep-heading"
            className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center justify-center gap-2"
          >
            <span>READY, CUTIES?</span>
            <HeartIcon className="size-6 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs md:text-sm text-sweet-muted">
            Stand here and look at the camera • Bersiap di depan kamera
          </p>
        </div>

        <StatusBadge tone="neutral"> Reset {secondsLeft}d </StatusBadge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center max-w-7xl w-full mx-auto my-auto">
        {/* Left: Camera Preview Stage & Live Camera Filter Bar */}
        <div className="lg:col-span-7 flex flex-col items-center gap-3 animate-container-left">
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
            className="w-full"
          />

          {/* Live Camera Controls: Filter & Video Input */}
          <div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-3xl bg-white/85 backdrop-blur-md border-2 border-white/90 shadow-sweet-card w-full max-w-[calc(76dvh*1.5)] mx-auto animate-container-card">
            {/* Live Camera Filter Picker */}
            <div className="flex items-center justify-between px-1">
              <span className="font-heading font-extrabold text-xs text-[#3F3D56] flex items-center gap-1.5">
                <SparkleIcon className="size-3.5 text-[#F472B6]" />
                <span>Filter Kamera (Live Preview)</span>
              </span>
              <span className="text-[11px] font-heading font-extrabold text-[#F472B6]">
                {PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.name || "Natural ✨"}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Pilih filter kamera live"
              className="flex items-center gap-2 overflow-x-auto kiosk-scroll pb-1 pr-1"
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
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-full border-2 font-heading font-extrabold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#F472B6] text-[#3F3D56] shadow-xs scale-[1.03] ring-1 ring-[#FBCFE8]"
                        : "bg-white/85 hover:bg-white border-white/90 text-sweet-muted hover:text-sweet-text"
                    }`}
                  >
                    <span>{flt.name}</span>
                    {isSelected && <span className="text-[11px] text-[#F472B6]">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Sumber Kamera & Input Video Device Selector (Always accessible in preparation screen) */}
            <div className="pt-2 border-t border-sweet-border/60 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-heading font-bold text-sweet-muted">
                    Sumber Kamera:
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeCameraSource("webcam")}
                    className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all ${
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
                    className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all ${
                      cameraSource === "server"
                        ? "bg-purple-100 text-purple-900 border-purple-400 font-extrabold shadow-2xs"
                        : "bg-white/80 text-sweet-muted border-sweet-border hover:bg-sweet-blush/40"
                    }`}
                  >
                    📡 Kamera Server ({cameraStatus?.driver === "wifi" ? "Wi-Fi Sony" : cameraStatus?.driver || "Backend"}) {cameraSource === "server" ? "✓" : ""}
                  </button>
                </div>

                {/* Mirror Toggle Button */}
                {cameraSource === "webcam" && onToggleMirror && (
                  <button
                    type="button"
                    onClick={onToggleMirror}
                    className="min-h-[32px] px-3.5 py-1 rounded-full bg-white/90 hover:bg-sweet-blush/60 border border-sweet-border text-[11px] font-heading font-bold text-sweet-text inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>🪞 Cermin (Mirror):</span>
                    <span className={isMirrored ? "text-[#F472B6] font-extrabold" : "text-sweet-muted"}>
                      {isMirrored ? "Aktif" : "Mati"}
                    </span>
                  </button>
                )}
              </div>

              {cameraSource === "webcam" && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {devices && devices.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-heading font-bold text-sweet-muted">
                        Pilih Perangkat:
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
                            className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-heading font-bold border transition-all flex items-center gap-1.5 ${
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
                    <span className="text-xs text-sweet-muted font-heading font-semibold flex items-center gap-1.5">
                      <span>Input Video:</span>
                      <strong className="text-sweet-text">{deviceLabel}</strong>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={onRetryWebcam}
                    className="min-h-[30px] px-3 py-1 rounded-full bg-sweet-blush/70 hover:bg-sweet-primary text-[11px] font-heading font-bold text-sweet-text border border-sweet-primaryStrong/30"
                  >
                    🔄 Muat Ulang Kamera
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Session Info, Pose Package & Caption Input */}
        <div className="lg:col-span-5 space-y-4 animate-container-right">
          <Card variant="glass" padding="md" className="space-y-4">
            {/* Pilihan Desain Frame / Template dengan Visual Miniature Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-2">
                  <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                  <span>Pilih Desain Frame</span>
                </h2>
                <span className="px-3 py-1 rounded-full bg-[#FBCFE8] text-xs font-heading font-extrabold text-[#3F3D56] shadow-xs">
                  {selectedTemplate.photos_required} Slot Foto
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label="Pilih template frame"
                className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto kiosk-scroll pr-1"
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
                      className={`p-2 rounded-2xl border-3 text-left transition-all duration-200 flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.02]"
                          : "bg-white/85 hover:bg-[#FFF0F5]/50 border-white/90"
                      }`}
                    >
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden py-0.5 pointer-events-none">
                        <LayoutMock
                          template={tpl}
                          frameColorId={selectedFrameColor}
                          frameThemes={frameThemes}
                          className="h-20 w-auto drop-shadow-xs"
                        />
                      </div>
                      <div className="w-full">
                        <div className="font-heading font-extrabold text-xs text-sweet-text truncate flex items-center justify-between">
                          <span className="truncate">{tpl.name}</span>
                          {isSelected && (
                            <span className="text-[#F472B6] text-xs font-bold shrink-0">✓</span>
                          )}
                        </div>
                        <div className="text-[10px] font-heading font-semibold text-sweet-muted mt-0.5 flex items-center justify-between">
                          <span>{tpl.photos_required} Foto</span>
                          <span className="capitalize">{tpl.category || "strip"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Warna Frame Awal */}
            {frameThemes && frameThemes.length > 0 && (
              <div className="pt-1">
                <label className="block font-heading font-extrabold text-xs text-sweet-text mb-1.5">
                  Warna Frame Awal:
                </label>
                <div
                  role="radiogroup"
                  aria-label="Pilih warna frame awal"
                  className="flex items-center gap-2 overflow-x-auto kiosk-scroll pb-1"
                >
                  {frameThemes.map((theme) => {
                    const isSelected = selectedFrameColor === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onSelectFrameColor(theme.id)}
                        className={`px-3 py-1.5 rounded-full border-3 text-xs font-heading font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
                          isSelected
                            ? "bg-white border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] text-sweet-text scale-[1.02]"
                            : "bg-white/75 border-white/80 text-sweet-muted hover:bg-white"
                        }`}
                      >
                        <span
                          className="size-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.hex || "#FFF" }}
                        />
                        <span>{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timer Hitung Mundur Selection (1s, 3s, 5s) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-heading font-extrabold text-xs text-sweet-text flex items-center gap-1.5">
                  <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
                  <span>Timer Hitung Mundur</span>
                </label>
                <span className="px-3 py-1 rounded-full bg-[#DCD6F7] text-xs font-heading font-extrabold text-[#3F3D56] shadow-xs">
                  {selectedCountdownSeconds} Detik
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Pilih durasi hitung mundur per foto"
                className="grid grid-cols-3 gap-2"
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
                      className={`min-h-[50px] p-2 rounded-2xl border-3 text-center transition-all duration-200 ${
                        isSelected
                          ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.02]"
                          : "bg-white/80 hover:bg-[#FFF0F5]/50 border-white/90"
                      }`}
                    >
                      <div className="font-heading font-extrabold text-xs text-sweet-text">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-sweet-muted font-heading font-semibold mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Name / Caption */}
            <div className="pt-1">
              <label
                htmlFor="customer-caption-input"
                className="block font-heading font-extrabold text-xs text-sweet-text mb-1"
              >
                Nama / Catatan di Frame (Opsional)
              </label>
              <input
                id="customer-caption-input"
                type="text"
                maxLength={24}
                autoComplete="nickname"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Rina & Besties ♡"
                className="w-full min-h-[46px] px-4 py-2 rounded-2xl bg-white/80 border-2 border-white/90 text-sweet-text placeholder:text-sweet-muted/60 text-xs font-heading font-semibold focus:border-[#F472B6] focus:bg-white shadow-xs outline-none transition-colors"
              />
            </div>

            {/* Brief Instructions */}
            <ol className="text-xs text-sweet-muted space-y-1 bg-white/60 p-3 rounded-2xl border border-white/80 list-decimal list-inside font-heading font-medium">
              <li>
                Kamera akan mengambil <strong className="text-sweet-text font-extrabold">6 foto</strong> dengan timer {selectedCountdownSeconds}d.
              </li>
              <li>
                Kamu bebas memilih <strong className="text-sweet-text font-extrabold">{selectedTemplate.photos_required} foto terbaik</strong> untuk frame ini.
              </li>
              <li>
                Setelah foto selesai, kamu tetap bisa mengganti desain frame & warna! ♡
              </li>
            </ol>
          </Card>

          <Button
            variant="strong"
            size="xl"
            loading={isBusy}
            disabled={!cameraReady || isBusy}
            onClick={() => onStartCapture(customerName.trim() || undefined)}
            rightIcon={<FlowerIcon className="size-6 text-white" />}
            className="w-full min-h-[70px] text-xl font-extrabold shadow-sweetLg animate-pulse-cta"
          >
            I&apos;M READY!
          </Button>
        </div>
      </div>
    </section>
  );
}
