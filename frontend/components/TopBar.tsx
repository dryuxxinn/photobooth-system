"use client";

import React, { useEffect, useRef, useState } from "react";
import { CameraStatus, KioskSubStep, PrinterStatus } from "@/types/photobooth";
import { OPERATOR_LONG_PRESS_MS } from "@/lib/config";
import {
  BowIcon,
  HeartIcon,
  SettingsIcon,
  SparkleIcon,
} from "@/components/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface TopBarProps {
  kioskStep: KioskSubStep;
  cameraStatus: CameraStatus | null;
  printerStatus: PrinterStatus | null;
  onOpenOperator: () => void;
}

const STEP_LABELS: Record<KioskSubStep, string> = {
  WELCOME: "Welcome",
  PREPARATION: "Persiapan Pose",
  CAPTURING: "Sesi Pemotretan",
  PHOTO_SELECTION: "Pilih Foto Favorit",
  TEMPLATE_SELECTION: "Pilih Desain Frame",
  PREVIEW: "Preview Hasil",
  PRINTING: "Mencetak Foto",
  COMPLETION: "Sesi Selesai",
};

export function TopBar({
  kioskStep,
  cameraStatus,
  printerStatus,
  onOpenOperator,
}: TopBarProps) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOperatorBtn, setShowOperatorBtn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("operator") || params.has("admin")) {
        setShowOperatorBtn(true);
      }
    }
  }, []);

  const handlePointerDown = () => {
    pressTimerRef.current = setTimeout(() => {
      onOpenOperator();
    }, OPERATOR_LONG_PRESS_MS);
  };

  const clearPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const cameraOffline = cameraStatus !== null && !cameraStatus.connected;
  const printerOffline = printerStatus !== null && !printerStatus.ready;

  return (
    <header className="w-full px-6 py-3.5 flex items-center justify-between gap-4 border-b border-sweet-border/80 bg-sweet-surface/80 backdrop-blur-md z-20 shrink-0">
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        title="Tahan 1.5 detik untuk membuka Diagnostik Operator"
        className="flex items-center gap-3 cursor-default select-none"
      >
        <div className="size-11 rounded-2xl bg-sweet-primary/80 border-2 border-sweet-primaryStrong/40 flex items-center justify-center text-sweet-text shadow-sm">
          <BowIcon className="size-6 text-sweet-primaryStrong" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
            <span className="font-heading font-extrabold text-lg tracking-wider text-sweet-text">
              SWEET STUDIO
            </span>
            <SparkleIcon className="size-3.5 text-sweet-primaryStrong" />
          </div>
          <p className="text-xs text-sweet-muted font-medium">
            a little moment, a lovely memory ♡
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap justify-end">
        {cameraOffline && (
          <StatusBadge tone="error">Kamera Belum Siap</StatusBadge>
        )}
        {printerOffline && (
          <StatusBadge tone="error">Printer Offline</StatusBadge>
        )}

        <StatusBadge
          tone="lavender"
          icon={<HeartIcon className="size-3.5 text-sweet-primaryStrong" />}
        >
          {STEP_LABELS[kioskStep]}
        </StatusBadge>

        {showOperatorBtn && (
          <button
            type="button"
            onClick={onOpenOperator}
            className="min-h-[44px] px-4 py-2 rounded-full bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-bold text-sweet-text inline-flex items-center gap-1.5"
          >
            <SettingsIcon className="size-4" />
            <span>Panel Operator</span>
          </button>
        )}
      </div>
    </header>
  );
}
