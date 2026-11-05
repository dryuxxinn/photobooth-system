"use client";

import React, { useEffect, useState } from "react";
import { CameraStatus, PhotoItem } from "@/types/photobooth";
import {
  CameraSourceMode,
  WebcamFacingMode,
  formatCameraLabel,
  isCaptureCardDevice,
} from "@/hooks/useWebcam";
import { getApiBaseUrl, resolveStorageUrl } from "@/services/api";
import {
  CameraIcon,
  HeartIcon,
  RefreshIcon,
  SparkleIcon,
} from "@/components/icons";

interface CameraPreviewProps {
  cameraStatus: CameraStatus | null;
  latestPhoto?: PhotoItem | null;
  photosRequired: number;
  photosTaken: number;
  mode: "preparation" | "capturing";
  isReviewing?: boolean;
  cameraSource?: CameraSourceMode;
  onChangeCameraSource?: (source: CameraSourceMode) => void;
  facingMode?: WebcamFacingMode;
  onToggleFacingMode?: () => void;
  devices?: MediaDeviceInfo[];
  selectedDeviceId?: string | null;
  onSelectDeviceId?: (deviceId: string) => void;
  isMirrored?: boolean;
  onToggleMirror?: () => void;
  streamReady?: boolean;
  webcamError?: string | null;
  deviceLabel?: string;
  attachVideoRef?: (node: HTMLVideoElement | null) => void;
  onRetryWebcam?: () => void;
  filterCss?: string;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function CameraPreview({
  cameraStatus,
  latestPhoto,
  photosRequired,
  photosTaken,
  mode,
  isReviewing = false,
  cameraSource = "webcam",
  onChangeCameraSource,
  facingMode = "user",
  onToggleFacingMode,
  devices = [],
  selectedDeviceId = null,
  onSelectDeviceId,
  isMirrored = true,
  onToggleMirror,
  streamReady = false,
  webcamError = null,
  deviceLabel = "Webcam / Kamera Perangkat",
  attachVideoRef,
  onRetryWebcam,
  filterCss = "none",
  children,
  className = "",
  containerClassName = "",
}: CameraPreviewProps) {
  const serverCameraReady = cameraStatus?.connected ?? true;
  const isUsingWebcam = cameraSource === "webcam";
  const latestSrc = latestPhoto
    ? resolveStorageUrl(latestPhoto.preview_url || latestPhoto.thumbnail_url)
    : "";

  const [serverPreviewTick, setServerPreviewTick] = useState<number>(0);
  const [serverPreviewFailed, setServerPreviewFailed] = useState<boolean>(false);

  useEffect(() => {
    if (isUsingWebcam || isReviewing) return;
    setServerPreviewFailed(false);
    setServerPreviewTick(Date.now());
    const interval = setInterval(() => {
      setServerPreviewTick(Date.now());
    }, 180);
    return () => clearInterval(interval);
  }, [isUsingWebcam, isReviewing]);

  const serverLiveFrameUrl = `${getApiBaseUrl()}/camera/preview-frame?t=${serverPreviewTick}`;
  const isCapture = isCaptureCardDevice(deviceLabel);

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-2.5 ${className || "max-w-xl md:max-w-2xl"}`}>
      {/* Main 3:2 Camera Viewport */}
      <div className={`relative w-full max-w-[calc(76dvh*1.5)] aspect-[3/2] max-h-[76dvh] rounded-[2.5rem] bg-sweet-surface border-4 border-white/90 shadow-sweetLg overflow-hidden flex flex-col items-center justify-center ${containerClassName}`}>
        {/* Top Status Overlay inside Camera Frame */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 z-20 pointer-events-none">
          {isUsingWebcam ? (
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-md border border-white/60 text-xs font-heading font-extrabold flex items-center gap-2 shadow-sm">
              <span className="size-2 rounded-full bg-white animate-ping" />
              <span>
                {streamReady
                  ? isCapture
                    ? "Live DSLR (USB Capture Card)"
                    : `Live: ${deviceLabel}`
                  : "Menyiapkan Kamera..."}
              </span>
            </div>
          ) : (
            <div className={`px-3.5 py-1.5 rounded-full ${serverCameraReady ? "bg-purple-600/90" : "bg-rose-500/90"} text-white backdrop-blur-md border border-white/60 text-xs font-heading font-extrabold flex items-center gap-2 shadow-sm`}>
              <span className="size-2 rounded-full bg-white animate-ping" />
              <span>
                {serverCameraReady
                  ? cameraStatus?.driver === "wifi"
                    ? `Live Wi-Fi: ${cameraStatus?.model || "Sony Alpha a6400"} (${cameraStatus?.wifi_ip || "192.168.122.1"})`
                    : `Kamera Server: ${cameraStatus?.model || "Canon DSLR"}`
                  : "Kamera Server Terputus"}
              </span>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/90 text-xs font-heading font-extrabold text-[#3F3D56] flex items-center gap-1.5 shadow-sm">
            <CameraIcon className="size-3.5 text-[#F472B6]" />
            <span>
              {mode === "preparation"
                ? `${photosRequired} Pose Frame`
                : `Foto ${Math.min(photosTaken + 1, photosRequired)} dari ${photosRequired}`}
            </span>
          </div>
        </div>

        {/* Live Browser Webcam / iPad USB Capture Card Video Element */}
        {isUsingWebcam && (
          <video
            ref={attachVideoRef}
            autoPlay
            playsInline
            muted
            style={{ filter: filterCss || "none" }}
            className={`w-full h-full object-cover transition-all duration-300 ${
              streamReady ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            } ${isMirrored ? "-scale-x-100" : ""}`}
          />
        )}

        {/* Face Position Guide Overlay (Oval dashed line) - Only in preparation mode */}
        {isUsingWebcam && streamReady && mode === "preparation" && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10"
          >
            <div className="w-48 sm:w-56 h-60 sm:h-72 rounded-[50%] border-2 border-dashed border-white/70 flex items-end justify-center pb-3 shadow-xs">
              <span className="px-3.5 py-1 rounded-full bg-[#3F3D56]/60 text-white text-[11px] font-heading font-bold backdrop-blur-xs">
                ✦ Posisikan wajah di dalam garis bantu ✦
              </span>
            </div>
          </div>
        )}

        {/* Full-size preview of photo just taken during 5s review intermission */}
        {latestSrc && isReviewing && (
          <div className="absolute inset-0 z-10 bg-black animate-screen-fade flex items-center justify-center">
            <img
              src={latestSrc}
              alt={`Hasil foto ke-${latestPhoto?.index || photosTaken}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Mini corner thumbnail of latest captured photo when live view is active (hidden when reviewing) */}
        {(streamReady || !isUsingWebcam) &&
          latestSrc &&
          mode === "capturing" &&
          !isReviewing && (
            <div className="absolute bottom-4 left-4 z-10 bg-white p-1.5 rounded-2xl border-2 border-sweet-primary shadow-sweet pointer-events-none flex items-center gap-2">
              <img
                src={latestSrc}
                alt={`Foto terakhir #${latestPhoto?.index || photosTaken}`}
                className="w-20 h-14 object-cover rounded-xl"
              />
              <span className="pr-2 font-heading font-bold text-xs text-sweet-text">
                #{latestPhoto?.index || photosTaken} Tersimpan ✓
              </span>
            </div>
          )}

        {/* Fallback view when using Server Camera OR when Webcam permission is not yet active */}
        {(!isUsingWebcam || !streamReady) && (
          <>
            {!isUsingWebcam && serverCameraReady && !serverPreviewFailed ? (
              <img
                src={serverLiveFrameUrl}
                alt="Live View Kamera DSLR / Server"
                style={{ filter: filterCss || "none" }}
                onError={() => setServerPreviewFailed(true)}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-3.5">
                <div
                  aria-hidden="true"
                  className="relative w-56 h-36 sm:w-64 sm:h-40 rounded-3xl bg-sweet-blush/70 border-2 border-dashed border-sweet-primaryStrong/60 flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center gap-3 text-sweet-primaryStrong">
                    <SparkleIcon className="size-5" />
                    <CameraIcon className="size-10" />
                    <HeartIcon className="size-5" />
                  </div>
                  <span className="font-heading font-bold text-sm text-sweet-text px-2">
                    {mode === "preparation"
                      ? "Posisi Berdiri & Senyum Manis ♡"
                      : "Lihat ke Lensa Kamera ✨"}
                  </span>
                </div>

                {isUsingWebcam && webcamError ? (
                  <div className="max-w-md space-y-2">
                    <p className="text-xs text-sweet-muted font-medium">
                      {webcamError}
                    </p>
                    {onRetryWebcam && (
                      <button
                        type="button"
                        onClick={onRetryWebcam}
                        className="min-h-[38px] px-4 py-1.5 rounded-full bg-sweet-blush hover:bg-sweet-primary text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshIcon className="size-3.5" />
                        <span>Izinkan / Coba Ulang Kamera Perangkat</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-sweet-muted font-medium max-w-md">
                    {mode === "preparation"
                      ? "Mendukung 2 opsi: DSLR via Capture Card iPad (USB-C) atau DSLR via USB Server (Laptop/PC)."
                      : "Bersiap berpose! Foto yang baru diambil akan langsung tampil di layar ini."}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Optional Countdown or Retry Overlay */}
        {children}
      </div>
    </div>
  );
}
