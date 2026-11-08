"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FrameThemeOption,
  SessionDetail,
  TemplateOption,
} from "@/types/photobooth";
import { DEFAULT_STICKER_OPTIONS, PHOTO_FILTERS } from "@/lib/defaults";
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

const AR_PRESET_CHOICES = [
  { id: "none", name: "Tanpa AR", emoji: "✨", desc: "Foto natural tanpa stiker" },
  { id: "pink_bunny_sweet", name: "Pink Bunny", emoji: "🐰", desc: "Telinga kelinci & pipi cinta" },
  { id: "cute_glasses_blush", name: "Cute Glasses", emoji: "👓", desc: "Kacamata aesthetic & perona pipi" },
  { id: "kitty_whiskers", name: "Kitty Whiskers", emoji: "🐱", desc: "Telinga kucing & pita manis" },
  { id: "royal_princess", name: "Royal Princess", emoji: "👑", desc: "Mahkota emas & taburan hati" },
  { id: "sakura_fairy", name: "Sakura Fairy", emoji: "🌸", desc: "Pita pastel & kelopak sakura" },
];

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

  const handleSelectTemplateCard = (tpl: TemplateOption) => {
    setDraftTemplateId(tpl.id);
    if (tpl.default_frame) {
      setDraftFrameColor(tpl.default_frame);
    }
  };

  return (
    <section
      aria-labelledby="vibe-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-6 py-4 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Top Header */}
      <div className="text-center space-y-1 max-w-2xl mx-auto">
        <h1
          id="vibe-heading"
          className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center justify-center gap-2"
        >
          <span>PICK YOUR VIBE</span>
          <SparkleIcon className="size-6 text-sweet-primaryStrong" />
        </h1>
        <p className="text-xs md:text-sm text-sweet-muted">
          Pilih desain layout, tema warna frame, dan filter favoritmu sebelum
          dicetak
        </p>
      </div>

      {/* Main 2-Column Selector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl w-full mx-auto my-3 items-start">
        {/* Left: Composite Template Cards & Frame Themes */}
        <div className="lg:col-span-8 space-y-4 animate-container-left">
          {/* 1. Layout Template Cards with Real Composite Preview */}
          <Card variant="glass" padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
                <FlowerIcon className="size-4 text-sweet-primaryStrong" />
                <span>1. Pilih Desain & Ukuran Cetak ({selectedPhotos.length} Pose Terpilih)</span>
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#FBCFE8] text-xs font-heading font-extrabold text-[#3F3D56] shadow-xs">
                {activeTemplate?.aspect_label || "2x6 Strip"}
              </span>
            </div>

            <div
              role="group"
              aria-label="Pilihan template desain foto"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[310px] overflow-y-auto kiosk-scroll pr-1"
            >
              {displayTemplates.map((tpl) => {
                const isSelected = tpl.id === draftTemplateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectTemplateCard(tpl)}
                    className={`p-3 rounded-2xl border-3 text-left transition-all flex flex-col items-center gap-2 ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.02]"
                        : "bg-white/80 hover:bg-white border-white/90"
                    }`}
                  >
                    <div className="h-28 flex items-center justify-center">
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
                        className="h-28 w-auto"
                      />
                    </div>
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-heading font-extrabold text-xs text-sweet-text line-clamp-1">
                          {tpl.name}
                        </span>
                        {isSelected && (
                          <CheckIcon className="size-4 text-[#F472B6] shrink-0 stroke-[3]" />
                        )}
                      </div>
                      <span className="text-[11px] font-heading font-semibold text-sweet-muted block mt-0.5">
                        {tpl.aspect_label || `${tpl.photos_required} Pose`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 2. Frame Color Swatches (Sweet Pink, Minimal Cream, Lavender Dream, etc.) */}
          <Card variant="glass" padding="sm" className="space-y-3">
            <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <HeartIcon className="size-4 text-sweet-primaryStrong" />
              <span>2. Pilih Warna Frame (Color Swatches)</span>
            </h2>

            <div
              role="group"
              aria-label="Pilihan warna frame"
              className="flex flex-wrap gap-2.5"
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
                    className={`min-h-[48px] px-3.5 py-2 rounded-full border-2 flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? "bg-white border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.02]"
                        : "bg-white/80 hover:bg-white border-white/90"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: theme.hex, color: checkColor }}
                      className="size-7 rounded-full border border-black/15 flex items-center justify-center shadow-inner"
                    >
                      {isSelected && <CheckIcon className="size-4 stroke-[3]" />}
                    </span>
                    <span className="font-heading font-extrabold text-xs text-sweet-text">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 3. Filter Tone */}
          <Card variant="glass" padding="sm" className="space-y-2.5">
            <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <SparkleIcon className="size-4 text-sweet-primaryStrong" />
              <span>3. Filter Warna & Beauty Cam</span>
            </h2>
            <div
              role="group"
              aria-label="Pilihan filter foto"
              className="flex flex-wrap gap-2"
            >
              {PHOTO_FILTERS.map((flt) => {
                const isSelected = flt.id === draftFilter;
                return (
                  <button
                    key={flt.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setDraftFilter(flt.id)}
                    className={`min-h-[46px] px-4 py-2 rounded-full border-2 font-heading font-extrabold text-xs transition-all ${
                      isSelected
                        ? "bg-[#DCD6F7] border-[#9E8CE0] text-sweet-text shadow-sweet scale-[1.02]"
                        : "bg-white/80 hover:bg-white border-white/90 text-sweet-text"
                    }`}
                  >
                    {flt.name}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 4. Dekorasi Stiker Sudut Foto */}
          <Card variant="glass" padding="sm" className="space-y-2.5">
            <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <BowIcon className="size-4 text-sweet-primaryStrong" />
              <span>4. Stiker Dekorasi Frame</span>
            </h2>
            <div
              role="group"
              aria-label="Pilihan stiker dekorasi frame"
              className="flex flex-wrap gap-2"
            >
              {DEFAULT_STICKER_OPTIONS.map((stk) => {
                const isSelected = stk.id === draftStickerId;
                return (
                  <button
                    key={stk.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setDraftStickerId(stk.id)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-full border-2 font-heading font-extrabold text-xs transition-all ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#F472B6] text-sweet-text shadow-sweet scale-[1.02]"
                        : "bg-white/80 hover:bg-white border-white/90 text-sweet-text"
                    }`}
                  >
                    {stk.name}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 5. AR Face & Sticker Presets */}
          <Card variant="glass" padding="sm" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
                <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                <span>5. AR Face & Sticker Overlays</span>
              </h2>
              <span className="text-[11px] font-heading font-bold text-sweet-primaryStrong bg-[#FDF2F8] px-2.5 py-0.5 rounded-full border border-[#FBCFE8]">
                AI Face-Tracking
              </span>
            </div>
            <div
              role="group"
              aria-label="Pilihan efek AR wajah dan stiker"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {AR_PRESET_CHOICES.map((preset) => {
                const isSelected = preset.id === draftArPreset;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setDraftArPreset(preset.id)}
                    className={`min-h-[52px] p-2.5 rounded-2xl border-2 text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? "bg-[#FFF0F5] border-[#F472B6] text-sweet-text shadow-sweet ring-2 ring-[#FBCFE8] scale-[1.02]"
                        : "bg-white/80 hover:bg-white border-white/90 text-sweet-text"
                    }`}
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">
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
          </Card>
        </div>

        {/* Right: Sticky Live Frame Preview & Caption + Confirm CTA */}
        <div className="lg:col-span-4 sticky top-3 self-start space-y-4 animate-container-right">
          <Card
            variant="glass"
            padding="md"
            className="flex flex-col items-center text-center space-y-3 shadow-sweet-card"
          >
            <div className="inline-flex items-center p-1 rounded-full bg-white/80 border border-[#DCD6F7] shadow-xs gap-1">
              <button
                type="button"
                onClick={() => setPreviewMode("frame")}
                className={`px-3 py-1 rounded-full text-xs font-heading font-extrabold transition-all ${
                  previewMode === "frame"
                    ? "bg-[#F3E8FF] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                ✦ Frame Strip
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("pose")}
                className={`px-3 py-1 rounded-full text-xs font-heading font-extrabold transition-all ${
                  previewMode === "pose"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                ✨ Cek AI AR & Filter
              </button>
            </div>

            <div className="h-64 flex items-center justify-center py-1 w-full">
              {previewMode === "frame" ? (
                activeTemplate && (
                  <LayoutMock
                    template={activeTemplate}
                    frameColorId={draftFrameColor}
                    frameThemes={frameThemes}
                    photos={selectedPhotos}
                    captionText={draftCaption}
                    filterId={draftFilter}
                    stickerId={draftStickerId}
                    arPresetId={draftArPreset}
                    className="h-60 w-auto shadow-sweet-strip rounded-xl"
                  />
                )
              ) : (
                <div className="relative h-60 w-full flex items-center justify-center rounded-2xl overflow-hidden bg-sweet-blush/60 border-2 border-white">
                  {aiPoseLoading && (
                    <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-10 flex flex-col items-center justify-center gap-2">
                      <SpinnerIcon className="size-7 text-sweet-primaryStrong animate-spin" />
                      <span className="text-[11px] font-heading font-bold text-sweet-text">
                        Mendeteksi Wajah & Filter...
                      </span>
                    </div>
                  )}
                  {aiPosePreviewUrl ? (
                    <img
                      src={aiPosePreviewUrl}
                      alt="Preview AI AR & Filter Pose #1"
                      className="h-full w-full object-contain rounded-xl"
                    />
                  ) : (
                    <span className="text-xs font-heading font-semibold text-sweet-muted px-4">
                      Pilih Filter atau AR Preset untuk melihat hasil AI Face-Tracking pada Pose #1
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="w-full text-left">
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
                placeholder="SWEET STUDIO ♡"
                className="w-full min-h-[46px] px-4 py-2 rounded-2xl bg-white/90 border-2 border-white text-sweet-text text-sm font-heading font-semibold focus:border-[#F472B6] outline-none shadow-xs transition-colors"
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
            className="w-full min-h-[68px] text-xl font-extrabold shadow-sweetLg animate-pulse-cta"
          >
            CHOOSE THIS FRAME
          </Button>
        </div>
      </div>
    </section>
  );
}
