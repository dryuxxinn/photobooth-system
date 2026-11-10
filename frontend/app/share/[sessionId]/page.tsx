"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { SessionDetail } from "@/types/photobooth";
import { loadOperatorConfig } from "@/lib/config";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeftIcon,
  BowIcon,
  FlowerIcon,
  HeartIcon,
  QrIcon,
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
  const [publicBaseUrl, setPublicBaseUrl] = useState("");

  useEffect(() => {
    const cfg = loadOperatorConfig();
    if (cfg.publicShareBaseUrl) {
      setPublicBaseUrl(cfg.publicShareBaseUrl);
    }
  }, []);

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

  const sharePageUrl = useMemo(() => {
    if (publicBaseUrl.trim()) {
      return `${publicBaseUrl.trim().replace(/\/$/, "")}/share/${sessionId}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${sessionId}`;
    }
    return `http://localhost:3000/share/${sessionId}`;
  }, [publicBaseUrl, sessionId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharePageUrl);
      showToast("Tautan galeri berhasil disalin!");
    } catch {
      showToast("Pindai kode QR untuk membuka galeri di ponsel.");
    }
  };

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
          title: "Sweet Studio Photobooth",
          text: "Kenangan manis dari Sweet Studio Photobooth",
          files: [file],
        });
        showToast("File berhasil dibagikan!");
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
      showToast("Berhasil mengunduh ke perangkat!");
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className="min-h-dvh lg:h-dvh lg:overflow-hidden sweet-bg text-sweet-text px-4 py-3 sm:px-6 sm:py-4 flex flex-col justify-between select-none">
      <div className="max-w-7xl w-full flex-1 min-h-0 mx-auto flex flex-col justify-between gap-3">
        {/* Compact Top Kiosk Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#F3E6EE]/80 shrink-0">
          <Link
            href="/"
            className="min-h-[44px] px-4 py-2 rounded-full bg-white/90 hover:bg-white border-2 border-[#F3E6EE] shadow-xs font-heading font-extrabold text-xs text-sweet-text inline-flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeftIcon className="size-4 text-sweet-primaryStrong" />
            <span>Beranda Booth</span>
          </Link>

          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 border border-[#FBCFE8] shadow-xs text-[11px] font-heading font-extrabold text-sweet-primaryStrong">
              <BowIcon className="size-3.5" />
              <span>SWEET STUDIO DIGITAL GALLERY</span>
              <SparkleIcon className="size-3.5" />
            </div>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[#3F3D56] tracking-wide mt-0.5">
              {session?.customer_name
                ? session.customer_name
                : "Your Sweet Memories"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {toast ? (
              <div
                role="status"
                aria-live="polite"
                className="px-4 py-2 rounded-full bg-[#E0F5E9] border-2 border-[#047857]/30 text-[#047857] font-heading font-extrabold text-xs shadow-xs animate-sticker-pop"
              >
                {toast}
              </div>
            ) : (
              <StatusBadge
                tone="pink"
                icon={<HeartIcon className="size-3.5 text-sweet-primaryStrong" />}
              >
                Sesi #{sessionId.slice(0, 8)}
              </StatusBadge>
            )}
          </div>
        </header>

        {loading && (
          <Card
            variant="glass"
            padding="lg"
            className="flex-1 flex flex-col items-center justify-center py-14 space-y-3"
          >
            <SpinnerIcon className="size-10 text-sweet-primaryStrong animate-spin" />
            <p className="font-heading font-bold text-sm text-sweet-muted mx-auto">
              Memuat galeri digitalmu...
            </p>
          </Card>
        )}

        {!loading && error && (
          <Card
            variant="surface"
            padding="lg"
            className="my-auto max-w-lg mx-auto text-center space-y-4"
          >
            <p className="font-heading font-bold text-base text-sweet-error mx-auto">
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

        {/* Full-Screen 3-Column Bento Grid (Zero Vertical Scroll on Kiosk) */}
        {!loading && session && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* COLUMN 1 (3 Cols): 1. Hasil Strip Foto (Full Height Stage) */}
            {stripUrl && (
              <Card
                variant="glass"
                padding="sm"
                className="lg:col-span-3 flex flex-col justify-between min-h-0 shadow-sweet-card animate-container-left"
              >
                <div className="w-full flex items-center justify-between shrink-0">
                  <span className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                    <HeartIcon className="size-4 text-sweet-primaryStrong" />
                    <span>1. Hasil Strip Foto</span>
                  </span>
                  <StatusBadge tone="pink">High-Res</StatusBadge>
                </div>

                <div className="flex-1 min-h-0 my-2 p-2.5 rounded-2xl bg-white/95 border border-[#F3E6EE] flex items-center justify-center antigravity-stage overflow-hidden">
                  <img
                    src={stripUrl}
                    alt="Hasil komposisi strip foto Sweet Studio"
                    width={600}
                    height={900}
                    className="max-h-[420px] lg:max-h-[calc(100dvh-235px)] w-auto object-contain rounded-xl shadow-sweet-strip animate-float-strip-2"
                  />
                </div>

                <Button
                  variant="strong"
                  size="md"
                  leftIcon={<ShareIcon className="size-4 text-white" />}
                  onClick={() =>
                    downloadOrShareFile(
                      stripUrl,
                      `sweet-studio-strip-${session.session_id}.jpg`,
                      "image/jpeg"
                    )
                  }
                  className="w-full min-h-[48px] text-xs sm:text-sm shrink-0 animate-pulse-cta"
                >
                  Unduh / Bagikan Strip
                </Button>
              </Card>
            )}

            {/* COLUMN 2 (4 Cols): 2. Boomerang GIF + Instant QR Code Kiosk Dock */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-3.5 min-h-0 animate-container-card">
              {/* Top Half: Boomerang GIF */}
              {gifUrl ? (
                <Card
                  variant="glass"
                  padding="sm"
                  className="flex-1 min-h-0 flex flex-col justify-between shadow-sweet-card"
                >
                  <div className="w-full flex items-center justify-between shrink-0">
                    <span className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                      <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                      <span>2. Boomerang GIF</span>
                    </span>
                    <StatusBadge tone="neutral">Story Ready</StatusBadge>
                  </div>

                  <div className="flex-1 min-h-0 my-2 p-2 rounded-2xl bg-white/95 border border-[#F3E6EE] flex items-center justify-center overflow-hidden">
                    <img
                      src={gifUrl}
                      alt="Animasi Boomerang GIF sesi Sweet Studio"
                      width={600}
                      height={400}
                      className="max-h-[220px] lg:max-h-[calc(50dvh-160px)] w-auto object-contain rounded-xl shadow-sweet"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<ShareIcon className="size-4" />}
                    onClick={() =>
                      downloadOrShareFile(
                        gifUrl,
                        `sweet-studio-boomerang-${session.session_id}.gif`,
                        "image/gif"
                      )
                    }
                    className="w-full min-h-[46px] text-xs sm:text-sm shrink-0"
                  >
                    Unduh / Bagikan GIF
                  </Button>
                </Card>
              ) : (
                <Card
                  variant="glass"
                  padding="sm"
                  className="flex-1 min-h-0 flex flex-col items-center justify-center text-center shadow-sweet-card"
                >
                  <SparkleIcon className="size-8 text-sweet-primaryStrong mb-2" />
                  <p className="font-heading font-extrabold text-sm text-sweet-text mx-auto">
                    Boomerang GIF Siap Disimpan
                  </p>
                </Card>
              )}

              {/* Bottom Half: Instant QR Code Kiosk Dock (Fills spatial balance on Kiosk) */}
              <Card
                variant="glass"
                padding="sm"
                className="shrink-0 border-2 border-[#FBCFE8] shadow-sweet-card flex items-center gap-3.5"
              >
                <div className="p-2 rounded-2xl bg-white border-2 border-[#F3E6EE] shadow-xs shrink-0 flex items-center justify-center">
                  <QRCodeSVG
                    value={sharePageUrl}
                    size={92}
                    bgColor="#FFFFFF"
                    fgColor="#493B3B"
                    level="M"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-heading font-extrabold text-xs sm:text-sm text-[#3F3D56]">
                    <QrIcon className="size-4 text-sweet-primaryStrong shrink-0" />
                    <span className="truncate">Scan QR ke Ponselmu</span>
                  </div>
                  <p className="text-[11px] text-sweet-muted font-heading font-semibold leading-snug">
                    Arahkan kamera HP ke kode QR ini untuk mengunduh semua foto tanpa kabel.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="min-h-[44px] w-full px-3 py-1.5 rounded-xl bg-sweet-blush hover:bg-sweet-primary text-xs font-heading font-extrabold text-sweet-text border border-[#FBCFE8] transition-all active:scale-95"
                  >
                    Salin Tautan Galeri
                  </button>
                </div>
              </Card>
            </div>

            {/* COLUMN 3 (5 Cols): 3. Semua Foto Satuan (6 Pose in Zero-Scroll 2x3 Bento Grid) */}
            {session.photos && session.photos.length > 0 && (
              <Card
                variant="glass"
                padding="sm"
                className="lg:col-span-5 flex flex-col justify-between min-h-0 shadow-sweet-card animate-container-right"
              >
                <div className="flex items-center justify-between shrink-0 mb-2">
                  <h2 className="font-heading font-extrabold text-xs sm:text-sm text-sweet-text flex items-center gap-1.5">
                    <FlowerIcon className="size-4 text-sweet-primaryStrong" />
                    <span>3. Semua Foto Satuan ({session.photos.length} Pose)</span>
                  </h2>
                  <span className="text-[11px] font-heading font-bold text-sweet-primaryStrong bg-[#FFF0F5] px-2.5 py-0.5 rounded-full border border-[#FBCFE8]">
                    Ketuk Foto untuk Simpan
                  </span>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-3 gap-2.5">
                  {session.photos.map((photo, idx) => {
                    const origUrl = resolveStorageUrl(
                      photo.original_url ||
                        photo.preview_url ||
                        photo.thumbnail_url
                    );
                    const staggerClass = `stagger-${Math.min(idx + 1, 6)}`;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() =>
                          downloadOrShareFile(
                            origUrl,
                            `sweet-pose-${session.session_id}-${photo.index}.jpg`,
                            "image/jpeg"
                          )
                        }
                        className={`group relative rounded-2xl bg-white p-1.5 border-2 border-[#F3E6EE] hover:border-[#F472B6] shadow-xs flex flex-col justify-between min-h-[110px] overflow-hidden text-left transition-all hover:-translate-y-0.5 active:scale-95 stagger-item ${staggerClass}`}
                      >
                        <div className="relative flex-1 min-h-0 w-full rounded-xl overflow-hidden bg-sweet-blush">
                          <img
                            src={origUrl}
                            alt={`Foto asli pose ke-${photo.index}`}
                            width={600}
                            height={400}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#3F3D56]/80 backdrop-blur-xs text-white font-heading font-extrabold text-[10px]">
                            Pose #{photo.index}
                          </span>
                          <span className="absolute bottom-1.5 right-1.5 px-2.5 py-1 rounded-full bg-white/95 text-sweet-primaryStrong font-heading font-extrabold text-[10px] shadow-xs group-hover:bg-sweet-primaryStrong group-hover:text-white transition-colors">
                            Simpan Foto
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        <footer className="text-center text-[11px] font-heading font-semibold text-sweet-muted shrink-0">
          Sweet Studio Photobooth • a little moment, a lovely memory
        </footer>
      </div>
    </main>
  );
}

