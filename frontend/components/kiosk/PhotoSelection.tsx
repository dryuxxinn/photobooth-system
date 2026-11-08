"use client";

import React, { useState } from "react";
import { SessionDetail, TemplateOption } from "@/types/photobooth";
import { SELECTION_IDLE_SECONDS } from "@/lib/config";
import { getFilterCss } from "@/lib/defaults";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, CheckIcon, HeartIcon, SparkleIcon } from "@/components/icons";

interface PhotoSelectionProps {
  session: SessionDetail;
  template: TemplateOption;
  onContinue: (selectedPhotoIds: string[]) => void;
}

export function PhotoSelection({
  session,
  template,
  onContinue,
}: PhotoSelectionProps) {
  const maxPhotos = template.photos_required || 4;

  // Pre-select first N photos or previously selected IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (
      session.selected_photo_ids &&
      session.selected_photo_ids.length === maxPhotos
    ) {
      return session.selected_photo_ids;
    }
    return session.photos.slice(0, maxPhotos).map((p) => p.id);
  });

  const { secondsLeft } = useIdleCountdown({
    enabled: true,
    totalSeconds: SELECTION_IDLE_SECONDS,
    onExpire: () => {
      if (selectedIds.length === maxPhotos) {
        onContinue(selectedIds);
      } else {
        const fallback = session.photos.slice(0, maxPhotos).map((p) => p.id);
        onContinue(fallback);
      }
    },
  });

  const handleTogglePhoto = (photoId: string) => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(photoId);
      if (idx !== -1) {
        // Deselect
        return prev.filter((id) => id !== photoId);
      } else {
        // If already full, don't allow selecting more than maxPhotos
        if (prev.length >= maxPhotos) {
          // Replace the last one or prompt
          return [...prev.slice(0, maxPhotos - 1), photoId];
        }
        return [...prev, photoId];
      }
    });
  };

  const isComplete = selectedIds.length === maxPhotos;

  return (
    <section
      aria-labelledby="photo-select-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-6 py-4 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 max-w-5xl w-full mx-auto">
        <StatusBadge tone="pink">
          Frame: {template.name} ({maxPhotos} Slot)
        </StatusBadge>

        <div className="text-center">
          <h1
            id="photo-select-heading"
            className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center justify-center gap-2"
          >
            <span>PILIH {maxPhotos} FOTO TERBAIK</span>
            <HeartIcon className="size-6 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs md:text-sm text-sweet-muted">
            Sentuh foto untuk memilih posisi urutan slot ({selectedIds.length} dari {maxPhotos} terpilih)
          </p>
        </div>

        <StatusBadge tone={secondsLeft <= 15 ? "error" : "neutral"}>
          Lanjut otomatis {secondsLeft}d
        </StatusBadge>
      </div>

      {/* 6 Photos in 3x2 Grid */}
      <div
        role="group"
        aria-label="Pilih foto terbaik untuk frame"
        className="grid grid-cols-2 md:grid-cols-3 gap-3.5 max-w-5xl w-full mx-auto my-3 animate-container-card"
      >
        {session.photos.map((photo) => {
          const slotIndex = selectedIds.indexOf(photo.id);
          const isSelected = slotIndex !== -1;
          const src = resolveStorageUrl(
            photo.preview_url || photo.thumbnail_url || photo.original_url
          );

          return (
            <button
              key={photo.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleTogglePhoto(photo.id)}
              className={`group relative rounded-3xl overflow-hidden border-4 transition-all text-left bg-sweet-surface shadow-sweet ${
                isSelected
                  ? "border-sweet-primaryStrong ring-4 ring-sweet-primary/50 scale-[1.01]"
                  : "border-sweet-border opacity-70 hover:opacity-95"
              }`}
            >
              <div className="aspect-[3/2] w-full bg-sweet-blush overflow-hidden relative">
                {src && (
                  <img
                    src={src}
                    alt={`Foto pose ke-${photo.index}`}
                    style={{ filter: getFilterCss(session.filter_name || undefined) }}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                )}

                {/* Slot Order Badge overlay on image */}
                {isSelected ? (
                  <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-sweet-primaryStrong text-white font-heading font-extrabold text-sm shadow-sweet flex items-center gap-1.5 animate-sticker-pop">
                    <CheckIcon className="size-3.5 stroke-[3]" />
                    <span>Slot #{slotIndex + 1}</span>
                  </div>
                ) : (
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-sweet-text/40 text-white font-heading font-bold text-xs backdrop-blur-xs">
                    Pose #{photo.index}
                  </div>
                )}
              </div>

              <div className="p-3 flex items-center justify-between bg-sweet-surface">
                <div>
                  <span className="font-heading font-bold text-xs sm:text-sm text-sweet-text block">
                    Pose #{photo.index}
                  </span>
                  <span className="text-[11px] text-sweet-muted">
                    {isSelected
                      ? `Urutan ke-${slotIndex + 1} di frame ♡`
                      : "Sentuh untuk pilih"}
                  </span>
                </div>

                <div
                  className={`size-8 rounded-full flex items-center justify-center font-heading font-extrabold text-sm transition-colors ${
                    isSelected
                      ? "bg-sweet-primaryStrong text-white shadow-xs"
                      : "bg-sweet-blush text-sweet-primaryStrong border border-sweet-primary"
                  }`}
                >
                  {isSelected ? slotIndex + 1 : "+"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-2">
        <Button
          variant="strong"
          size="xl"
          disabled={!isComplete}
          onClick={() => onContinue(selectedIds)}
          rightIcon={<ArrowRightIcon className="size-6 text-white" />}
          className="w-full min-h-[66px] text-lg sm:text-xl shadow-sweetLg disabled:opacity-50"
        >
          {isComplete
            ? "PASANG KE FRAME ➔"
            : `PILIH ${maxPhotos - selectedIds.length} FOTO LAGI`}
        </Button>
        <p className="text-xs text-sweet-muted text-center">
          {isComplete
            ? "Kamu tetap bisa mengubah desain frame dan warnanya di langkah berikutnya! ✨"
            : `Pilih tepat ${maxPhotos} foto untuk mengisi seluruh slot frame ${template.name}.`}
        </p>
      </div>
    </section>
  );
}
