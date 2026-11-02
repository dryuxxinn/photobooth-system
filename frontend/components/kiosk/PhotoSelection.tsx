"use client";

import React, { useState } from "react";
import { PhotoItem, SessionDetail } from "@/types/photobooth";
import { SELECTION_IDLE_SECONDS } from "@/lib/config";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowRightIcon, CheckIcon, HeartIcon } from "@/components/icons";

interface PhotoSelectionProps {
  session: SessionDetail;
  onContinue: (selectedPhotos: PhotoItem[]) => void;
}

export function PhotoSelection({ session, onContinue }: PhotoSelectionProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    session.photos.map((p) => p.id)
  );

  const { secondsLeft } = useIdleCountdown({
    enabled: true,
    totalSeconds: SELECTION_IDLE_SECONDS,
    onExpire: () => onContinue(session.photos),
  });

  const toggleFavorite = (photoId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(photoId)
        ? prev.length > 1
          ? prev.filter((id) => id !== photoId)
          : prev
        : [...prev, photoId]
    );
  };

  return (
    <section
      aria-labelledby="photo-select-heading"
      className="flex-1 min-h-0 flex flex-col justify-between px-6 py-5 overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 max-w-5xl w-full mx-auto">
        <div className="w-28" />
        <div className="text-center">
          <h1
            id="photo-select-heading"
            className="font-heading font-extrabold text-2xl md:text-3xl text-sweet-text flex items-center justify-center gap-2"
          >
            <span>PICK YOUR FAVORITES</span>
            <HeartIcon className="size-6 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs md:text-sm text-sweet-muted">
            Periksa ekspresi terbaikmu sebelum memilih desain frame ({session.photos.length} foto siap)
          </p>
        </div>
        <StatusBadge tone={secondsLeft <= 15 ? "error" : "lavender"}>
          Lanjut otomatis {secondsLeft}d
        </StatusBadge>
      </div>

      {/* Photo Grid */}
      <div
        role="group"
        aria-label="Daftar foto yang berhasil diambil"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mx-auto my-4"
      >
        {session.photos.map((photo) => {
          const isFav = favoriteIds.includes(photo.id);
          const src = resolveStorageUrl(
            photo.preview_url || photo.thumbnail_url || photo.original_url
          );

          return (
            <button
              key={photo.id}
              type="button"
              aria-pressed={isFav}
              onClick={() => toggleFavorite(photo.id)}
              className={`group relative rounded-3xl overflow-hidden border-4 transition-all text-left bg-sweet-surface shadow-sweet ${
                isFav
                  ? "border-sweet-primaryStrong ring-4 ring-sweet-primary/50"
                  : "border-sweet-border opacity-80"
              }`}
            >
              <div className="aspect-[3/2] w-full bg-sweet-blush overflow-hidden">
                {src && (
                  <img
                    src={src}
                    alt={`Hasil foto pose ke-${photo.index}`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                )}
              </div>

              <div className="p-3.5 flex items-center justify-between bg-sweet-surface">
                <div>
                  <span className="font-heading font-bold text-sm text-sweet-text block">
                    PHOTO {photo.index}
                  </span>
                  <span className="text-xs text-sweet-muted">
                    {isFav ? "Dipakai di frame ♡" : "Sentuh untuk pilih"}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={`size-9 rounded-full flex items-center justify-center transition-colors ${
                    isFav
                      ? "bg-sweet-primaryStrong text-white"
                      : "bg-sweet-blush text-sweet-primaryStrong"
                  }`}
                >
                  {isFav ? (
                    <CheckIcon className="size-5" />
                  ) : (
                    <HeartIcon className="size-4" />
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="max-w-md w-full mx-auto flex flex-col items-center gap-2">
        <Button
          variant="primary"
          size="xl"
          onClick={() => onContinue(session.photos)}
          rightIcon={<ArrowRightIcon className="size-6" />}
          className="w-full min-h-[68px] text-xl shadow-sweetLg border-sweet-primaryStrong"
        >
          CONTINUE
        </Button>
        <p className="text-xs text-sweet-muted">
          Semua {session.photos.length} foto akan disusun otomatis ke dalam template pilihanmu ✨
        </p>
      </div>
    </section>
  );
}
