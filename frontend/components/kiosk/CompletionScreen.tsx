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

  const { secondsLeft } = useIdleCountdown({
    enabled: !qrOpen,
    totalSeconds: COMPLETION_AUTO_RESET_SECONDS,
    onExpire: onStartAgain,
  });

  const finalImageUrl = resolveStorageUrl(
    completedSession?.processed_image_url
  );

  const handleDownload = async () => {
    if (!finalImageUrl) return;
    window.open(finalImageUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      aria-labelledby="completion-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-6 text-center overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      <Card
        variant="surface"
        padding="lg"
        className="max-w-xl w-full flex flex-col items-center space-y-5"
      >
        <div className="size-20 rounded-full bg-sweet-primary/80 border-4 border-sweet-primaryStrong/40 flex items-center justify-center text-sweet-primaryStrong shadow-sweet animate-float-soft">
          <HeartIcon className="size-10" />
        </div>

        <div className="space-y-1.5">
          <h1
            id="completion-heading"
            className="font-heading font-extrabold text-3xl md:text-4xl text-sweet-text"
          >
            THANK YOU!
          </h1>
          <p className="text-base md:text-lg text-sweet-muted font-medium">
            Hope you love your photos! • Jangan lupa ambil hasil cetakanmu ya ♡
          </p>
        </div>

        {finalImageUrl && (
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-3xl bg-sweet-bg border-2 border-sweet-border w-full justify-center">
            <img
              src={finalImageUrl}
              alt="Hasil akhir foto sesi Anda"
              className="h-40 w-auto object-contain rounded-xl border border-sweet-border shadow-sm"
            />
            <div className="text-left space-y-2.5 max-w-xs">
              <StatusBadge
                tone="pink"
                icon={<SparkleIcon className="size-3.5 text-sweet-primaryStrong" />}
              >
                Simpan Versi Digital
              </StatusBadge>
              <p className="text-xs text-sweet-muted">
                Ingin menyimpan foto ini di ponselmu? Pindai kode QR sebelum
                layar kembali ke menu utama.
              </p>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<QrIcon className="size-4" />}
                onClick={() => setQrOpen(true)}
              >
                Tampilkan Kode QR
              </Button>
            </div>
          </div>
        )}

        <div className="w-full space-y-3 pt-1">
          <Button
            variant="primary"
            size="xl"
            onClick={onStartAgain}
            rightIcon={<FlowerIcon className="size-6 text-sweet-primaryStrong" />}
            className="w-full min-h-[68px] text-xl shadow-sweetLg border-sweet-primaryStrong"
          >
            START AGAIN
          </Button>

          <p className="text-xs font-heading font-bold text-sweet-muted flex items-center justify-center gap-1.5">
            <span>See you next time ✿</span>
            <span>• Kembali ke halaman awal dalam {secondsLeft} detik</span>
          </p>
        </div>
      </Card>

      {completedSession && (
        <QrDialog
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          imageUrl={finalImageUrl}
          sessionId={completedSession.session_id}
          onDownloadOrShare={handleDownload}
        />
      )}
    </section>
  );
}
