"use client";

import React from "react";
import { SessionDetail } from "@/types/photobooth";
import { CameraPreview } from "./CameraPreview";
import { CameraSourceMode, WebcamFacingMode } from "@/hooks/useWebcam";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AlertIcon,
  CameraIcon,
  HeartIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/components/icons";

interface CountdownOverlayProps {
  session: SessionDetail;
  countdown: number | null;
  reviewCountdown: number | null;
  onProceedNext: () => void;
  onRetakeCurrent: () => void;
  isBusy: boolean;
  captureError: string | null;
  cameraSource: CameraSourceMode;
  facingMode: WebcamFacingMode;
  streamReady: boolean;
  webcamError: string | null;
  deviceLabel: string;
  attachVideoRef: (node: HTMLVideoElement | null) => void;
  onRetryCapture: () => void;
  onAbort: () => void;
}

export function CountdownOverlay({
  session,
  countdown,
  reviewCountdown,
  onProceedNext,
  onRetakeCurrent,
  isBusy,
  captureError,
  cameraSource,
  facingMode,
  streamReady,
  webcamError,
  deviceLabel,
  attachVideoRef,
  onRetryCapture,
  onAbort,
}: CountdownOverlayProps) {
  const isReviewing = reviewCountdown !== null;
  const currentPoseNumber = Math.min(
    session.photos_taken + 1,
    session.photos_required
  );
  const latestPhoto =
    session.photos.length > 0
      ? session.photos[session.photos.length - 1]
      : null;

  return (
    <section
      aria-labelledby="capture-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 overflow-y-auto kiosk-scroll relative"
    >
      {/* Dimmed focused background backdrop */}
      <div className="fixed inset-0 bg-black/15 pointer-events-none z-0" />

      {/* Top Pose Header with Unobstructed Timer */}
      <div className="text-center space-y-1 z-10 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        <div className="inline-flex items-center gap-3 sm:gap-4 px-6 sm:px-8 py-2 sm:py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-white/90 shadow-sweet">
          <h1
            id="capture-heading"
            className="font-heading font-extrabold text-2xl sm:text-3xl tracking-wider text-[#3F3D56]"
          >
            {isReviewing
              ? `PHOTO ${session.photos_taken} OF ${session.photos_required}`
              : `PHOTO ${currentPoseNumber} OF ${session.photos_required}`}
          </h1>

          {/* Countdown Timer Badge in Header - NOT blocking the camera preview! */}
          {countdown !== null && countdown > 0 && !isReviewing && (
            <div
              key={countdown}
              className="px-4 py-1 sm:px-5 sm:py-1 rounded-full bg-gradient-to-r from-[#F472B6] to-[#EC4899] text-white font-heading font-extrabold text-2xl sm:text-3xl shadow-glow animate-bubble-pop flex items-center gap-2"
            >
              <span className="text-xl sm:text-2xl animate-pulse">⏱</span>
              <span>{countdown}s</span>
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm font-heading font-semibold text-sweet-muted flex items-center justify-center gap-1.5 pt-0.5">
          <span>
            {isReviewing
              ? "Tinjau hasil foto — Pilih lanjut atau foto ulang ♡"
              : countdown !== null && countdown > 0
              ? `Senyum manis ke kamera! Foto diambil dalam ${countdown} detik ✨`
              : "Bersiap berpose! ♡"}
          </span>
          <HeartIcon className="size-4 text-sweet-primaryStrong" />
        </p>
      </div>

      {/* Main Focused Camera Preview Stage - Expanded to feel immersive / full screen */}
      <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] flex-1 min-h-0 flex flex-col items-center justify-center my-1 sm:my-2 z-10">
        <CameraPreview
          cameraStatus={null}
          latestPhoto={latestPhoto}
          photosRequired={session.photos_required}
          photosTaken={session.photos_taken}
          mode="capturing"
          isReviewing={isReviewing}
          cameraSource={cameraSource}
          facingMode={facingMode}
          streamReady={streamReady}
          webcamError={webcamError}
          deviceLabel={deviceLabel}
          attachVideoRef={attachVideoRef}
          className="w-full h-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] flex flex-col items-center justify-center"
        >

          {/* Capturing / Downloading confirmation state */}
          {(countdown === 0 || (isBusy && !captureError)) && !isReviewing && (
            <div className="absolute inset-0 bg-sweet-surface/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <div className="size-20 rounded-full bg-sweet-primary flex items-center justify-center text-sweet-text shadow-sweet">
                <SpinnerIcon className="size-10 text-sweet-primaryStrong" />
              </div>
              <p className="font-heading font-extrabold text-xl text-sweet-text">
                Mengambil & Menyimpan Foto ke-{currentPoseNumber}...
              </p>
              <p className="text-xs text-sweet-muted">
                Menunggu konfirmasi kamera sebelum lanjut ke pose berikutnya
              </p>
            </div>
          )}

          {/* Friendly Capture Error & Retry Overlay (Section 3.D & Section 5) */}
          {captureError && (
            <div className="absolute inset-0 bg-sweet-bg/95 backdrop-blur-sm flex items-center justify-center p-6 z-30">
              <Card
                variant="surface"
                padding="md"
                className="max-w-md w-full text-center space-y-4 border-sweet-error"
              >
                <div className="mx-auto size-14 rounded-full bg-[#FCECEE] text-sweet-error flex items-center justify-center">
                  <AlertIcon className="size-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-heading font-extrabold text-xl text-sweet-text">
                    Ups, Kamera Belum Berhasil Memotret
                  </h2>
                  <p className="text-sm text-sweet-muted">{captureError}</p>
                  <p className="text-xs text-sweet-muted">
                    Jangan khawatir, {session.photos_taken} foto sebelumnya
                    tetap aman tersimpan.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<RefreshIcon className="size-5" />}
                    onClick={onRetryCapture}
                    className="flex-1"
                  >
                    Ambil Ulang Foto Ini
                  </Button>
                  <Button
                    variant="surface"
                    size="lg"
                    onClick={onAbort}
                  >
                    Batalkan
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </CameraPreview>
      </div>

      {/* Bottom Progress Indicator & Action Strip */}
      <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] flex flex-col sm:flex-row items-center justify-between gap-3 z-10 px-2">
        <ProgressIndicator
          current={session.photos_taken}
          total={session.photos_required}
          label={`${session.photos_taken} / ${session.photos_required} photos`}
        />

        {isReviewing ? (
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto animate-screen-fade">
            {/* Auto-next Timer Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border-2 border-[#F472B6] shadow-sweet">
              <span className="size-2.5 rounded-full bg-[#F472B6] animate-ping" />
              <span className="font-heading font-extrabold text-xs sm:text-sm text-[#3F3D56]">
                Foto #{session.photos_taken} Tersimpan • Auto-next:{" "}
                <span className="text-[#F472B6] font-black">{reviewCountdown}s</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="surface"
                size="md"
                onClick={onRetakeCurrent}
                disabled={isBusy}
                leftIcon={<RefreshIcon className="size-4 text-sweet-error" />}
                className="min-h-[44px] px-4 rounded-full border-2 border-sweet-border hover:border-sweet-error text-sweet-text hover:text-sweet-error font-heading font-bold text-xs sm:text-sm active:scale-95 transition-all"
              >
                Foto Ulang ↺
              </Button>
              <Button
                variant="strong"
                size="md"
                onClick={onProceedNext}
                disabled={isBusy}
                rightIcon={<HeartIcon className="size-4 text-white" />}
                className="min-h-[44px] px-5 sm:px-6 rounded-full font-heading font-extrabold text-xs sm:text-sm shadow-sweet active:scale-95 transition-all"
              >
                {session.photos_taken >= session.photos_required
                  ? `Selesai & Frame (${reviewCountdown}s) ➔`
                  : `Lanjut (${reviewCountdown}s) ➔`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={onAbort}
              disabled={isBusy && !captureError}
              leftIcon={<CameraIcon className="size-4" />}
              className="rounded-full text-sweet-muted hover:text-sweet-text"
            >
              Batalkan Sesi
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
