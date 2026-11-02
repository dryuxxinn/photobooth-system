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
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Top Pose Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-3">
          <h1
            id="capture-heading"
            className="font-heading font-extrabold text-2xl md:text-3xl tracking-wider text-sweet-text"
          >
            {isReviewing
              ? `PHOTO ${session.photos_taken} OF ${session.photos_required} • PREVIEW`
              : `PHOTO ${currentPoseNumber} OF ${session.photos_required}`}
          </h1>
          {countdown !== null && countdown > 0 && !isReviewing && (
            <span
              key={countdown}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sweet-blush border-2 border-sweet-primaryStrong text-sweet-text font-heading font-extrabold text-base sm:text-lg shadow-sm animate-sticker-pop"
            >
              <span className="size-2 rounded-full bg-sweet-primaryStrong animate-ping" />
              <span>{countdown}s</span>
            </span>
          )}
        </div>
        <p className="text-sm font-heading font-semibold text-sweet-muted flex items-center justify-center gap-1.5">
          <span>
            {isReviewing
              ? "Tinjau hasil foto — Pilih lanjut atau foto ulang"
              : countdown !== null && countdown > 0
              ? `Senyum manis ke kamera! Mengambil foto dalam ${countdown} detik ♡`
              : "Get ready to pose!"}
          </span>
          <HeartIcon className="size-4 text-sweet-primaryStrong" />
        </p>
      </div>

      {/* Main Focused Camera Preview Stage with Countdown Overlay */}
      <div className="w-full flex flex-col items-center justify-center my-1 sm:my-2">
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
        >
          {/* 5-Second Review Intermission Overlay (Compact slim bar at bottom, leaving photo 100% visible) */}
          {isReviewing && !captureError && (
            <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-4 sm:bottom-3 z-30">
              <div className="py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-sweet-primaryStrong shadow-sweet flex flex-col sm:flex-row items-center justify-between gap-2 animate-screen-fade">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 sm:size-9 shrink-0 flex items-center justify-center rounded-xl bg-sweet-blush border-2 border-sweet-primaryStrong font-heading font-extrabold text-sweet-text text-sm sm:text-base shadow-xs">
                    {reviewCountdown}s
                  </div>
                  <div className="text-left">
                    <span className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text block">
                      Foto #{session.photos_taken} Tersimpan ✓
                    </span>
                    <span className="text-[11px] text-sweet-muted block">
                      Auto-next {reviewCountdown} detik
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    variant="surface"
                    size="md"
                    onClick={onRetakeCurrent}
                    disabled={isBusy}
                    leftIcon={<RefreshIcon className="size-3.5 text-sweet-error" />}
                    className="flex-1 sm:flex-initial min-h-[38px] px-3.5 border-2 border-sweet-border hover:border-sweet-error text-sweet-text hover:text-sweet-error font-heading font-bold text-xs"
                  >
                    Foto Ulang
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onProceedNext}
                    disabled={isBusy}
                    rightIcon={
                      <HeartIcon className="size-3.5 text-sweet-primaryStrong" />
                    }
                    className="flex-1 sm:flex-initial min-h-[38px] px-4 shadow-sweet font-heading font-extrabold text-xs"
                  >
                    {session.photos_taken >= session.photos_required
                      ? "Selesai & Frame ➔"
                      : "Lanjut (Next) ➔"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Non-obstructive Top Countdown Badge inside Camera (Top headroom, NOT covering the user's face) */}
          {countdown !== null &&
            countdown > 0 &&
            !captureError &&
            !isReviewing && (
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
                <div
                  key={countdown}
                  className="px-5 py-1.5 rounded-full bg-white/95 backdrop-blur-xs border-2 border-sweet-primaryStrong shadow-sweet flex items-center gap-2.5 animate-sticker-pop"
                >
                  <span className="size-2.5 rounded-full bg-sweet-primaryStrong animate-ping" />
                  <span className="font-heading font-extrabold text-sweet-text text-2xl leading-none">
                    {countdown}
                  </span>
                  <span className="font-heading font-bold text-xs text-sweet-muted uppercase tracking-wider">
                    detik
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

      {/* Bottom Progress Indicator & Action Strip */}
      <div className="w-full max-w-xl md:max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <ProgressIndicator
          current={session.photos_taken}
          total={session.photos_required}
          label={`${session.photos_taken} / ${session.photos_required} photos`}
        />

        {isReviewing ? (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="surface"
              size="md"
              onClick={onRetakeCurrent}
              disabled={isBusy}
              leftIcon={<RefreshIcon className="size-4 text-sweet-error" />}
              className="flex-1 sm:flex-initial min-h-[44px] border-2 border-sweet-border hover:border-sweet-error text-sweet-text hover:text-sweet-error font-heading font-bold"
            >
              Foto Ulang ↺
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onProceedNext}
              disabled={isBusy}
              rightIcon={<HeartIcon className="size-4 text-sweet-primaryStrong" />}
              className="flex-1 sm:flex-initial min-h-[44px] font-heading font-extrabold shadow-sweet"
            >
              {session.photos_taken >= session.photos_required
                ? `Selesai & Frame (${reviewCountdown}s) ➔`
                : `Lanjut (${reviewCountdown}s) ➔`}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={onAbort}
              disabled={isBusy && !captureError}
              leftIcon={<CameraIcon className="size-4" />}
            >
              Batalkan Sesi
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
