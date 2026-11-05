"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SessionDetail } from "@/types/photobooth";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BowIcon,
  FlowerIcon,
  HeartIcon,
  ShareIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/icons";

export default function ShareSessionPage() {
  const params = useParams();
  const sessionId = String(params?.sessionId || "");

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    photoboothApi
      .getSessionById(sessionId)
      .then((data) => {
        setSession(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          err?.message || "Sesi foto tidak ditemukan atau sudah kedaluwarsa."
        );
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const stripUrl = resolveStorageUrl(session?.processed_image_url);
  const gifUrl = resolveStorageUrl(session?.gif_url);

  const downloadOrShareFile = async (
    fileUrl: string,
    filename: string,
    mimeType: string
  ) => {
    if (!fileUrl) return;
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: mimeType });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Sweet Studio Photobooth ♡",
          text: "Kenangan manis dari Sweet Studio Photobooth ✨",
          files: [file],
        });
        setToast("File berhasil dibagikan!");
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      setToast("Berhasil mengunduh ke perangkat!");
      setTimeout(() => setToast(null), 3000);
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className="min-h-dvh sweet-bg text-sweet-text px-4 py-6 sm:px-6 md:py-10 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header Brand */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 border border-white/90 shadow-xs text-xs font-heading font-extrabold text-[#F472B6]">
            <BowIcon className="size-4" />
            <span>SWEET STUDIO DIGITAL GALLERY</span>
            <SparkleIcon className="size-4" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-[#3F3D56]">
            {session?.customer_name
              ? `${session.customer_name} ♡`
              : "Your Sweet Memories ♡"}
          </h1>
          <p className="text-xs sm:text-sm text-sweet-muted font-heading font-semibold">
            Simpan hasil cetakan strip foto, animasi Boomerang GIF, dan seluruh
            pose aslimu di bawah ini ✨
          </p>
        </header>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-[#E0F5E9] border-2 border-[#54866A]/30 text-[#1E5037] text-center font-heading font-extrabold text-xs shadow-xs"
          >
            {toast}
          </div>
        )}

        {loading && (
          <Card
            variant="glass"
            padding="lg"
            className="flex flex-col items-center justify-center py-14 space-y-3"
          >
            <SpinnerIcon className="size-10 text-sweet-primaryStrong animate-spin" />
            <p className="font-heading font-bold text-sm text-sweet-muted">
              Memuat galeri digitalmu...
            </p>
          </Card>
        )}

        {!loading && error && (
          <Card
            variant="surface"
            padding="lg"
            className="text-center space-y-4"
          >
            <p className="font-heading font-bold text-base text-sweet-error">
              {error}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 rounded-full bg-sweet-primary font-heading font-extrabold text-sm text-sweet-text"
            >
              Kembali ke Beranda Booth
            </Link>
          </Card>
        )}

        {!loading && session && (
          <>
            {/* 1. Photostrip & Boomerang GIF Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Hasil Strip Foto */}
              {stripUrl && (
                <Card
                  variant="glass"
                  padding="md"
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-1.5">
                      <HeartIcon className="size-4 text-[#F472B6]" />
                      <span>1. Hasil Strip Foto</span>
                    </span>
                    <StatusBadge tone="pink">High-Res JPEG</StatusBadge>
                  </div>

                  <div className="p-3 rounded-3xl bg-white border border-sweet-border shadow-sweet flex items-center justify-center">
                    <img
                      src={stripUrl}
                      alt="Hasil komposisi strip foto Sweet Studio"
                      className="max-h-[440px] w-auto object-contain rounded-xl"
                    />
                  </div>

                  <Button
                    variant="strong"
                    size="lg"
                    leftIcon={<ShareIcon className="size-5 text-white" />}
                    onClick={() =>
                      downloadOrShareFile(
                        stripUrl,
                        `sweet-studio-strip-${session.session_id}.jpg`,
                        "image/jpeg"
                      )
                    }
                    className="w-full"
                  >
                    Unduh / Bagikan Strip Foto
                  </Button>
                </Card>
              )}

              {/* Hasil Animasi Boomerang GIF */}
              {gifUrl && (
                <Card
                  variant="glass"
                  padding="md"
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="font-heading font-extrabold text-sm text-sweet-text flex items-center gap-1.5">
                      <SparkleIcon className="size-4 text-[#F472B6]" />
                      <span>2. Boomerang GIF Animasi</span>
                    </span>
                    <StatusBadge tone="neutral">Story Ready ✨</StatusBadge>
                  </div>

                  <div className="p-3 rounded-3xl bg-white border border-sweet-border shadow-sweet flex items-center justify-center">
                    <img
                      src={gifUrl}
                      alt="Animasi Boomerang GIF sesi Sweet Studio"
                      className="max-h-[340px] w-auto object-contain rounded-xl"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<ShareIcon className="size-5" />}
                    onClick={() =>
                      downloadOrShareFile(
                        gifUrl,
                        `sweet-studio-boomerang-${session.session_id}.gif`,
                        "image/gif"
                      )
                    }
                    className="w-full"
                  >
                    Unduh / Bagikan Boomerang GIF
                  </Button>
                </Card>
              )}
            </div>

            {/* 2. Semua Foto Satuan (Original Poses) */}
            {session.photos && session.photos.length > 0 && (
              <Card variant="glass" padding="md" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
                    <FlowerIcon className="size-4 text-[#F472B6]" />
                    <span>3. Semua Foto Satuan ({session.photos.length} Pose)</span>
                  </h2>
                  <span className="text-xs font-heading font-semibold text-sweet-muted">
                    Ketuk tombol untuk menyimpan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {session.photos.map((photo) => {
                    const origUrl = resolveStorageUrl(
                      photo.original_url ||
                        photo.preview_url ||
                        photo.thumbnail_url
                    );
                    return (
                      <div
                        key={photo.id}
                        className="p-2.5 rounded-2xl bg-white border border-sweet-border shadow-xs flex flex-col gap-2.5"
                      >
                        <img
                          src={origUrl}
                          alt={`Foto asli pose ke-${photo.index}`}
                          className="w-full aspect-[3/2] object-cover rounded-xl"
                        />
                        <div className="flex items-center justify-between px-1">
                          <span className="font-heading font-extrabold text-xs text-sweet-text">
                            Pose #{photo.index}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              downloadOrShareFile(
                                origUrl,
                                `sweet-pose-${session.session_id}-${photo.index}.jpg`,
                                "image/jpeg"
                              )
                            }
                            className="min-h-[36px] px-3 py-1 rounded-full bg-sweet-blush hover:bg-sweet-primary text-xs font-heading font-extrabold text-sweet-text transition-colors"
                          >
                            Simpan Foto
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        <footer className="text-center text-xs font-heading font-semibold text-sweet-muted pt-2 pb-6">
          ✦ Sweet Studio Photobooth • a little moment, a lovely memory ♡ ✦
        </footer>
      </div>
    </main>
  );
}
