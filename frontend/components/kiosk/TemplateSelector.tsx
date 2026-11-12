"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CustomFilterPreset,
  FrameThemeOption,
  SessionDetail,
  TemplateOption,
} from "@/types/photobooth";
import {
  DEFAULT_AR_PRESETS,
  DEFAULT_STICKER_OPTIONS,
  PHOTO_FILTERS,
  buildFilterCssFromParams,
} from "@/lib/defaults";
import { inkFor } from "@/lib/color";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
import { LayoutMock } from "@/components/LayoutMock";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BowIcon,
  CheckIcon,
  FlowerIcon,
  HeartIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/icons";

interface TemplateSelectorProps {
  session: SessionDetail;
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  isBusy: boolean;
  onApplyAndContinue: (opts: {
    templateId: string;
    frameColor: string;
    filterName: string;
    stickerId?: string;
    arPresetId?: string;
    customText?: string;
  }) => Promise<void>;
}

export function TemplateSelector({
  session,
  templates,
  frameThemes,
  isBusy,
  onApplyAndContinue,
}: TemplateSelectorProps) {
  const selectedPhotos = useMemo(() => {
    if (session.selected_photo_ids && session.selected_photo_ids.length > 0) {
      const mapped = session.selected_photo_ids
        .map((id) => session.photos.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      if (mapped.length > 0) return mapped;
    }
    return session.photos;
  }, [session.photos, session.selected_photo_ids]);

  const compatibleTemplates = templates.filter(
    (t) => t.photos_required === selectedPhotos.length
  );
  const displayTemplates =
    compatibleTemplates.length > 0 ? compatibleTemplates : templates;

  const [draftTemplateId, setDraftTemplateId] = useState<string>(
    session.template_id || displayTemplates[0]?.id || "retro_strip_4"
  );
  const [draftFrameColor, setDraftFrameColor] = useState<string>(
    session.frame_color || "pink"
  );
  const [draftFilter, setDraftFilter] = useState<string>(
    session.filter_name || "original"
  );
  const [draftStickerId, setDraftStickerId] = useState<string>(
    session.sticker_id || "sweet_bows"
  );
  const [draftArPreset, setDraftArPreset] = useState<string>(
    session.ar_preset_id || "none"
  );
  const [draftCaption, setDraftCaption] = useState<string>(
    session.customer_name || ""
  );
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

  const availableFilters = useMemo(() => {
    const customOptions = customPresets
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        desc: "Preset Studio",
        css: buildFilterCssFromParams(
          p.params || {
            brightness: p.brightness,
            contrast: p.contrast,
            saturation: p.saturation,
            temperature: p.temperature,
            tint: p.tint,
            smoothness: p.smoothness,
          }
        ),
      }));
    return [...PHOTO_FILTERS, ...customOptions];
  }, [customPresets]);

  const [previewMode, setPreviewMode] = useState<"frame" | "pose">("frame");
  const [aiPosePreviewUrl, setAiPosePreviewUrl] = useState<string | null>(null);
  const [aiPoseLoading, setAiPoseLoading] = useState<boolean>(false);

  const activeTemplate =
    displayTemplates.find((t) => t.id === draftTemplateId) ||
    displayTemplates[0];

  useEffect(() => {
    if (previewMode !== "pose") return;
    let cancelled = false;
    setAiPoseLoading(true);
    photoboothApi
      .previewAr({
        session_id: session.session_id,
        photo_id: selectedPhotos[0]?.id,
        preset_id: draftArPreset,
        filter_name: draftFilter,
        inherit_color_grading: false,
      })
      .then((res) => {
        if (!cancelled) {
          setAiPosePreviewUrl(
            resolveStorageUrl(res.rendered_image_url, Date.now())
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAiPosePreviewUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAiPoseLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    previewMode,
    draftArPreset,
    draftFilter,
    session.session_id,
    selectedPhotos,
  ]);

  const [configTab, setConfigTab] = useState<"layout" | "filter" | "ar">("layout");

  const handleSelectTemplateCard = (tpl: TemplateOption) => {
    setDraftTemplateId(tpl.id);
    if (tpl.default_frame) {
      setDraftFrameColor(tpl.default_frame);
    }
  };

  return (
    <section
      aria-labelledby="vibe-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-6 py-3 overflow-hidden animate-screen-fade"
    >
      {/* Top Header */}
      <div className="text-center space-y-0.5 max-w-2xl mx-auto shrink-0">
        <h1
          id="vibe-heading"
          className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center justify-center gap-2"
        >
          <span>PICK YOUR VIBE</span>
          <SparkleIcon className="size-6 text-sweet-primaryStrong" />
        </h1>
        <p className="text-xs md:text-sm text-sweet-muted mx-auto">
          Kustomisasi layout, warna frame, filter, dan stiker wajah AR dalam satu layar penuh
        </p>
      </div>

      {/* Main 2-Column Zero-Scroll Studio Configurator */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl w-full mx-auto my-2 items-stretch">
        {/* Left Column (7 Cols): Tabbed Studio Configurator */}
        <div className="lg:col-span-7 flex flex-col justify-between min-h-0 animate-container-left">
          <Card
            variant="glass"
            padding="sm"
            className="flex-1 min-h-0 flex flex-col justify-between gap-3 shadow-sweet-card"
          >
            {/* Segmented 3-Step Tab Bar */}
            <div
              role="tablist"
              aria-label="Tahap kustomisasi frame dan efek"
              className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-sweet-bg border-2 border-[#F3E6EE] shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={configTab === "layout"}
                onClick={() => {
                  setConfigTab("layout");
                  setPreviewMode("frame");
                }}
                className={`min-h-[46px] px-3 py-2 rounded-xl font-heading font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  configTab === "layout"
                    ? "bg-[#FFF0F5] text-[#3F3D56] border-2 border-[#DB2777] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text border-2 border-transparent"
                }`}
              >
                <FlowerIcon className="size-4 text-sweet-primaryStrong shrink-0" />
                <span className="truncate">1. Layout & Warna</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={configTab === "filter"}
                onClick={() => {
                  setConfigTab("filter");
                  setPreviewMode("frame");
                }}
                className={`min-h-[46px] px-3 py-2 rounded-xl font-heading font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  configTab === "filter"
                    ? "bg-[#FFF0F5] text-[#3F3D56] border-2 border-[#DB2777] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text border-2 border-transparent"
                }`}
              >
                <SparkleIcon className="size-4 text-sweet-primaryStrong shrink-0" />
                <span className="truncate">2. Filter & Dekorasi</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={configTab === "ar"}
                onClick={() => {
                  setConfigTab("ar");
                  setPreviewMode("pose");
                }}
                className={`min-h-[46px] px-3 py-2 rounded-xl font-heading font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  configTab === "ar"
                    ? "bg-[#FFF0F5] text-[#3F3D56] border-2 border-[#DB2777] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text border-2 border-transparent"
                }`}
              >
                <BowIcon className="size-4 text-sweet-primaryStrong shrink-0" />
                <span className="truncate">3. AR Stiker Wajah</span>
              </button>
            </div>

            {/* TAB 1: Layout & Frame Color Swatches */}
            {configTab === "layout" && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 animate-screen-fade">
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between shrink-0">
                    <h2 className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                      <FlowerIcon className="size-4 text-sweet-primaryStrong" />
                      <span>Pilih Desain Cetak ({selectedPhotos.length} Pose Terpilih)</span>
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#FBCFE8] text-xs font-heading font-extrabold text-[#3F3D56]">
                      {activeTemplate?.aspect_label || "2x6 Strip"}
                    </span>
                  </div>

                  <div
                    role="group"
                    aria-label="Pilihan template desain foto"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 min-h-0 overflow-y-auto kiosk-scroll pr-1"
                  >
                    {displayTemplates.map((tpl, idx) => {
                      const isSelected = tpl.id === draftTemplateId;
                      const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleSelectTemplateCard(tpl)}
                          className={`p-2.5 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-between gap-1.5 active:scale-95 stagger-item ${staggerClass} ${
                            isSelected
                              ? "bg-[#FFF0F5] border-[#DB2777] shadow-sweet ring-2 ring-[#FBCFE8]"
                              : "bg-white/90 hover:bg-white border-white"
                          }`}
                        >
                          <div className="h-24 flex items-center justify-center py-0.5">
                            <LayoutMock
                              template={tpl}
                              frameColorId={
                                isSelected
                                  ? draftFrameColor
                                  : tpl.default_frame || draftFrameColor
                              }
                              frameThemes={frameThemes}
                              photos={selectedPhotos}
                              captionText={draftCaption}
                              filterId={draftFilter}
                              stickerId={draftStickerId}
                              arPresetId={draftArPreset}
                              className="h-22 w-auto"
                            />
                          </div>
                          <div className="w-full">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-heading font-extrabold text-xs text-sweet-text truncate">
                                {tpl.name}
                              </span>
                              {isSelected && (
                                <CheckIcon className="size-3.5 text-sweet-primaryStrong shrink-0 stroke-[3]" />
                              )}
                            </div>
                            <span className="text-[10px] font-heading font-semibold text-sweet-muted block">
                              {tpl.aspect_label || `${tpl.photos_required} Pose`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Swatches Bar */}
                <div className="p-3 rounded-2xl bg-white/90 border border-[#F3E6EE] space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                      <HeartIcon className="size-4 text-sweet-primaryStrong" />
                      <span>Pilih Warna Frame:</span>
                    </h3>
                    <span className="text-xs font-heading font-extrabold text-sweet-primaryStrong">
                      {frameThemes.find((t) => t.id === draftFrameColor)?.name || "Sweet Pink"}
                    </span>
                  </div>

                  <div
                    role="group"
                    aria-label="Pilihan warna frame"
                    className="flex flex-wrap gap-2"
                  >
                    {frameThemes.map((theme) => {
                      const isSelected = theme.id === draftFrameColor;
                      const checkColor = inkFor(theme.hex);
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setDraftFrameColor(theme.id)}
                          className={`min-h-[44px] px-3 py-1.5 rounded-full border-2 flex items-center gap-2 transition-all active:scale-95 ${
                            isSelected
                              ? "bg-[#FFF0F5] border-[#DB2777] shadow-xs ring-2 ring-[#FBCFE8]"
                              : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            style={{ backgroundColor: theme.hex, color: checkColor }}
                            className="size-5 rounded-full border border-black/15 flex items-center justify-center shadow-inner"
                          >
                            {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                          </span>
                          <span className="font-heading font-extrabold text-xs text-sweet-text">
                            {theme.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Filter Warna & Stiker Dekorasi Frame */}
            {configTab === "filter" && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 animate-screen-fade">
                <div className="p-3.5 rounded-2xl bg-white/90 border border-[#F3E6EE] space-y-2.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-2">
                      <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                      <span>Filter Warna & Beauty Cam ({availableFilters.length} Pilihan)</span>
                    </h2>
                    <span className="text-xs font-heading font-extrabold text-sweet-primaryStrong">
                      {availableFilters.find((f) => f.id === draftFilter)?.name || "Natural"}
                    </span>
                  </div>
                  <div
                    role="group"
                    aria-label="Pilihan filter foto"
                    className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                  >
                    {availableFilters.map((flt, idx) => {
                      const isSelected = flt.id === draftFilter;
                      const staggerClass = `stagger-${Math.min((idx % 6) + 1, 6)}`;
                      return (
                        <button
                          key={flt.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setDraftFilter(flt.id)}
                          className={`min-h-[48px] px-3 py-2 rounded-2xl border-2 font-heading font-extrabold text-xs transition-all flex items-center justify-between gap-1 active:scale-95 stagger-item ${staggerClass} ${
                            isSelected
                              ? "bg-[#DCD6F7] border-[#9E8CE0] text-sweet-text shadow-xs"
                              : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-text"
                          }`}
                        >
                          <span className="truncate">{flt.name}</span>
                          {isSelected && <CheckIcon className="size-3.5 text-[#3F3D56] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/90 border border-[#F3E6EE] space-y-2.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-2">
                      <BowIcon className="size-4 text-sweet-primaryStrong" />
                      <span>Stiker Dekorasi Sudut Frame</span>
                    </h3>
                    <span className="text-xs font-heading font-extrabold text-sweet-primaryStrong">
                      {DEFAULT_STICKER_OPTIONS.find((s) => s.id === draftStickerId)?.name || "Sweet Bows"}
                    </span>
                  </div>
                  <div
                    role="group"
                    aria-label="Pilihan stiker dekorasi frame"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {DEFAULT_STICKER_OPTIONS.map((stk) => {
                      const isSelected = stk.id === draftStickerId;
                      return (
                        <button
                          key={stk.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setDraftStickerId(stk.id)}
                          className={`min-h-[46px] px-3.5 py-2 rounded-2xl border-2 font-heading font-extrabold text-xs transition-all flex items-center justify-between gap-1.5 active:scale-95 ${
                            isSelected
                              ? "bg-[#FFF0F5] border-[#DB2777] text-sweet-text shadow-xs"
                              : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-text"
                          }`}
                        >
                          <span className="truncate">{stk.name}</span>
                          {isSelected && <CheckIcon className="size-3.5 text-sweet-primaryStrong shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AR Face & Sticker Overlays */}
            {configTab === "ar" && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 animate-screen-fade">
                <div className="p-3.5 rounded-2xl bg-white/90 border border-[#F3E6EE] space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-2">
                      <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                      <span>AR Face & Sticker Overlays (AI Face Landmarks)</span>
                    </h2>
                    <span className="text-[11px] font-heading font-bold text-sweet-primaryStrong bg-[#FFF0F5] px-2.5 py-0.5 rounded-full border border-[#FBCFE8]">
                      Deteksi Wajah Otomatis
                    </span>
                  </div>

                  <div
                    role="group"
                    aria-label="Pilihan efek AR wajah dan stiker"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-auto"
                  >
                    {DEFAULT_AR_PRESETS.map((preset, idx) => {
                      const isSelected = preset.id === draftArPreset;
                      const staggerClass = `stagger-${Math.min((idx % 6) + 1, 6)}`;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setDraftArPreset(preset.id);
                            setPreviewMode("pose");
                          }}
                          className={`min-h-[58px] p-2.5 rounded-2xl border-2 text-left flex items-center gap-2.5 transition-all active:scale-95 stagger-item ${staggerClass} ${
                            isSelected
                              ? "bg-[#FFF0F5] border-[#DB2777] text-sweet-text ring-2 ring-[#FBCFE8] shadow-xs"
                              : "bg-white hover:bg-[#FFF5F7] border-[#F3E6EE] text-sweet-text"
                          }`}
                        >
                          <span
                            className="px-2 py-1 rounded-lg bg-[#FFF0F5] border border-[#FBCFE8] text-[10px] font-heading font-extrabold text-sweet-primaryStrong shrink-0"
                            aria-hidden="true"
                          >
                            {preset.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="font-heading font-extrabold text-xs truncate">
                              {preset.name}
                            </div>
                            <div className="text-[10px] text-sweet-muted truncate">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] font-heading font-semibold text-sweet-muted">
                    Stiker wajah AR dipasang secara presisi mengikuti posisi kepala, pipi, dan mata pada setiap pose.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (5 Cols): 3D Antigravity Live Preview Stage + Caption + Confirm CTA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 min-h-0 animate-container-right">
          <Card
            variant="glass"
            padding="sm"
            className="flex-1 min-h-0 flex flex-col items-center justify-between text-center gap-2.5 shadow-sweet-card"
          >
            <div className="inline-flex items-center p-1 rounded-2xl bg-sweet-bg border border-[#DCD6F7] gap-1 w-full shrink-0">
              <button
                type="button"
                aria-pressed={previewMode === "frame"}
                onClick={() => setPreviewMode("frame")}
                className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl text-xs font-heading font-extrabold transition-all ${
                  previewMode === "frame"
                    ? "bg-[#F3E8FF] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Pratinjau Frame Strip
              </button>
              <button
                type="button"
                aria-pressed={previewMode === "pose"}
                onClick={() => setPreviewMode("pose")}
                className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl text-xs font-heading font-extrabold transition-all ${
                  previewMode === "pose"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Pratinjau AR & Filter
              </button>
            </div>

            {/* 3D Perspective Stage with Spring Swap Motion */}
            <div className="flex-1 min-h-0 flex items-center justify-center py-1 w-full antigravity-stage">
              {previewMode === "frame" ? (
                activeTemplate && (
                  <div
                    key={`${draftTemplateId}-${draftFrameColor}-${draftFilter}-${draftStickerId}`}
                    className="animate-spring-swap flex items-center justify-center h-full"
                  >
                    <LayoutMock
                      template={activeTemplate}
                      frameColorId={draftFrameColor}
                      frameThemes={frameThemes}
                      photos={selectedPhotos}
                      captionText={draftCaption}
                      filterId={draftFilter}
                      stickerId={draftStickerId}
                      arPresetId={draftArPreset}
                      className="max-h-[250px] xl:max-h-[280px] w-auto shadow-sweet-strip rounded-xl"
                    />
                  </div>
                )
              ) : (
                <div
                  key={`${draftArPreset}-${draftFilter}`}
                  className="relative h-full max-h-[260px] w-full flex items-center justify-center rounded-2xl overflow-hidden bg-sweet-blush/60 border-2 border-[#F3E6EE] animate-spring-swap"
                >
                  {aiPoseLoading && (
                    <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center gap-2">
                      <SpinnerIcon className="size-7 text-sweet-primaryStrong animate-spin" />
                      <span className="text-[11px] font-heading font-bold text-sweet-text">
                        Mendeteksi Wajah & Filter...
                      </span>
                    </div>
                  )}
                  {aiPosePreviewUrl ? (
                    <img
                      src={aiPosePreviewUrl}
                      alt="Pratinjau Stiker AR & Filter Pose #1"
                      width={600}
                      height={400}
                      className="h-full w-full object-contain rounded-xl"
                    />
                  ) : (
                    <span className="text-xs font-heading font-semibold text-sweet-muted px-4">
                      Pilih Filter atau Stiker Wajah untuk melihat pratinjau pada Pose #1
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="w-full text-left shrink-0">
              <label
                htmlFor="vibe-caption-input"
                className="block font-heading font-extrabold text-xs text-sweet-text mb-1"
              >
                Catatan / Nama di Frame:
              </label>
              <input
                id="vibe-caption-input"
                name="custom_caption"
                type="text"
                maxLength={24}
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                placeholder="SWEET STUDIO"
                className="w-full min-h-[44px] px-3.5 py-1.5 rounded-2xl bg-white border-2 border-[#F3E6EE] text-sweet-text text-xs sm:text-sm font-heading font-semibold focus:border-[#DB2777] transition-colors"
              />
            </div>
          </Card>

          <Button
            variant="strong"
            size="xl"
            loading={isBusy}
            onClick={() =>
              onApplyAndContinue({
                templateId: draftTemplateId,
                frameColor: draftFrameColor,
                filterName: draftFilter,
                stickerId: draftStickerId,
                arPresetId: draftArPreset,
                customText: draftCaption.trim() || undefined,
              })
            }
            rightIcon={<HeartIcon className="size-6 text-white" />}
            className="w-full min-h-[62px] text-lg sm:text-xl font-extrabold shadow-sweetLg animate-pulse-cta shrink-0"
          >
            CHOOSE THIS FRAME
          </Button>
        </div>
      </div>
    </section>
  );
}
