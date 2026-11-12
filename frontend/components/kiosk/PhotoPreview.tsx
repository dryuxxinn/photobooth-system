"use client";

import React, { useEffect, useState } from "react";
import {
  CustomFilterPreset,
  FrameThemeOption,
  SessionDetail,
  TemplateOption,
} from "@/types/photobooth";
import {
  PREVIEW_IDLE_SECONDS,
  PREVIEW_IDLE_WARN_SECONDS,
} from "@/lib/config";
import { DEFAULT_AR_PRESETS, PHOTO_FILTERS } from "@/lib/defaults";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
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
  RefreshIcon,
  SpinnerIcon,
} from "@/components/icons";

interface PhotoPreviewProps {
  session: SessionDetail;
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  isBusy: boolean;
  imageVersion: number;
  onOpenChangeFrame: () => void;
  onBackToPhotoSelection?: () => void;
  onQuickCustomize?: (opts: {
    templateId: string;
    frameColor: string;
    filterName: string;
    stickerId?: string;
    arPresetId?: string;
    customText?: string;
  }) => Promise<void>;
  onPrint: (copies: number) => Promise<void>;
  onFinishWithoutPrint: () => Promise<void>;
}

type ViewTab = "composite" | "gif" | "slideshow" | "originals";

export function PhotoPreview({
  session,
  templates,
  frameThemes,
  isBusy,
  imageVersion,
  onOpenChangeFrame,
  onBackToPhotoSelection,
  onQuickCustomize,
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

  const [customPresets, setCustomPresets] = useState<CustomFilterPreset[]>([]);

  useEffect(() => {
    photoboothApi
      .getCustomFilters()
      .then((res) => {
        if (res?.presets && Array.isArray(res.presets)) {
          setCustomPresets(res.presets);
        }
      })
      .catch(() => null);
  }, []);

  const availableFilters = React.useMemo(() => {
    const customOptions = customPresets
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        desc: "Preset Studio",
        css: "none",
      }));
    return [...PHOTO_FILTERS, ...customOptions];
  }, [customPresets]);

  const compositeUrl = resolveStorageUrl(
    session.processed_image_url,
    imageVersion
  );
  const rawCompositeUrl = resolveStorageUrl(session.processed_image_url);
  const gifUrl = resolveStorageUrl(session.gif_url, imageVersion);
  const rawGifUrl = resolveStorageUrl(session.gif_url);

  const activeTemplate = templates.find((t) => t.id === session.template_id);
  const activeTheme = frameThemes.find((f) => f.id === session.frame_color);
  const activeFilter = availableFilters.find(
    (f) => f.id === (session.filter_name || "original")
  );
  const activeArPreset = DEFAULT_AR_PRESETS.find(
    (p) => p.id === (session.ar_preset_id || "none")
  );

  const handleQuickFilterOrAr = async (opts: {
    filterName?: string;
    arPresetId?: string;
  }) => {
    if (!onQuickCustomize || isBusy) return;
    await onQuickCustomize({
      templateId: session.template_id || "retro_strip_4",
      frameColor: session.frame_color || "pink",
      filterName: opts.filterName ?? session.filter_name ?? "original",
      stickerId: session.sticker_id || "sweet_bows",
      arPresetId: opts.arPresetId ?? session.ar_preset_id ?? "none",
      customText: session.customer_name || undefined,
    });
  };

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
          text: "Kenangan manis dari Sweet Studio Photobooth",
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

  const [quickTab, setQuickTab] = useState<"filter" | "ar">("filter");

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-8 py-3 overflow-hidden animate-screen-fade relative"
    >
      {/* Idle Timeout Warning Banner */}
      {secondsLeft <= PREVIEW_IDLE_WARN_SECONDS && (
        <div
          role="alert"
          className="max-w-4xl w-full mx-auto mb-2 px-5 py-2 rounded-full bg-[#FCECEE] border-2 border-[#EABAC0] flex items-center justify-between gap-4 shadow-sweet z-30 shrink-0"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-heading font-bold text-sweet-error">
            <AlertIcon className="size-4 shrink-0" />
            <span>
              Sesi otomatis selesai dalam {secondsLeft} detik karena tidak ada aktivitas.
            </span>
          </div>
          <Button variant="surface" size="sm" onClick={resetTimer}>
            Tetap di Sini
          </Button>
        </div>
      )}

      {/* Main 2-Column Side-by-Side Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center max-w-7xl w-full mx-auto my-auto py-1 z-10 flex-1 min-h-0">
        {/* Kolom Kiri: Live Photo Strip Preview in 3D Antigravity Stage */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center animate-container-left antigravity-stage">
          <div
            key={`${viewTab}-${imageVersion}`}
            className="relative group p-3.5 sm:p-4 rounded-[2.5rem] bg-white border-2 border-[#F3E6EE] shadow-sweet-strip flex flex-col items-center justify-center transition-all duration-300 animate-spring-swap"
          >
            {isBusy && (
              <div className="absolute inset-0 bg-sweet-surface/90 z-20 rounded-[2.5rem] flex flex-col items-center justify-center gap-3">
                <SpinnerIcon className="size-10 text-sweet-primaryStrong animate-spin" />
                <p className="font-heading font-extrabold text-sm text-sweet-text mx-auto">
                  Memperbarui Komposisi Foto...
                </p>
              </div>
            )}

            {/* View Tab Content */}
            {viewTab === "composite" && (
              <div className="flex items-center justify-center">
                {compositeUrl ? (
                  <img
                    src={compositeUrl}
                    alt="Hasil akhir komposisi photostrip siap cetak"
                    width={600}
                    height={900}
                    className="max-h-[70dvh] w-auto object-contain rounded-2xl shadow-sweet border border-sweet-border"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-sm font-heading font-bold text-sweet-muted mx-auto">
                      Memuat hasil komposisi foto...
                    </p>
                  </div>
                )}
              </div>
            )}

            {viewTab === "gif" && (
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                {gifUrl ? (
                  <>
                    <img
                      src={gifUrl}
                      alt="Animasi Boomerang GIF sesi Sweet Studio"
                      width={600}
                      height={400}
                      className="max-h-[62dvh] w-auto object-contain rounded-2xl shadow-sweet border-2 border-sweet-primary"
                    />
                    <StatusBadge tone="pink">
                      Boomerang GIF Otomatis • Siap Unduh via QR
                    </StatusBadge>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-sm font-heading font-bold text-sweet-muted mx-auto">
                      Menyiapkan animasi Boomerang GIF...
                    </p>
                  </div>
                )}
              </div>
            )}

            {viewTab === "slideshow" && session.photos.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <img
                  src={resolveStorageUrl(
                    session.photos[slideIndex]?.preview_url ||
                      session.photos[slideIndex]?.thumbnail_url ||
                      session.photos[slideIndex]?.original_url
                  )}
                  alt={`Slideshow pose ke-${slideIndex + 1}`}
                  width={600}
                  height={400}
                  className="max-h-[60dvh] w-auto object-contain rounded-2xl shadow-sweet border-2 border-sweet-primary"
                />
                <div className="flex items-center gap-2.5 pt-1">
                  <Button
                    variant="surface"
                    size="sm"
                    onClick={() => setSlidePaused((p) => !p)}
                    leftIcon={
                      slidePaused ? (
                        <PlayIcon className="size-3.5" />
                      ) : (
                        <PauseIcon className="size-3.5" />
                      )
                    }
                  >
                    {slidePaused ? "Putar" : "Jeda"}
                  </Button>
                  <StatusBadge tone="pink">
                    Pose {slideIndex + 1} / {session.photos.length}
                  </StatusBadge>
                </div>
              </div>
            )}

            {viewTab === "originals" && (
              <div className="grid grid-cols-2 gap-2.5 p-1 max-h-[66dvh] overflow-y-auto kiosk-scroll">
                {session.photos.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl overflow-hidden border-2 border-sweet-border bg-white shadow-xs"
                  >
                    <img
                      src={resolveStorageUrl(
                        p.preview_url || p.thumbnail_url || p.original_url
                      )}
                      alt={`Foto asli pose ke-${p.index}`}
                      width={600}
                      height={400}
                      className="w-full aspect-[3/2] object-cover"
                    />
                    <div className="px-2 py-1 text-[11px] font-heading font-bold text-sweet-text text-center bg-sweet-surface">
                      Pose #{p.index}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Corner Decorative Heart Pin Badge */}
            <div className="absolute -top-2 -right-2 size-9 rounded-full bg-[#DB2777] flex items-center justify-center text-white shadow-sweet">
              <HeartIcon className="size-4 fill-white" />
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Panel Kontrol & Pengaturan Cetak (Glassmorphic Action Card) */}
        <div className="lg:col-span-7 flex flex-col justify-center animate-container-right">
          <Card
            variant="glass"
            padding="md"
            className="space-y-3.5 shadow-sweet-card"
          >
            {/* Header: Judul & Info Frame */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/60 pb-2.5">
              <div>
                <h1
                  id="preview-heading"
                  className="font-heading font-extrabold text-2xl sm:text-3xl text-[#3F3D56] flex items-center gap-2"
                >
                  <span>YOUR MEMORIES</span>
                  <HeartIcon className="size-6 text-sweet-primaryStrong" />
                </h1>
                <p className="text-xs sm:text-sm text-sweet-muted font-heading font-semibold">
                  {activeTemplate?.name || "Sweet Strip"} • Frame{" "}
                  {activeTheme?.name || "Sweet Pink"} •{" "}
                  {activeFilter?.name || "Original"}
                  {activeArPreset && activeArPreset.id !== "none"
                    ? ` • ${activeArPreset.emoji} ${activeArPreset.name}`
                    : ""}
                </p>
              </div>

              {/* Segmented Mode Selector */}
              <div
                role="group"
                aria-label="Mode tampilan preview"
                className="inline-flex flex-wrap items-center p-1 rounded-2xl bg-sweet-bg border border-[#F3E6EE] gap-1"
              >
                {(
                  [
                    { id: "composite", label: "Hasil Cetak" },
                    { id: "gif", label: "Boomerang GIF" },
                    { id: "slideshow", label: "Slideshow" },
                    { id: "originals", label: "Foto Asli" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={viewTab === tab.id}
                    onClick={() => setViewTab(tab.id)}
                    className={`min-h-[44px] px-3 rounded-xl font-heading font-bold text-xs transition-all active:scale-95 ${
                      viewTab === tab.id
                        ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                        : "text-sweet-muted hover:text-sweet-text"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tombol Alat / Tools Row */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {onBackToPhotoSelection && (
                  <Button
                    variant="surface"
                    size="md"
                    disabled={isBusy}
                    leftIcon={<RefreshIcon className="size-4 text-sweet-muted" />}
                    onClick={onBackToPhotoSelection}
                    className="min-h-[48px] text-xs font-heading font-bold rounded-2xl border-2 border-white/80 active:scale-95 transition-all"
                  >
                    PILIH ULANG FOTO
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="md"
                  disabled={isBusy}
                  leftIcon={<PaletteIcon className="size-4 text-sweet-primaryStrong" />}
                  onClick={onOpenChangeFrame}
                  className="min-h-[48px] text-xs font-heading font-bold rounded-2xl border-2 border-white/80 active:scale-95 transition-all"
                >
                  GANTI FRAME
                </Button>

                <Button
                  variant="surface"
                  size="md"
                  disabled={isBusy}
                  leftIcon={<QrIcon className="size-4 text-sweet-primaryStrong" />}
                  onClick={() => setQrOpen(true)}
                  className="min-h-[48px] text-xs font-heading font-bold rounded-2xl border-2 border-white/80 active:scale-95 transition-all"
                >
                  KODE QR & SHARE
                </Button>
              </div>

              {/* Compact Tabbed Quick Filter & AR Switcher directly on Preview Screen */}
              {onQuickCustomize && (
                <div className="p-2.5 rounded-2xl bg-white/85 border border-[#F3E6EE] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      role="tablist"
                      aria-label="Kustomisasi cepat filter atau stiker AR"
                      className="inline-flex items-center p-1 rounded-xl bg-sweet-bg border border-[#F3E6EE] gap-1"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={quickTab === "filter"}
                        onClick={() => setQuickTab("filter")}
                        className={`min-h-[44px] px-3 py-1 rounded-lg text-xs font-heading font-extrabold transition-all ${
                          quickTab === "filter"
                            ? "bg-[#DCD6F7] text-[#3F3D56] shadow-xs"
                            : "text-sweet-muted hover:text-sweet-text"
                        }`}
                      >
                        Filter Cepat (10)
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={quickTab === "ar"}
                        onClick={() => setQuickTab("ar")}
                        className={`min-h-[44px] px-3 py-1 rounded-lg text-xs font-heading font-extrabold transition-all ${
                          quickTab === "ar"
                            ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                            : "text-sweet-muted hover:text-sweet-text"
                        }`}
                      >
                        AR Stiker Wajah (9)
                      </button>
                    </div>
                    <span className="text-[11px] font-heading font-bold text-sweet-primaryStrong hidden sm:inline">
                      {quickTab === "filter"
                        ? `Aktif: ${activeFilter?.name || "Natural"}`
                        : `Aktif: ${activeArPreset?.name || "Tanpa AR"}`}
                    </span>
                  </div>

                  {quickTab === "filter" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {availableFilters.map((flt) => {
                        const isSel =
                          (session.filter_name || "original") === flt.id;
                        return (
                          <button
                            key={flt.id}
                            type="button"
                            aria-pressed={isSel}
                            disabled={isBusy}
                            onClick={() =>
                              handleQuickFilterOrAr({ filterName: flt.id })
                            }
                            className={`min-h-[44px] px-2.5 py-1 rounded-xl text-[11px] font-heading font-extrabold border-2 transition-all truncate active:scale-95 ${
                              isSel
                                ? "bg-[#DCD6F7] border-[#9E8CE0] text-sweet-text shadow-xs"
                                : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-muted"
                            }`}
                          >
                            {flt.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {DEFAULT_AR_PRESETS.map((prs) => {
                        const isSel =
                          (session.ar_preset_id || "none") === prs.id;
                        return (
                          <button
                            key={prs.id}
                            type="button"
                            aria-pressed={isSel}
                            disabled={isBusy}
                            onClick={() =>
                              handleQuickFilterOrAr({ arPresetId: prs.id })
                            }
                            className={`min-h-[44px] px-2.5 py-1 rounded-xl text-[11px] font-heading font-extrabold border-2 transition-all truncate active:scale-95 ${
                              isSel
                                ? "bg-[#FFF0F5] border-[#DB2777] text-sweet-text shadow-xs"
                                : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-muted"
                            }`}
                          >
                            {prs.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print Section Box */}
            <div className="p-4 rounded-3xl bg-sweet-bg border border-[#F3E6EE] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-extrabold text-sm text-[#3F3D56]">
                  Jumlah Salinan Cetak
                </span>
                <div
                  role="group"
                  aria-label="Jumlah cetakan"
                  className="inline-flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-2xl border border-sweet-border"
                >
                  <button
                    type="button"
                    aria-label="Kurangi jumlah cetakan"
                    disabled={copies <= 1 || isBusy}
                    onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    className="size-11 rounded-xl bg-sweet-surface hover:bg-sweet-blush disabled:opacity-40 flex items-center justify-center text-sweet-text border border-sweet-border transition-colors"
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="font-heading font-extrabold text-sm text-sweet-text min-w-[68px] text-center">
                    {copies} Lembar
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah jumlah cetakan"
                    disabled={copies >= 5 || isBusy}
                    onClick={() => setCopies((c) => Math.min(5, c + 1))}
                    className="size-11 rounded-xl bg-sweet-surface hover:bg-sweet-blush disabled:opacity-40 flex items-center justify-center text-sweet-text border border-sweet-border transition-colors"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Big Pulsating Print Button */}
              <Button
                variant="strong"
                size="xl"
                loading={isBusy}
                disabled={isBusy}
                leftIcon={<PrinterIcon className="size-6 text-white" />}
                onClick={() => onPrint(copies)}
                className="w-full min-h-[66px] text-xl font-heading font-extrabold shadow-sweet-strip rounded-full animate-pulse-cta active:scale-95 transition-all duration-300"
              >
                PRINT SEKARANG!
              </Button>

              <div className="text-center pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={onFinishWithoutPrint}
                  className="text-xs font-heading font-semibold text-sweet-muted hover:text-sweet-text"
                >
                  Selesai tanpa cetak
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <QrDialog
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        imageUrl={rawCompositeUrl}
        gifUrl={rawGifUrl}
        sessionId={session.session_id}
        onDownloadOrShare={handleShareOrDownload}
      />
    </section>
  );
}
