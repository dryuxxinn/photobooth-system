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
  const photoCount = session.photos.length;
  const gridLayoutClass =
    photoCount <= 2
      ? "grid-cols-2 max-w-2xl"
      : photoCount === 3
      ? "grid-cols-1 sm:grid-cols-3 max-w-4xl"
      : photoCount === 4
      ? "grid-cols-2 sm:grid-cols-4 max-w-5xl"
      : photoCount === 5
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-6xl"
      : "grid-cols-2 md:grid-cols-3 md:grid-rows-2 max-w-5xl";

  return (
    <section
      aria-labelledby="photo-select-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-6 py-3 overflow-hidden animate-screen-fade"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 max-w-5xl w-full mx-auto shrink-0">
        <StatusBadge tone="pink">
          Frame: {template.name} ({maxPhotos} Slot)
        </StatusBadge>

        <div className="text-center">
          <h1
            id="photo-select-heading"
            className="font-heading font-extrabold text-xl md:text-2xl text-sweet-text flex items-center justify-center gap-2"
          >
            <span>PILIH {maxPhotos} FOTO TERBAIK</span>
            <HeartIcon className="size-5 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs text-sweet-muted mx-auto">
            Sentuh foto untuk memilih posisi urutan slot ({selectedIds.length} dari {maxPhotos} terpilih dari total {photoCount} pose)
          </p>
        </div>

        <StatusBadge tone={secondsLeft <= 15 ? "error" : "neutral"}>
          Lanjut otomatis {secondsLeft}d
        </StatusBadge>
      </div>

      {/* Dynamic Grid Layout based on Total Captured Poses */}
      <div
        role="group"
        aria-label="Pilih foto terbaik untuk frame"
        className={`flex-1 min-h-0 grid gap-3 w-full mx-auto my-2 ${gridLayoutClass}`}
      >
        {session.photos.map((photo, idx) => {
          const slotIndex = selectedIds.indexOf(photo.id);
          const isSelected = slotIndex !== -1;
          const src = resolveStorageUrl(
            photo.preview_url || photo.thumbnail_url || photo.original_url
          );
          const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;

          return (
            <button
              key={photo.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleTogglePhoto(photo.id)}
              className={`group relative rounded-3xl overflow-hidden border-3 transition-all text-left bg-sweet-surface shadow-sweet flex flex-col justify-between min-h-0 stagger-item ${staggerClass} ${
                isSelected
                  ? "border-sweet-primaryStrong ring-3 ring-sweet-primary/50 scale-[1.01]"
                  : "border-sweet-border opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex-1 min-h-0 w-full bg-sweet-blush overflow-hidden relative">
                {src && (
                  <img
                    src={src}
                    alt={`Foto pose ke-${photo.index}`}
                    width={600}
                    height={400}
                    style={{ filter: getFilterCss(session.filter_name || undefined) }}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                )}

                {/* Slot Order Badge overlay on image */}
                {isSelected ? (
                  <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-sweet-primaryStrong text-white font-heading font-extrabold text-xs shadow-sweet flex items-center gap-1.5 animate-sticker-pop">
                    <CheckIcon className="size-3.5 stroke-[3]" />
                    <span>Slot #{slotIndex + 1}</span>
                  </div>
                ) : (
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#3F3D56]/75 text-white font-heading font-bold text-xs">
                    Pose #{photo.index}
                  </div>
                )}
              </div>

              <div className="px-3 py-2 flex items-center justify-between bg-sweet-surface shrink-0">
                <div>
                  <span className="font-heading font-bold text-xs text-sweet-text block">
                    Pose #{photo.index}
                  </span>
                  <span className="text-[10px] text-sweet-muted block">
                    {isSelected
                      ? `Urutan ke-${slotIndex + 1} di frame`
                      : "Sentuh untuk pilih"}
                  </span>
                </div>

                <div
                  className={`size-7 rounded-full flex items-center justify-center font-heading font-extrabold text-xs transition-colors ${
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
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-1.5 shrink-0">
        <Button
          variant="strong"
          size="xl"
          disabled={!isComplete}
          onClick={() => onContinue(selectedIds)}
          rightIcon={<ArrowRightIcon className="size-6 text-white" />}
          className="w-full min-h-[58px] text-lg sm:text-xl disabled:opacity-50 animate-pulse-cta"
        >
          {isComplete
            ? "PASANG KE FRAME"
            : `PILIH ${maxPhotos - selectedIds.length} FOTO LAGI`}
        </Button>
        <p className="text-[11px] text-sweet-muted text-center mx-auto">
          {isComplete
            ? "Kamu tetap bisa mengubah desain frame dan warnanya di langkah berikutnya."
            : `Pilih tepat ${maxPhotos} foto untuk mengisi seluruh slot frame ${template.name}.`}
        </p>
      </div>
    </section>
  );
}
