"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraSourceMode = "webcam" | "server";
export type WebcamFacingMode = "user" | "environment";

interface UseWebcamOptions {
  active: boolean;
}

export function useWebcam({ active }: UseWebcamOptions) {
  const [cameraSource, setCameraSource] = useState<CameraSourceMode>("webcam");
  const [facingMode, setFacingMode] = useState<WebcamFacingMode>("user");
  const [streamReady, setStreamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>("Webcam / Kamera Perangkat");

  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    setStreamReady(false);
  }, []);

  const startStream = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStreamReady(false);
      setWebcamError(
        "Browser ini belum mengizinkan akses kamera langsung (gunakan localhost atau HTTPS untuk kamera iPad/Webcam)."
      );
      return;
    }

    stopStream();
    setWebcamError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1280 },
        },
      });

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.label) {
        setDeviceLabel(videoTrack.label);
      } else {
        setDeviceLabel(
          facingMode === "user" ? "Kamera Depan (Selfie)" : "Kamera Belakang"
        );
      }

      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        videoElRef.current.play().catch(() => {});
      }
      setStreamReady(true);
    } catch (err: any) {
      setStreamReady(false);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setWebcamError(
          "Izin kamera ditolak di browser. Klik ikon gembok/kamera di address bar untuk mengizinkan, atau gunakan mode Kamera Server."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setWebcamError(
          "Tidak ditemukan perangkat webcam/kamera pada perangkat ini. Sistem akan menggunakan Kamera Server."
        );
      } else {
        setWebcamError(
          "Kamera perangkat sedang digunakan aplikasi lain atau belum tersedia."
        );
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (active && cameraSource === "webcam") {
      startStream();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [active, cameraSource, startStream, stopStream]);

  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoElRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch(() => {});
    }
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  const captureFrameDataUrl = useCallback((): string | null => {
    const video = videoElRef.current;
    if (
      cameraSource !== "webcam" ||
      !streamRef.current ||
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    const targetW = 1800;
    const targetH = 1200; // 3:2 DSLR / Photobooth aspect ratio
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetAspect = targetW / targetH;
    const videoAspect = vw / vh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (videoAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    // Mirror horizontally when using front/selfie camera so result matches live preview
    if (facingMode === "user") {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.92);
  }, [cameraSource, facingMode]);

  return {
    cameraSource,
    setCameraSource,
    facingMode,
    toggleFacingMode,
    streamReady,
    webcamError,
    deviceLabel,
    attachVideoRef,
    retryWebcam: startStream,
    captureFrameDataUrl,
  };
}
