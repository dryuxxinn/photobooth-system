"use client";

import React from "react";
import { CameraStatus, SessionDetail } from "@/types/photobooth";
import { CameraPreview } from "./CameraPreview";
import { CameraSourceMode, WebcamFacingMode } from "@/hooks/useWebcam";
import { getFilterCss } from "@/lib/defaults";
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
  cameraStatus?: CameraStatus | null;
  countdown: number | null;
  reviewCountdown: number | null;
  onCaptureNow?: () => void;
  onProceedNext: () => void;
  onRetakeCurrent: () => void;
  isBusy: boolean;
  captureError: string | null;
  cameraSource: CameraSourceMode;
  facingMode: WebcamFacingMode;
  isMirrored?: boolean;
  streamReady: boolean;
  webcamError: string | null;
  deviceLabel: string;
  attachVideoRef: (node: HTMLVideoElement | null) => void;
  onRetryWebcam?: () => void;
  onRetryCapture: () => void;
  onAbort: () => void;
  filterCss?: string;
}

export function CountdownOverlay({
  session,
  cameraStatus = null,
  countdown,
  reviewCountdown,
  onCaptureNow,
  onProceedNext,
  onRetakeCurrent,
  isBusy,
  captureError,
  cameraSource,
  facingMode,
  isMirrored = true,
  streamReady,
  webcamError,
  deviceLabel,
  attachVideoRef,
  onRetryWebcam,
  onRetryCapture,
  onAbort,
  filterCss,
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
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2.5 overflow-hidden relative"
    >
      {/* Top Pose Header */}
      <div className="text-center space-y-0.5 z-10 w-full max-w-5xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-3 px-6 py-1.5 rounded-full bg-white/95 border-2 border-[#F3E6EE] shadow-sweet-card">
          <h1
            id="capture-heading"
            className="font-heading font-extrabold text-xl sm:text-2xl tracking-wider text-[#3F3D56]"
          >
            {isReviewing
              ? `PHOTO ${session.photos_taken} OF ${session.photos_required}`
              : `PHOTO ${currentPoseNumber} OF ${session.photos_required}`}
          </h1>
        </div>
        <p className="text-xs font-heading font-semibold text-sweet-muted flex items-center justify-center gap-1.5 pt-0.5 mx-auto text-center">
          <span>
            {isReviewing
              ? "Tinjau hasil foto: pilih lanjut atau foto ulang"
              : countdown !== null && countdown > 0
              ? `Senyum manis ke kamera! Foto diambil dalam ${countdown} detik`
              : "Bersiap berpose!"}
          </span>
          <HeartIcon className="size-3.5 text-sweet-primaryStrong shrink-0" />
        </p>
      </div>

      {/* Main Focused Camera Preview Stage - Expanded to feel immersive / full screen */}
      <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1450px] flex-1 min-h-0 flex flex-col items-center justify-center my-0.5 z-10">
        <CameraPreview
          cameraStatus={cameraStatus}
          latestPhoto={latestPhoto}
          photosRequired={session.photos_required}
          photosTaken={session.photos_taken}
          mode="capturing"
          isReviewing={isReviewing}
          cameraSource={cameraSource}
          facingMode={facingMode}
          isMirrored={isMirrored}
          streamReady={streamReady}
          webcamError={webcamError}
          deviceLabel={deviceLabel}
          attachVideoRef={attachVideoRef}
          onRetryWebcam={onRetryWebcam}
          filterCss={filterCss || (session.filter_name ? getFilterCss(session.filter_name) : "none")}
          className="w-full h-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1450px] flex flex-col items-center justify-center"
        >
          {/* Centered Glassmorphic Translucent Countdown HUD (Per User Mockup) */}
          {countdown !== null && countdown > 0 && !isReviewing && (
            <div
              aria-live="assertive"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
            >
              <div
                key={countdown}
                className="size-32 sm:size-40 rounded-full bg-[#3F3D56]/40 backdrop-blur-md border-3 border-white/60 shadow-sweetLg flex flex-col items-center justify-center animate-bubble-pop"
              >
                <span className="font-heading font-black text-6xl sm:text-7xl text-white drop-shadow-md select-none tracking-tight">
                  {countdown}
                </span>
                <span className="text-[11px] font-heading font-extrabold tracking-widest uppercase text-white/95 drop-shadow-xs -mt-1">
                  SMILE!
                </span>
              </div>
            </div>
          )}

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

      {/* Unified Glassmorphic Bottom Control Dock (Centered safely away from bottom-right HUD) */}
      <div className="w-full max-w-4xl xl:max-w-5xl mx-auto p-2 sm:p-2.5 rounded-3xl bg-white/90 backdrop-blur-md border-2 border-[#F3E6EE] shadow-sweet-card flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        <ProgressIndicator
          current={session.photos_taken}
          total={session.photos_required}
          label={`${session.photos_taken} / ${session.photos_required} photos`}
        />

        {isReviewing ? (
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto animate-screen-fade">
            {/* Auto-next Timer Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FFF0F5] border-2 border-[#FBCFE8]">
              <span className="size-2.5 rounded-full bg-[#DB2777]" />
              <span className="font-heading font-extrabold text-xs sm:text-sm text-[#3F3D56]">
                Foto #{session.photos_taken} Tersimpan • Auto-next:{" "}
                <span className="text-[#DB2777] font-black">{reviewCountdown}s</span>
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
                className="min-h-[44px] px-4 rounded-2xl border-2 border-sweet-border hover:border-sweet-error text-sweet-text hover:text-sweet-error font-heading font-bold text-xs sm:text-sm active:scale-95 transition-all"
              >
                Foto Ulang
              </Button>
              <Button
                variant="strong"
                size="md"
                onClick={onProceedNext}
                disabled={isBusy}
                rightIcon={<HeartIcon className="size-4 text-white" />}
                className="min-h-[44px] px-5 sm:px-6 rounded-2xl font-heading font-extrabold text-xs sm:text-sm active:scale-95 transition-all"
              >
                {session.photos_taken >= session.photos_required
                  ? `Selesai & Frame (${reviewCountdown}s)`
                  : `Lanjut (${reviewCountdown}s)`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {onCaptureNow && countdown !== null && countdown > 0 && !isBusy && (
              <Button
                variant="strong"
                size="md"
                onClick={onCaptureNow}
                leftIcon={<CameraIcon className="size-4" />}
                className="min-h-[44px] px-5 rounded-2xl font-heading font-extrabold text-xs sm:text-sm"
              >
                Jepret Sekarang
              </Button>
            )}
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
