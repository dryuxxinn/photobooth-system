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
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      title="Tahan 1.5 detik untuk membuka Diagnostik Operator"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-sweet text-xs font-heading font-extrabold text-[#3F3D56] cursor-default select-none transition-all hover:bg-white active:scale-95 animate-container-card"
    >
      <span className="size-2 rounded-full bg-[#F472B6] animate-ping" />
      <span className="flex items-center gap-1.5">
        <HeartIcon className="size-3 text-[#F472B6]" />
        <span>{STEP_LABELS[kioskStep]}</span>
      </span>

      {cameraOffline && (
        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] shadow-xs">
          Kamera Offline
        </span>
      )}
      {printerOffline && (
        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] shadow-xs">
          Printer Offline
        </span>
      )}

      {showOperatorBtn && (
        <button
          type="button"
          onClick={onOpenOperator}
          className="ml-1 px-2.5 py-1 rounded-full bg-sweet-surface hover:bg-sweet-blush border border-sweet-border text-[11px] font-heading font-bold text-sweet-text inline-flex items-center gap-1"
        >
          <SettingsIcon className="size-3" />
          <span>Operator</span>
        </button>
      )}
    </div>
  );
}
