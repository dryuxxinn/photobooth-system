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
      className="flex-1 min-h-0 flex flex-col justify-between items-center px-6 py-6 sm:py-8 text-center overflow-y-auto kiosk-scroll relative"
    >
      {/* Center Hero Branding: Sweet Studio Logo */}
      <div className="pt-2 sm:pt-4 flex flex-col items-center justify-center gap-2 z-10 animate-container-card">
        <div className="size-16 sm:size-20 rounded-3xl bg-gradient-to-tr from-[#FBCFE8] via-[#F472B6] to-[#EC4899] border-3 border-white/90 flex items-center justify-center text-white shadow-sweet-strip animate-float-soft">
          <BowIcon className="size-9 sm:size-11" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-2">
            <SparkleIcon className="size-4 text-[#F472B6]" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-widest text-[#3F3D56]">
              SWEET STUDIO
            </span>
            <SparkleIcon className="size-4 text-[#F472B6]" />
          </div>
          <p className="text-xs sm:text-sm font-heading font-semibold text-sweet-muted tracking-wide">
            a little moment, a lovely memory ♡
          </p>
        </div>
      </div>

      {/* Center 3D Floating Photo Strips Showcase */}
      <div className="relative my-auto py-3 flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
        {/* Floating background decorative stickers */}
        <span
          aria-hidden="true"
          className="absolute -top-3 left-6 sm:left-14 size-12 rounded-2xl bg-white/85 backdrop-blur-sm border-2 border-[#FBCFE8] flex items-center justify-center text-sweet-primaryStrong shadow-sweet animate-float-soft"
        >
          <HeartIcon className="size-6 text-[#F472B6]" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-2 right-6 sm:right-14 size-12 rounded-2xl bg-white/85 backdrop-blur-sm border-2 border-[#DCD6F7] flex items-center justify-center text-[#9E8CE0] shadow-sweet animate-float-soft"
          style={{ animationDelay: "1.5s" }}
        >
          <FlowerIcon className="size-6 text-[#9E8CE0]" />
        </span>

        {/* 3 Floating Photo Strips in 3D Perspective */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 perspective-[1000px] py-2">
          {/* 1. Left Tilted Floating Strip */}
          <div className="animate-float-strip-1 bg-white p-3 rounded-3xl border-2 border-white/90 shadow-sweet-strip hover:scale-105 transition-transform duration-300">
            <LayoutMock
              template={sampleLeft}
              frameColorId="cream"
              frameThemes={frameThemes}
              captionText="BESTIES ♡"
              className="h-44 sm:h-52 md:h-56 w-auto"
            />
          </div>

          {/* 2. Center Highlighted Strip (Hero) */}
          <div className="animate-float-strip-2 relative z-10 bg-white p-3.5 sm:p-4 rounded-[2.2rem] border-4 border-[#FBCFE8] shadow-sweet-strip scale-105 sm:scale-110 flex flex-col items-center gap-2">
            <LayoutMock
              template={selectedTemplate}
              frameColorId={selectedFrameColor}
              frameThemes={frameThemes}
              captionText="SWEET STUDIO"
              className="h-52 sm:h-60 md:h-64 w-auto"
            />
            <div className="flex items-center gap-2 text-sweet-primaryStrong pt-1">
              <HeartIcon className="size-3.5 fill-[#F472B6]" />
              <BowIcon className="size-4" />
              <SparkleIcon className="size-3.5" />
              <FlowerIcon className="size-3.5" />
            </div>
          </div>

          {/* 3. Right Tilted Floating Strip */}
          <div className="animate-float-strip-3 bg-white p-3 rounded-3xl border-2 border-white/90 shadow-sweet-strip hover:scale-105 transition-transform duration-300">
            <LayoutMock
              template={sampleRight}
              frameColorId="lavender"
              frameThemes={frameThemes}
              captionText="LOVELY DAY"
              className="h-44 sm:h-52 md:h-56 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Center-Bottom Headline & Big Pulsating Touch CTA */}
      <div className="space-y-4 w-full max-w-lg mx-auto z-10 pb-4 animate-container-card">
        <div className="space-y-1">
          <h1
            id="welcome-heading"
            className="font-heading font-extrabold text-[#3F3D56] tracking-wide"
            style={{ fontSize: "clamp(2.2rem, 1.6rem + 2.4vw, 3rem)" }}
          >
            Let&apos;s make memories!
          </h1>
          <p className="text-sm sm:text-base font-heading font-medium text-sweet-muted">
            Abadikan momen manis bersama sahabat atau pasangan dalam hitungan detik ♡
          </p>
        </div>

        {!cameraConnected ? (
          <div className="p-4 rounded-3xl bg-[#FCECEE] border-2 border-[#EABAC0] space-y-2">
            <StatusBadge tone="error">Kamera Sedang Tidak Siap</StatusBadge>
            <p className="text-sm text-sweet-text font-medium">
              Kamera belum terhubung ke booth. Silakan hubungi operator atau tunggu beberapa saat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              variant="strong"
              size="xl"
              onClick={onStartTapped}
              rightIcon={<HeartIcon className="size-8 text-white fill-white" />}
              className="w-full min-h-[78px] text-2xl sm:text-3xl font-heading font-extrabold shadow-sweet-strip rounded-full animate-pulse-cta active:scale-95 transition-all duration-300"
            >
              START PHOTO
            </Button>
            <p className="text-xs sm:text-sm font-heading font-extrabold text-sweet-muted tracking-widest uppercase">
              ✦ TOUCH TO BEGIN • SENTUH TOMBOL UNTUK MEMULAI ✦
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
