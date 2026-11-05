"use client";

import React, { useState } from "react";
import { SessionDetail } from "@/types/photobooth";
import { COMPLETION_AUTO_RESET_SECONDS } from "@/lib/config";
import { useIdleCountdown } from "@/hooks/useIdleCountdown";
import { resolveStorageUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QrDialog } from "@/components/QrDialog";
import {
  FlowerIcon,
  HeartIcon,
  QrIcon,
  SparkleIcon,
} from "@/components/icons";

interface CompletionScreenProps {
  completedSession: SessionDetail | null;
  onStartAgain: () => void;
}

export function CompletionScreen({
  completedSession,
  onStartAgain,
}: CompletionScreenProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [mediaView, setMediaView] = useState<"strip" | "gif">("strip");

  const { secondsLeft } = useIdleCountdown({
    enabled: !qrOpen,
    totalSeconds: COMPLETION_AUTO_RESET_SECONDS,
    onExpire: onStartAgain,
  });

  const finalImageUrl = resolveStorageUrl(
    completedSession?.processed_image_url
  );
  const gifImageUrl = resolveStorageUrl(completedSession?.gif_url);

  const handleDownload = async () => {
    const targetUrl =
      mediaView === "gif" && gifImageUrl ? gifImageUrl : finalImageUrl;
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  // Pastel confetti particles
  const confettiColors = ["#FBCFE8", "#F472B6", "#DCD6F7", "#DEF1FF", "#E0F5E9", "#FCF9F2"];

  return (
    <section
      aria-labelledby="completion-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-6 py-6 text-center overflow-y-auto kiosk-scroll relative"
    >
      {/* Subtle Pastel Falling Confetti Background */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-float-soft"
            style={{
              top: `${(i * 19) % 95}%`,
              left: `${(i * 13) % 96}%`,
              width: `${(i % 3) * 3 + 8}px`,
              height: `${(i % 3) * 3 + 8}px`,
              backgroundColor: confettiColors[i % confettiColors.length],
              opacity: 0.7,
              animationDuration: `${3.5 + (i % 5) * 0.8}s`,
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* 2-Column Side-by-Side Container */}
      <div className="max-w-6xl w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 px-4 sm:px-6">
        {/* Kolom Kiri: Final Photo Strip & Boomerang GIF Centerpiece Preview (~74dvh) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3 animate-container-left">
          {gifImageUrl && (
            <div
              role="group"
              aria-label="Pilih tampilan hasil foto atau Boomerang GIF"
              className="inline-flex items-center p-1 rounded-full bg-white/85 border border-white/90 shadow-xs gap-1"
            >
              <button
                type="button"
                aria-pressed={mediaView === "strip"}
                onClick={() => setMediaView("strip")}
                className={`min-h-[36px] px-4 rounded-full font-heading font-extrabold text-xs transition-all ${
                  mediaView === "strip"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Strip Foto ♡
              </button>
              <button
                type="button"
                aria-pressed={mediaView === "gif"}
                onClick={() => setMediaView("gif")}
                className={`min-h-[36px] px-4 rounded-full font-heading font-extrabold text-xs transition-all ${
                  mediaView === "gif"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Boomerang GIF ✨
              </button>
            </div>
          )}

          {(finalImageUrl || gifImageUrl) && (
            <div className="relative group p-3.5 sm:p-4 rounded-[2.5rem] bg-white/85 backdrop-blur-md border-2 border-white/90 shadow-sweet-strip animate-float-strip-2 transition-all duration-300">
              <img
                src={
                  mediaView === "gif" && gifImageUrl
                    ? gifImageUrl
                    : finalImageUrl
                }
                alt={
                  mediaView === "gif"
                    ? "Hasil animasi Boomerang GIF Sweet Studio"
                    : "Hasil akhir cetakan foto Sweet Studio"
                }
                className="max-h-[68dvh] w-auto object-contain rounded-2xl shadow-sweet border border-sweet-border"
              />
              <div className="absolute -top-3 -right-3 size-11 rounded-full bg-gradient-to-tr from-[#FBCFE8] via-[#F472B6] to-[#EC4899] flex items-center justify-center text-white shadow-sweet animate-bounce">
                <HeartIcon className="size-6 fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Glassmorphic Card "THANK YOU!" */}
        <div className="lg:col-span-7 flex flex-col justify-center animate-container-right">
          <Card
            variant="glass"
            padding="lg"
            className="w-full flex flex-col items-center text-center space-y-6 shadow-sweet-card"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-white/80 border border-white/90 shadow-xs text-xs font-heading font-extrabold text-[#F472B6]">
                <SparkleIcon className="size-4" />
                <span>MEMORIES CAPTURED</span>
                <SparkleIcon className="size-4" />
              </div>
              <h1
                id="completion-heading"
                className="font-heading font-extrabold text-3xl sm:text-5xl text-[#3F3D56] tracking-wide"
              >
                THANK YOU! ♡
              </h1>
              <p className="text-sm sm:text-base text-sweet-muted font-heading font-semibold max-w-md mx-auto">
                Hope you love your memories! Jangan lupa ambil hasil cetakanmu di tray printer ya ✨
              </p>
            </div>

            <div className="w-full flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <Button
                variant="strong"
                size="lg"
                leftIcon={<QrIcon className="size-6 text-white" />}
                onClick={() => setQrOpen(true)}
                className="w-full sm:flex-1 min-h-[64px] text-lg font-heading font-extrabold shadow-sweet-strip rounded-full active:scale-95 transition-all duration-300"
              >
                Tampilkan Kode QR
              </Button>

              <Button
                variant="surface"
                size="lg"
                onClick={onStartAgain}
                rightIcon={<FlowerIcon className="size-6 text-[#F472B6]" />}
                className="w-full sm:flex-1 min-h-[64px] text-lg font-heading font-extrabold rounded-full border-2 border-white/80 active:scale-95 transition-all duration-300"
              >
                START AGAIN
              </Button>
            </div>

            <p className="text-xs sm:text-sm font-heading font-bold text-sweet-muted flex items-center justify-center gap-1.5 pt-1">
              <span>See you next time ✿</span>
              <span>• Kembali otomatis dalam <strong className="text-[#F472B6]">{secondsLeft}s</strong></span>
            </p>
          </Card>
        </div>
      </div>

      {completedSession && (
        <QrDialog
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          imageUrl={finalImageUrl}
          gifUrl={gifImageUrl}
          sessionId={completedSession.session_id}
          onDownloadOrShare={handleDownload}
        />
      )}
    </section>
  );
}
