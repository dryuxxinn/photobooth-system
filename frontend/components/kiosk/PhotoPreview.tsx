"use client";

import React, { useEffect, useState } from "react";
import {
  FrameThemeOption,
  SessionDetail,
  TemplateOption,
} from "@/types/photobooth";
import {
  PREVIEW_IDLE_SECONDS,
  PREVIEW_IDLE_WARN_SECONDS,
} from "@/lib/config";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QrDialog } from "@/components/QrDialog";
import {
  AlertIcon,
  HeartIcon,
  MinusIcon,
  PaletteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrinterIcon,
  QrIcon,
  SpinnerIcon,
} from "@/components/icons";

interface PhotoPreviewProps {
  session: SessionDetail;
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  isBusy: boolean;
  imageVersion: number;
  onOpenChangeFrame: () => void;
  onPrint: (copies: number) => Promise<void>;
  onFinishWithoutPrint: () => Promise<void>;
}

type ViewTab = "composite" | "slideshow" | "originals";

export function PhotoPreview({
  session,
  templates,
  frameThemes,
  isBusy,
  imageVersion,
  onOpenChangeFrame,
  onPrint,
  onFinishWithoutPrint,
}: PhotoPreviewProps) {
  const [viewTab, setViewTab] = useState<ViewTab>("composite");
  const [copies, setCopies] = useState<number>(1);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [slidePaused, setSlidePaused] = useState<boolean>(false);
  const [qrOpen, setQrOpen] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const { secondsLeft, resetTimer } = useIdleCountdown({
    enabled: !isBusy && !qrOpen,
    totalSeconds: PREVIEW_IDLE_SECONDS,
    onExpire: onFinishWithoutPrint,
  });

  useEffect(() => {
    if (viewTab !== "slideshow" || slidePaused || session.photos.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % session.photos.length);
    }, 1100);
    return () => clearInterval(timer);
  }, [viewTab, slidePaused, session.photos.length]);

  const compositeUrl = resolveStorageUrl(
    session.processed_image_url,
    imageVersion
  );
  const rawCompositeUrl = resolveStorageUrl(session.processed_image_url);

  const activeTemplate = templates.find((t) => t.id === session.template_id);
  const activeTheme = frameThemes.find((f) => f.id === session.frame_color);

  const handleShareOrDownload = async () => {
    if (!rawCompositeUrl) return;
    try {
      const response = await fetch(rawCompositeUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `sweet-studio-${session.session_id}.jpg`,
        { type: "image/jpeg" }
      );

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Sweet Studio Photobooth",
          text: "Kenangan manis dari Sweet Studio Photobooth ♡",
          files: [file],
        });
        setShareToast("Foto berhasil dibagikan!");
        setTimeout(() => setShareToast(null), 3500);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `sweet-studio-${session.session_id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setShareToast("Foto berhasil diunduh ke perangkat!");
      setTimeout(() => setShareToast(null), 3500);
    } catch {
      window.open(rawCompositeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-6 py-4 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Idle Timeout Warning Banner (Section 6.C) */}
      {secondsLeft <= PREVIEW_IDLE_WARN_SECONDS && (
        <div
          role="alert"
          className="max-w-4xl w-full mx-auto mb-2 px-5 py-3 rounded-2xl bg-[#FCECEE] border-2 border-[#EABAC0] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5 text-sm font-heading font-bold text-sweet-error">
            <AlertIcon className="size-5 shrink-0" />
            <span>
              Sesi akan otomatis selesai dalam {secondsLeft} detik karena tidak
              ada aktivitas.
            </span>
          </div>
          <Button variant="surface" size="md" onClick={resetTimer}>
            Tetap di Sini
          </Button>
        </div>
      )}

      {/* Top Header & Segmented View Mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl w-full mx-auto">
        <div>
          <h1
            id="preview-heading"
            className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center gap-2"
          >
            <span>YOUR MEMORIES</span>
            <HeartIcon className="size-6 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs md:text-sm text-sweet-muted">
            {activeTemplate?.name || "Sweet Strip"} • Frame{" "}
            {activeTheme?.name || "Sweet Pink"}
          </p>
        </div>

        {/* Accessible Segmented Toggle Buttons using aria-pressed */}
        <div
          role="group"
          aria-label="Mode tampilan preview"
          className="inline-flex items-center p-1.5 rounded-full bg-sweet-surface border-2 border-sweet-border shadow-sweet gap-1"
        >
          {(
            [
              { id: "composite", label: "Hasil Cetak" },
              { id: "slideshow", label: "Slideshow" },
              { id: "originals", label: "Foto Asli" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={viewTab === tab.id}
              onClick={() => setViewTab(tab.id)}
              className={`min-h-[42px] px-4 py-1.5 rounded-full font-heading font-bold text-xs transition-all ${
                viewTab === tab.id
                  ? "bg-sweet-primary text-sweet-text shadow-sm"
                  : "text-sweet-muted hover:text-sweet-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="relative flex-1 min-h-[300px] max-w-5xl w-full mx-auto my-2.5 flex items-center justify-center">
        <Card
          variant="surface"
          padding="sm"
          className="relative w-full h-full max-h-[60dvh] flex flex-col items-center justify-center overflow-hidden bg-sweet-bg/70"
        >
          {isBusy && (
            <div className="absolute inset-0 bg-sweet-surface/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
              <SpinnerIcon className="size-10 text-sweet-primaryStrong" />
              <p className="font-heading font-bold text-base text-sweet-text">
                Memperbarui Komposisi Foto...
              </p>
            </div>
          )}

          {viewTab === "composite" && (
            <div className="h-full flex items-center justify-center p-2">
              {compositeUrl ? (
                <img
                  src={compositeUrl}
                  alt="Hasil akhir komposisi photostrip siap cetak"
                  className="max-h-[54dvh] w-auto object-contain rounded-2xl shadow-sweetLg border border-sweet-border"
                />
              ) : (
                <p className="text-sm text-sweet-muted">
                  Memuat hasil komposisi foto...
                </p>
              )}
            </div>
          )}

          {viewTab === "slideshow" && session.photos.length > 0 && (
            <div className="relative h-full flex flex-col items-center justify-center gap-3 p-2">
              <img
                src={resolveStorageUrl(
                  session.photos[slideIndex]?.preview_url ||
                    session.photos[slideIndex]?.thumbnail_url ||
                    session.photos[slideIndex]?.original_url
                )}
                alt={`Slideshow pose ke-${slideIndex + 1}`}
                className="max-h-[44dvh] w-auto object-contain rounded-2xl shadow-sweetLg border-2 border-sweet-primary"
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="surface"
                  size="md"
                  onClick={() => setSlidePaused((p) => !p)}
                  leftIcon={
                    slidePaused ? (
                      <PlayIcon className="size-4" />
                    ) : (
                      <PauseIcon className="size-4" />
                    )
                  }
                >
                  {slidePaused ? "Putar Slideshow" : "Jeda Slideshow"}
                </Button>
                <StatusBadge tone="pink">
                  Pose {slideIndex + 1} / {session.photos.length}
                </StatusBadge>
              </div>
            </div>
          )}

          {viewTab === "originals" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2 max-h-[52dvh] overflow-y-auto kiosk-scroll">
              {session.photos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl overflow-hidden border-2 border-sweet-border bg-white shadow-sm"
                >
                  <img
                    src={resolveStorageUrl(
                      p.preview_url || p.thumbnail_url || p.original_url
                    )}
                    alt={`Foto asli pose ke-${p.index}`}
                    className="w-full aspect-[3/2] object-cover"
                  />
                  <div className="px-3 py-1.5 text-xs font-heading font-bold text-sweet-text text-center">
                    Pose #{p.index}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {shareToast && (
          <div
            role="status"
            className="absolute bottom-4 px-5 py-2.5 rounded-full bg-sweet-success text-white font-heading font-bold text-xs shadow-sweetLg"
          >
            {shareToast}
          </div>
        )}
      </div>

      {/* Bottom Floating Action Bar (Section 3.G: [ CHANGE FRAME ]  [ PRINT! ]) */}
      <div className="max-w-5xl w-full mx-auto bg-sweet-surface/95 border-2 border-sweet-border rounded-full px-4 py-2.5 shadow-sweetLg flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            disabled={isBusy}
            leftIcon={<PaletteIcon className="size-4" />}
            onClick={onOpenChangeFrame}
            className="min-h-[52px]"
          >
            CHANGE FRAME
          </Button>

          <Button
            variant="surface"
            size="md"
            disabled={isBusy}
            leftIcon={<QrIcon className="size-4" />}
            onClick={() => setQrOpen(true)}
            className="min-h-[52px]"
          >
            Kode QR & Bagikan
          </Button>
        </div>

        {/* Copies Stepper + Primary PRINT! + Finish Without Print */}
        <div className="flex items-center gap-2.5">
          <div
            role="group"
            aria-label="Jumlah cetakan"
            className="inline-flex items-center gap-1.5 bg-sweet-bg px-2.5 py-1 rounded-full border-2 border-sweet-border"
          >
            <button
              type="button"
              aria-label="Kurangi jumlah cetakan"
              disabled={copies <= 1 || isBusy}
              onClick={() => setCopies((c) => Math.max(1, c - 1))}
              className="size-9 rounded-full bg-sweet-surface hover:bg-sweet-blush disabled:opacity-40 flex items-center justify-center text-sweet-text border border-sweet-border"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <span className="px-1.5 font-heading font-extrabold text-xs text-sweet-text min-w-[58px] text-center">
              {copies} Cetak
            </span>
            <button
              type="button"
              aria-label="Tambah jumlah cetakan"
              disabled={copies >= 5 || isBusy}
              onClick={() => setCopies((c) => Math.min(5, c + 1))}
              className="size-9 rounded-full bg-sweet-surface hover:bg-sweet-blush disabled:opacity-40 flex items-center justify-center text-sweet-text border border-sweet-border"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>

          <Button
            variant="primary"
            size="xl"
            loading={isBusy}
            disabled={isBusy}
            leftIcon={<PrinterIcon className="size-5 text-sweet-text" />}
            onClick={() => onPrint(copies)}
            className="min-h-[64px] px-7 text-lg border-sweet-primaryStrong shadow-sweetLg"
          >
            PRINT!
          </Button>

          <Button
            variant="ghost"
            size="md"
            disabled={isBusy}
            onClick={onFinishWithoutPrint}
          >
            Selesai
          </Button>
        </div>
      </div>

      <QrDialog
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        imageUrl={rawCompositeUrl}
        sessionId={session.session_id}
        onDownloadOrShare={handleShareOrDownload}
      />
    </section>
  );
}
