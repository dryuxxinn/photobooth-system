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
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-6 py-5 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Top Pose Header */}
      <div className="text-center space-y-1">
        <h1
          id="capture-heading"
          className="font-heading font-extrabold text-2xl md:text-3xl tracking-wider text-sweet-text"
        >
          PHOTO {currentPoseNumber} OF {session.photos_required}
        </h1>
        <p className="text-sm font-heading font-semibold text-sweet-muted flex items-center justify-center gap-1.5">
          <span>Get ready to pose!</span>
          <HeartIcon className="size-4 text-sweet-primaryStrong" />
        </p>
      </div>

      {/* Main Focused Camera Preview Stage with Countdown Overlay */}
      <div className="w-full flex flex-col items-center justify-center my-2">
        <CameraPreview
          cameraStatus={null}
          latestPhoto={latestPhoto}
          photosRequired={session.photos_required}
          photosTaken={session.photos_taken}
          mode="capturing"
          cameraSource={cameraSource}
          facingMode={facingMode}
          streamReady={streamReady}
          webcamError={webcamError}
          deviceLabel={deviceLabel}
          attachVideoRef={attachVideoRef}
        >
          {/* Huge Countdown Badge in Center */}
          {countdown !== null && countdown > 0 && !captureError && (
            <div className="absolute inset-0 bg-sweet-text/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
              <div
                key={countdown}
                className="size-36 sm:size-44 rounded-full bg-sweet-surface/95 border-4 border-sweet-primaryStrong shadow-sweetLg flex items-center justify-center animate-sticker-pop"
              >
                <span
                  className="font-heading font-extrabold text-sweet-text leading-none"
                  style={{ fontSize: "clamp(4rem, 3rem + 4vw, 6.2rem)" }}
                >
                  {countdown}
                </span>
              </div>
              <span className="mt-4 px-5 py-2 rounded-full bg-sweet-surface/95 border border-sweet-primary font-heading font-bold text-base text-sweet-text shadow-sm">
                Tahan senyum terbaikmu! ♡
              </span>
            </div>
          )}

          {/* Capturing / Downloading confirmation state */}
          {(countdown === 0 || (isBusy && !captureError)) && (
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

      {/* Bottom Progress Indicator & Thumbnail Strip */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <ProgressIndicator
          current={session.photos_taken}
          total={session.photos_required}
          label={`${session.photos_taken} / ${session.photos_required} photos`}
        />

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
      </div>
    </section>
  );
}
