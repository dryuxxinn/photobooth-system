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

  return (
    <section
      aria-labelledby="completion-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-6 py-4 text-center overflow-hidden relative"
    >
      {/* 2-Column Side-by-Side Container */}
      <div className="max-w-6xl w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 px-4 sm:px-6 flex-1 min-h-0">
        {/* Kolom Kiri: Final Photo Strip & Boomerang GIF Centerpiece Preview in 3D Stage */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3 animate-container-left antigravity-stage">
          {gifImageUrl && (
            <div
              role="group"
              aria-label="Pilih tampilan hasil foto atau Boomerang GIF"
              className="inline-flex items-center p-1 rounded-2xl bg-white border border-[#F3E6EE] gap-1 shadow-xs"
            >
              <button
                type="button"
                aria-pressed={mediaView === "strip"}
                onClick={() => setMediaView("strip")}
                className={`min-h-[44px] px-4 rounded-xl font-heading font-extrabold text-xs transition-all active:scale-95 ${
                  mediaView === "strip"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Strip Foto
              </button>
              <button
                type="button"
                aria-pressed={mediaView === "gif"}
                onClick={() => setMediaView("gif")}
                className={`min-h-[44px] px-4 rounded-xl font-heading font-extrabold text-xs transition-all active:scale-95 ${
                  mediaView === "gif"
                    ? "bg-[#FBCFE8] text-[#3F3D56] shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                Boomerang GIF
              </button>
            </div>
          )}

          {(finalImageUrl || gifImageUrl) && (
            <div
              key={mediaView}
              className="relative group p-3.5 sm:p-4 rounded-[2.5rem] bg-white border-2 border-[#F3E6EE] shadow-sweet-strip animate-spring-swap transition-all duration-300"
            >
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
                width={600}
                height={900}
                className="max-h-[66dvh] w-auto object-contain rounded-2xl shadow-sweet border border-sweet-border"
              />
              <div className="absolute -top-3 -right-3 size-11 rounded-full bg-[#DB2777] flex items-center justify-center text-white shadow-sweet">
                <HeartIcon className="size-6 fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Action Card "THANK YOU!" */}
        <div className="lg:col-span-7 flex flex-col justify-center animate-container-right">
          <Card
            variant="glass"
            padding="lg"
            className="w-full flex flex-col items-center text-center space-y-6 shadow-sweet-card"
          >
            <div className="space-y-2">
              <h1
                id="completion-heading"
                className="font-heading font-extrabold text-3xl sm:text-5xl text-[#3F3D56] tracking-wide"
              >
                THANK YOU!
              </h1>
              <p className="text-sm sm:text-base text-sweet-muted font-heading font-semibold max-w-md mx-auto">
                Hope you love your memories! Jangan lupa ambil hasil cetakanmu di tray printer.
              </p>
            </div>

            <div className="w-full flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <Button
                variant="strong"
                size="lg"
                leftIcon={<QrIcon className="size-6 text-white" />}
                onClick={() => setQrOpen(true)}
                className="w-full sm:flex-1 min-h-[64px] text-lg font-heading font-extrabold shadow-sweet-strip rounded-full animate-pulse-cta active:scale-95 transition-all duration-300"
              >
                Tampilkan Kode QR
              </Button>

              <Button
                variant="surface"
                size="lg"
                onClick={onStartAgain}
                rightIcon={<FlowerIcon className="size-6 text-sweet-primaryStrong" />}
                className="w-full sm:flex-1 min-h-[64px] text-lg font-heading font-extrabold rounded-full border-2 border-[#F3E6EE] active:scale-95 transition-all duration-300"
              >
                START AGAIN
              </Button>
            </div>

            <p className="text-xs sm:text-sm font-heading font-bold text-sweet-muted flex items-center justify-center gap-1.5 pt-1 mx-auto">
              <span>See you next time</span>
              <span>• Kembali otomatis dalam <strong className="text-sweet-primaryStrong">{secondsLeft}s</strong></span>
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
