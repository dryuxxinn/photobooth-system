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
import { CameraSourceMode, WebcamFacingMode } from "@/hooks/useWebcam";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  cameraSource: CameraSourceMode;
  onChangeCameraSource: (source: CameraSourceMode) => void;
  facingMode: WebcamFacingMode;
  onToggleFacingMode: () => void;
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
  selectedTemplate,
  onSelectTemplate,
  selectedCountdownSeconds,
  onSelectCountdownSeconds,
  cameraSource,
  onChangeCameraSource,
  facingMode,
  onToggleFacingMode,
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
      <div className="flex items-center justify-between gap-4 max-w-5xl w-full mx-auto">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center max-w-5xl w-full mx-auto my-3">
        {/* Left: Camera Preview Stage */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <CameraPreview
            cameraStatus={cameraStatus}
            photosRequired={selectedTemplate.photos_required}
            photosTaken={0}
            mode="preparation"
            cameraSource={cameraSource}
            onChangeCameraSource={onChangeCameraSource}
            facingMode={facingMode}
            onToggleFacingMode={onToggleFacingMode}
            streamReady={streamReady}
            webcamError={webcamError}
            deviceLabel={deviceLabel}
            attachVideoRef={attachVideoRef}
            onRetryWebcam={onRetryWebcam}
          />
        </div>

        {/* Right: Session Info, Pose Package & Caption Input */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="surface" padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg text-sweet-text flex items-center gap-2">
                <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                <span>Paket & Jumlah Pose</span>
              </h2>
              <StatusBadge tone="pink">
                {selectedTemplate.photos_required} Pose
              </StatusBadge>
            </div>

            <div
              role="group"
              aria-label="Pilih jumlah foto dalam sesi"
              className="grid grid-cols-2 gap-2.5"
            >
              {posePackages.map((pkg) => {
                const isSelected =
                  selectedTemplate.photos_required === pkg.poses;
                return (
                  <button
                    key={pkg.poses}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectPoseCount(pkg.poses)}
                    className={`min-h-[56px] p-3 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "bg-sweet-blush border-sweet-primaryStrong shadow-sm"
                        : "bg-sweet-bg hover:bg-sweet-blush/40 border-sweet-border"
                    }`}
                  >
                    <div className="font-heading font-bold text-sm text-sweet-text">
                      {pkg.label}
                    </div>
                    <div className="text-xs text-sweet-muted mt-0.5">
                      {pkg.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Timer Hitung Mundur Selection (1s, 3s, 5s) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-heading font-bold text-sm text-sweet-text flex items-center gap-1.5">
                  <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
                  <span>Timer Hitung Mundur</span>
                </label>
                <StatusBadge tone="pink">
                  {selectedCountdownSeconds} Detik
                </StatusBadge>
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
                      className={`min-h-[52px] p-2 rounded-2xl border-2 text-center transition-all ${
                        isSelected
                          ? "bg-sweet-blush border-sweet-primaryStrong shadow-sm"
                          : "bg-sweet-bg hover:bg-sweet-blush/40 border-sweet-border"
                      }`}
                    >
                      <div className="font-heading font-extrabold text-sm text-sweet-text">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-sweet-muted font-medium mt-0.5">
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
                className="block font-heading font-bold text-sm text-sweet-text mb-1"
              >
                Nama / Catatan di Frame (Opsional)
              </label>
              <span
                id="customer-caption-hint"
                className="block text-xs text-sweet-muted mb-2"
              >
                Teks ini akan tercetak manis di bagian bawah frame foto kamu.
              </span>
              <input
                id="customer-caption-input"
                type="text"
                maxLength={24}
                autoComplete="nickname"
                aria-describedby="customer-caption-hint"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Rina & Besties ♡"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-sweet-bg border-2 border-sweet-border text-sweet-text placeholder:text-sweet-muted/70 text-sm font-medium focus:border-sweet-primaryStrong"
              />
            </div>

            {/* Brief Instructions */}
            <ol className="text-xs text-sweet-muted space-y-1.5 bg-sweet-bg p-3.5 rounded-2xl border border-sweet-border list-decimal list-inside">
              <li>
                Kamera akan memotret{" "}
                <strong className="text-sweet-text">
                  {selectedTemplate.photos_required} kali
                </strong>{" "}
                dengan timer{" "}
                <strong className="text-sweet-text">
                  {selectedCountdownSeconds} detik
                </strong>.
              </li>
              <li>
                Setiap foto memiliki preview 5 detik untuk lanjut atau foto ulang.
              </li>
              <li>
                Setelah selesai, kamu bebas memilih warna frame & desain favoritmu!
              </li>
            </ol>
          </Card>

          <Button
            variant="primary"
            size="xl"
            loading={isBusy}
            disabled={!cameraReady || isBusy}
            onClick={() => onStartCapture(customerName.trim() || undefined)}
            rightIcon={<FlowerIcon className="size-6 text-sweet-primaryStrong" />}
            className="w-full min-h-[68px] text-xl shadow-sweetLg border-sweet-primaryStrong"
          >
            I&apos;M READY!
          </Button>
        </div>
      </div>
    </section>
  );
}
