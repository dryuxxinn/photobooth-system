"use client";

import React from "react";
import { PrinterStatus } from "@/types/photobooth";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FlowerIcon,
  HeartIcon,
  PrinterIcon,
  SpinnerIcon,
} from "@/components/icons";

interface PrintingScreenProps {
  printerStatus: PrinterStatus | null;
  copies: number;
}

export function PrintingScreen({ printerStatus, copies }: PrintingScreenProps) {
  const printerReady = printerStatus?.ready ?? true;
  const printerName = printerStatus?.printer_name || "Sweet Studio Printer";

  return (
    <section
      aria-labelledby="printing-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-8 text-center animate-screen-fade"
    >
      <Card
        variant="surface"
        padding="lg"
        className="max-w-lg w-full flex flex-col items-center space-y-5"
      >
        <div className="relative size-24 rounded-full bg-sweet-blush border-4 border-sweet-primary flex items-center justify-center text-sweet-primaryStrong shadow-sweet animate-float-soft">
          <FlowerIcon className="size-11" />
          <span className="absolute -bottom-1 -right-1 size-9 rounded-full bg-sweet-surface border-2 border-sweet-primary flex items-center justify-center text-sweet-text">
            <PrinterIcon className="size-5" />
          </span>
        </div>

        <div className="space-y-2">
          <h1
            id="printing-heading"
            className="font-heading font-extrabold text-3xl text-sweet-text"
          >
            PRINTING YOUR JOY
          </h1>
          <p className="text-base text-sweet-muted font-medium">
            Your memories are on their way! • Mencetak {copies} lembar foto...
          </p>
        </div>

        {/* Real Backend Printer Status Box */}
        <div className="w-full p-4 rounded-2xl bg-sweet-bg border-2 border-sweet-border flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <SpinnerIcon className="size-4 text-sweet-primaryStrong" />
            <span className="font-heading font-bold text-sm text-sweet-text">
              Status Printer: {printerName}
            </span>
          </div>
          <StatusBadge tone={printerReady ? "success" : "error"}>
            {printerStatus?.message ||
              (printerReady
                ? "Mengirim pekerjaan cetak ke antrean printer"
                : "Printer sedang sibuk / offline")}
          </StatusBadge>
        </div>

        <p className="text-sm font-heading font-bold text-sweet-muted flex items-center gap-1.5">
          <span>Please wait a little moment</span>
          <HeartIcon className="size-4 text-sweet-primaryStrong" />
        </p>
      </Card>
    </section>
  );
}
