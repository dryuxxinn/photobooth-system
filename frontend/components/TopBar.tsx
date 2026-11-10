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
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 animate-container-card">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenOperator();
          }
        }}
        title="Tahan 1.5 detik atau tekan Enter untuk membuka Diagnostik Operator"
        className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-[#F3E6EE] text-xs font-heading font-extrabold text-[#3F3D56] select-none transition-all hover:bg-white hover:opacity-100 opacity-80 active:scale-95 shadow-xs"
      >
        <span
          aria-hidden="true"
          className={`size-2.5 rounded-full ${
            cameraOffline || printerOffline ? "bg-[#B84C58]" : "bg-[#54866A]"
          }`}
        />
        <span className="flex items-center gap-1.5">
          <HeartIcon className="size-3.5 text-[#F472B6]" />
          <span>{STEP_LABELS[kioskStep]}</span>
        </span>

        {cameraOffline && (
          <span className="px-2 py-0.5 rounded-md bg-[#B84C58] text-white text-[10px]">
            Kamera Offline
          </span>
        )}
        {printerOffline && (
          <span className="px-2 py-0.5 rounded-md bg-[#B84C58] text-white text-[10px]">
            Printer Offline
          </span>
        )}
      </button>

      {showOperatorBtn && (
        <button
          type="button"
          onClick={onOpenOperator}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white hover:bg-sweet-blush border-2 border-sweet-border text-xs font-heading font-bold text-sweet-text inline-flex items-center gap-1.5"
        >
          <SettingsIcon className="size-3.5" />
          <span>Operator</span>
        </button>
      )}
    </div>
  );
}
