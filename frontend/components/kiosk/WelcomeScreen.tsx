"use client";

import React from "react";
import { FrameThemeOption, TemplateOption } from "@/types/photobooth";
import { LayoutMock } from "@/components/LayoutMock";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BowIcon,
  FlowerIcon,
  HeartIcon,
  SparkleIcon,
} from "@/components/icons";

interface WelcomeScreenProps {
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  selectedTemplate: TemplateOption;
  selectedFrameColor: string;
  cameraConnected: boolean;
  onStartTapped: () => void;
}

export function WelcomeScreen({
  templates,
  frameThemes,
  selectedTemplate,
  selectedFrameColor,
  cameraConnected,
  onStartTapped,
}: WelcomeScreenProps) {
  const sampleLeft =
    templates.find((t) => t.id === "classic_strip_3") ||
    templates[0] ||
    selectedTemplate;
  const sampleRight =
    templates.find((t) => t.id === "grid_2x2_4") ||
    templates[1] ||
    selectedTemplate;

  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex-1 min-h-0 flex flex-col items-center justify-between px-6 py-4 text-center overflow-y-auto kiosk-scroll animate-screen-fade"
    >
      {/* Top Hero Badge & Subtitle */}
      <div className="space-y-1.5 max-w-xl">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-sweet-surface/90 border-2 border-sweet-primary shadow-sweet">
          <SparkleIcon className="size-4 text-sweet-primaryStrong" />
          <span className="font-heading font-extrabold text-sm tracking-widest text-sweet-text">
            ✦ SWEET STUDIO ✦
          </span>
          <SparkleIcon className="size-4 text-sweet-primaryStrong" />
        </div>
        <p className="text-base font-heading font-semibold text-sweet-muted italic">
          every moment is lovely
        </p>
      </div>

      {/* Center Polaroid & Strip Illustration Showcase */}
      <div className="relative my-1 flex items-center justify-center w-full max-w-2xl py-2">
        {/* Floating decorative stickers */}
        <span
          aria-hidden="true"
          className="hidden sm:flex absolute -top-1 left-12 size-11 rounded-2xl bg-sweet-blush border-2 border-sweet-primary items-center justify-center text-sweet-primaryStrong shadow-sweet animate-float-soft"
        >
          <HeartIcon className="size-5" />
        </span>
        <span
          aria-hidden="true"
          className="hidden sm:flex absolute top-2 right-12 size-11 rounded-2xl bg-sweet-lavenderSoft border-2 border-sweet-secondary items-center justify-center text-[#7A65B5] shadow-sweet animate-float-soft"
        >
          <FlowerIcon className="size-5" />
        </span>

        <div className="flex items-center justify-center gap-4 sm:gap-7">
          {/* Left decorative tilted strip */}
          <div className="hidden sm:block -rotate-6 transform transition-transform bg-white p-2.5 rounded-3xl border-2 border-sweet-border shadow-sweet">
            <LayoutMock
              template={sampleLeft}
              frameColorId="cream"
              frameThemes={frameThemes}
              captionText="BESTIES ♡"
              className="h-44 w-auto"
            />
          </div>

          {/* Center Featured Polaroid / Strip Card */}
          <div className="relative z-10 bg-white p-3.5 rounded-[2rem] border-2 border-sweet-primary shadow-sweetLg flex flex-col items-center gap-2">
            <LayoutMock
              template={selectedTemplate}
              frameColorId={selectedFrameColor}
              frameThemes={frameThemes}
              captionText="SWEET STUDIO"
              className="h-52 sm:h-56 w-auto"
            />
            <div className="flex items-center gap-2 text-sweet-primaryStrong">
              <HeartIcon className="size-4" />
              <BowIcon className="size-5" />
              <FlowerIcon className="size-4" />
              <HeartIcon className="size-4" />
            </div>
          </div>

          {/* Right decorative tilted postcard */}
          <div className="hidden sm:block rotate-6 transform transition-transform bg-white p-2.5 rounded-3xl border-2 border-sweet-border shadow-sweet">
            <LayoutMock
              template={sampleRight}
              frameColorId="lavender"
              frameThemes={frameThemes}
              captionText="LOVELY DAY"
              className="h-40 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Headline & Big Touch CTA */}
      <div className="space-y-3 w-full max-w-md">
        <div className="space-y-0.5">
          <h1
            id="welcome-heading"
            className="font-heading font-extrabold text-sweet-text"
            style={{ fontSize: "clamp(1.75rem, 1.2rem + 2vw, 2.45rem)" }}
          >
            Let&apos;s make memories!
          </h1>
          <p className="text-sm text-sweet-muted mx-auto">
            Abadikan momen manis bersama sahabat atau pasangan dalam hitungan
            detik.
          </p>
        </div>

        {!cameraConnected ? (
          <div className="p-4 rounded-3xl bg-[#FCECEE] border-2 border-[#EABAC0] space-y-2">
            <StatusBadge tone="error">Kamera Sedang Tidak Siap</StatusBadge>
            <p className="text-sm text-sweet-text font-medium">
              Kamera belum terhubung ke booth. Silakan hubungi operator atau
              tunggu beberapa saat.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <Button
              variant="primary"
              size="xl"
              onClick={onStartTapped}
              rightIcon={<HeartIcon className="size-6 text-sweet-primaryStrong" />}
              className="w-full min-h-[72px] text-2xl shadow-sweetLg border-sweet-primaryStrong"
            >
              START PHOTO
            </Button>
            <p className="text-sm font-heading font-bold text-sweet-muted tracking-wide">
              Touch to begin • Sentuh tombol untuk memulai ✿
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
