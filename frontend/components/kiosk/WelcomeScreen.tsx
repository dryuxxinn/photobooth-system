"use client";

import React from "react";
import { FrameThemeOption, TemplateOption } from "@/types/photobooth";
import { LayoutMock } from "@/components/LayoutMock";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertIcon,
  BowIcon,
  FlowerIcon,
  HeartIcon,
  RefreshIcon,
  SparkleIcon,
} from "@/components/icons";

interface WelcomeScreenProps {
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  selectedTemplate: TemplateOption;
  selectedFrameColor: string;
  cameraConnected: boolean;
  onStartTapped: () => void;
  welcomeMode?: "static" | "live_preview";
  attachVideoRef?: (node: HTMLVideoElement | null) => void;
  streamReady?: boolean;
  isMirrored?: boolean;
  deviceLabel?: string;
  filterCss?: string;
  webcamError?: string | null;
  onRetryWebcam?: () => void;
}

export function WelcomeScreen({
  templates,
  frameThemes,
  selectedTemplate,
  selectedFrameColor,
  cameraConnected,
  onStartTapped,
  welcomeMode = "static",
  attachVideoRef,
  streamReady = false,
  isMirrored = true,
  deviceLabel = "Webcam",
  filterCss = "none",
  webcamError = null,
  onRetryWebcam,
}: WelcomeScreenProps) {
  const sampleLeft =
    templates.find((t) => t.id === "classic_strip_3") ||
    templates[0] ||
    selectedTemplate;
  const sampleRight =
    templates.find((t) => t.id === "grid_2x2_4") ||
    templates[1] ||
    selectedTemplate;

  // 1. RENDER MODE A: LIVE MIRROR (ATTRACT MODE) - FULL-HEIGHT SIDE-BY-SIDE IMMERSIVE KIOSK
  if (welcomeMode === "live_preview") {
    return (
      <section
        aria-labelledby="welcome-heading"
        className="flex-1 min-h-0 w-full flex flex-col justify-center px-3 sm:px-5 lg:px-7 py-3 lg:py-4 overflow-hidden relative select-none"
      >
        <div className="w-full flex-1 min-h-0 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch max-w-[1880px]">
          {/* Kolom Kiri/Tengah (8-9 Cols): Viewport Kamera Live Mirror Masif Full-Height */}
          <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 h-full min-h-0 flex flex-col animate-container-left">
            <button
              type="button"
              onClick={onStartTapped}
              aria-label="Sentuh cermin kamera untuk mulai berfoto"
              className="group relative w-full h-full min-h-0 rounded-[2.5rem] bg-white p-3 sm:p-4 border-4 border-white shadow-sweetLg overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-[#FBCFE8] hover:shadow-glow active:scale-[0.995]"
            >
              {/* Top Floating Mirror HUD Badges */}
              <div className="absolute top-4 inset-x-4 sm:top-5 sm:inset-x-5 flex items-center justify-between gap-3 z-20 pointer-events-none">
                <div className="px-4 py-2 rounded-full bg-[#3F3D56]/85 text-white backdrop-blur-md border border-white/30 text-xs font-heading font-extrabold flex items-center gap-2.5 shadow-md">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F472B6] opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-[#DB2777]" />
                  </span>
                  <span>LIVE MIRROR • CERMIN INTERAKTIF</span>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-white/90 text-xs font-heading font-extrabold text-[#3F3D56] flex items-center gap-2 shadow-md">
                  <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                  <span>Sentuh Cermin Untuk Mulai</span>
                </div>
              </div>

              {/* Viewport Frame Container - Full Container Fit */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-[#242232] relative flex items-center justify-center">
                <video
                  ref={attachVideoRef}
                  width={1920}
                  height={1080}
                  autoPlay
                  playsInline
                  muted
                  style={{ filter: filterCss || "none" }}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    streamReady ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
                  } ${isMirrored ? "-scale-x-100" : ""}`}
                />

                {!streamReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 bg-[#2D2B3F] text-center p-6 text-white z-10">
                    {webcamError ? (
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md">
                        <div className="size-16 rounded-3xl bg-[#B84C58]/30 border-2 border-[#B84C58] flex items-center justify-center text-[#FBCFE8] shadow-sweet">
                          <AlertIcon className="size-8 text-[#FBCFE8]" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-heading font-extrabold text-lg text-white block">
                            Akses Kamera Belum Diizinkan
                          </span>
                          <p className="text-xs text-white/80 font-heading font-medium leading-relaxed">
                            {webcamError}
                          </p>
                        </div>
                        {onRetryWebcam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryWebcam();
                            }}
                            className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#DB2777] hover:bg-[#BE185D] text-white text-xs font-heading font-extrabold shadow-sweet active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshIcon className="size-4" />
                            <span>Buka / Izinkan Kamera</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="size-20 rounded-3xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-[#FBCFE8] shadow-sweet animate-float-soft">
                          <BowIcon className="size-10" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <span className="font-heading font-extrabold text-lg text-white block">
                            Menyiapkan Cermin Studio...
                          </span>
                          <span className="text-xs text-white/70 font-heading font-medium block">
                            Kamera akan langsung menyala otomatis. Silakan rapikan posemu di depan cermin.
                          </span>
                        </div>
                        {onRetryWebcam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryWebcam();
                            }}
                            className="mt-1 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-heading font-bold text-white transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshIcon className="size-3.5" />
                            <span>Nyalakan Kamera Sekarang</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Aesthetic Photobooth Framing Overlay */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between"
                >
                  {/* 4 Corner Studio Photo Reticles */}
                  <div className="w-full flex items-center justify-between">
                    <div className="size-10 sm:size-12 border-t-4 border-l-4 border-white/90 drop-shadow-md rounded-tl-xl flex items-start justify-start p-1">
                      <span className="size-2 rounded-full bg-[#DB2777]" />
                    </div>
                    <div className="size-10 sm:size-12 border-t-4 border-r-4 border-white/90 drop-shadow-md rounded-tr-xl flex items-start justify-end p-1">
                      <span className="size-2 rounded-full bg-[#DB2777]" />
                    </div>
                  </div>

                  {/* Subtle Center Face & Pose Oval Alignment Guide (Only when stream is active) */}
                  {streamReady ? (
                    <div className="mx-auto w-[46%] max-w-[340px] h-[68%] max-h-[460px] rounded-[48%] border-2 border-dashed border-white/60 drop-shadow flex flex-col items-center justify-center relative opacity-75 group-hover:opacity-100 transition-opacity">
                      <div className="size-6 relative flex items-center justify-center opacity-60">
                        <span className="absolute w-full h-[1.5px] bg-white" />
                        <span className="absolute h-full w-[1.5px] bg-white" />
                      </div>
                      <span className="mt-3 px-3 py-1 rounded-full bg-[#3F3D56]/60 backdrop-blur-md text-[11px] font-heading font-extrabold text-white tracking-widest uppercase border border-white/30">
                        Posisikan Wajah
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="w-full flex items-center justify-between">
                    <div className="size-10 sm:size-12 border-b-4 border-l-4 border-white/90 drop-shadow-md rounded-bl-xl flex items-end justify-start p-1">
                      <span className="size-2 rounded-full bg-[#DB2777]" />
                    </div>
                    <div className="size-10 sm:size-12 border-b-4 border-r-4 border-white/90 drop-shadow-md rounded-br-xl flex items-end justify-end p-1">
                      <span className="size-2 rounded-full bg-[#DB2777]" />
                    </div>
                  </div>
                </div>

                {/* Bottom Photobooth Studio Watermark Ribbon */}
                <div className="absolute bottom-4 inset-x-4 sm:bottom-5 sm:inset-x-5 z-20 pointer-events-none flex items-center justify-between px-5 py-2.5 rounded-2xl bg-white/92 backdrop-blur-md border border-white/90 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <BowIcon className="size-4 text-sweet-primaryStrong" />
                    <span className="font-heading font-extrabold text-xs sm:text-sm text-[#3F3D56] tracking-wider">
                      SWEET STUDIO PHOTOBOOTH
                    </span>
                  </div>
                  <span className="text-xs font-heading font-semibold text-sweet-muted hidden md:inline">
                    Korean Self Photo Kiosk • a little moment, a lovely memory
                  </span>
                  <div className="flex items-center gap-2 text-sweet-primaryStrong">
                    <HeartIcon className="size-4 fill-[#DB2777]" />
                    <SparkleIcon className="size-4" />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Kolom Kanan (4 Cols): Unified Luxury Studio Control Dock */}
          <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 h-full min-h-0 flex flex-col animate-container-right">
            <div className="rounded-[2.5rem] bg-white/95 backdrop-blur-xl border-3 border-white shadow-sweetLg p-5 sm:p-6 lg:p-7 flex flex-col justify-between h-full min-h-0 relative overflow-hidden">
              {/* Top Studio Brand Block */}
              <div className="flex flex-col items-center text-center space-y-2 pt-1">
                <div className="size-16 sm:size-18 rounded-3xl bg-gradient-to-tr from-[#FBCFE8] via-[#F472B6] to-[#DB2777] border-3 border-white flex items-center justify-center text-white shadow-sweet-strip animate-float-soft">
                  <BowIcon className="size-9 sm:size-10" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                    <h1
                      id="welcome-heading"
                      className="font-heading font-extrabold text-2xl sm:text-3xl tracking-wider text-[#3F3D56]"
                    >
                      SWEET STUDIO
                    </h1>
                    <SparkleIcon className="size-4 text-sweet-primaryStrong" />
                  </div>
                  <p className="text-xs font-heading font-semibold text-sweet-muted tracking-wide mx-auto">
                    a little moment, a lovely memory
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sweet-surface border border-[#FBCFE8] text-[11px] font-heading font-extrabold text-sweet-primaryStrong tracking-wider uppercase">
                  <span>SELF PHOTO KIOSK</span>
                </div>
              </div>

              {/* Subtle Gradient Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#F3E6EE] to-transparent my-1" />

              {/* Middle Experience Highlights */}
              <div className="space-y-2.5 py-1">
                <span className="text-xs font-heading font-extrabold text-[#3F3D56] tracking-wider uppercase block text-center">
                  Pengalaman di Sesi Ini:
                </span>
                <div className="space-y-2 text-xs sm:text-sm font-heading font-semibold text-sweet-text">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-sweet-surface border border-[#F3E6EE] shadow-xs">
                    <div className="size-9 rounded-xl bg-[#FCE7F3] flex items-center justify-center text-sweet-primaryStrong shrink-0">
                      <HeartIcon className="size-5 fill-[#DB2777]" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-[#3F3D56]">Ambil 6 Pose Terbaik</span>
                      <span className="text-[11px] text-sweet-muted font-medium">Bebas berekspresi bersama teman</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-sweet-surface border border-[#F3E6EE] shadow-xs">
                    <div className="size-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#9E8CE0] shrink-0">
                      <SparkleIcon className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-[#3F3D56]">Filter Beauty & AR Stiker</span>
                      <span className="text-[11px] text-sweet-muted font-medium">Visual glowing dan stiker estetik</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-sweet-surface border border-[#F3E6EE] shadow-xs">
                    <div className="size-9 rounded-xl bg-[#FFE4E6] flex items-center justify-center text-sweet-primaryStrong shrink-0">
                      <BowIcon className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-[#3F3D56]">Cetak Instan & Boomerang GIF</span>
                      <span className="text-[11px] text-sweet-muted font-medium">Cetak strip 4R + scan QR langsung</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-sweet-surface/80 border border-[#F3E6EE] text-center">
                  <p className="text-xs font-heading font-medium text-sweet-text">
                    Rapikan gayamu di cermin, lalu sentuh tombol untuk mulai berfoto!
                  </p>
                </div>
              </div>

              {/* Bottom Grand Call-to-Action */}
              <div className="space-y-2 pt-1 text-center">
                {!cameraConnected ? (
                  <div className="p-3.5 rounded-2xl bg-[#FCECEE] border-2 border-[#EABAC0] space-y-1.5 text-center">
                    <StatusBadge tone="error">Kamera Tidak Siap</StatusBadge>
                    <p className="text-xs text-sweet-text font-medium mx-auto">
                      Kamera belum terhubung ke booth. Silakan hubungi operator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="strong"
                      size="xl"
                      onClick={onStartTapped}
                      rightIcon={<HeartIcon className="size-7 sm:size-8 text-white fill-white" />}
                      className="w-full min-h-[76px] sm:min-h-[82px] text-2xl sm:text-3xl font-heading font-extrabold shadow-sweet-strip rounded-full animate-pulse-cta active:scale-95 transition-all duration-300"
                    >
                      START PHOTO
                    </Button>
                    <div className="space-y-0.5">
                      <p className="text-[11px] sm:text-xs font-heading font-extrabold text-sweet-muted tracking-widest uppercase mx-auto text-center">
                        TOUCH TO BEGIN • SENTUH UNTUK MEMULAI
                      </p>
                      <p className="text-[11px] font-heading font-semibold text-sweet-primaryStrong mx-auto text-center">
                        atau sentuh langsung cermin live di samping
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 2. RENDER MODE B: SHOWCASE STATIS (3D PERSPECTIVE STRIPS)
  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex-1 min-h-0 flex flex-col justify-between items-center px-6 py-4 sm:py-6 text-center overflow-hidden relative"
    >
      {/* Center Hero Branding: Sweet Studio Logo */}
      <div className="pt-1 sm:pt-2 flex flex-col items-center justify-center gap-2 z-10 stagger-item stagger-1 shrink-0">
        <div className="size-16 sm:size-20 rounded-3xl bg-gradient-to-tr from-[#FBCFE8] via-[#F472B6] to-[#DB2777] border-3 border-white/95 flex items-center justify-center text-white shadow-sweet-strip animate-float-soft">
          <BowIcon className="size-9 sm:size-11" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-2">
            <SparkleIcon className="size-4 text-sweet-primaryStrong" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-widest text-[#3F3D56]">
              SWEET STUDIO
            </span>
            <SparkleIcon className="size-4 text-sweet-primaryStrong" />
          </div>
          <p className="text-xs sm:text-sm font-heading font-semibold text-sweet-muted tracking-wide mx-auto">
            a little moment, a lovely memory
          </p>
        </div>
      </div>

      {/* Center 3D Floating Photo Strips Showcase (Antigravity Perspective Stage) */}
      <div className="relative my-auto py-2 flex flex-col items-center justify-center w-full max-w-3xl mx-auto stagger-item stagger-2 flex-1 min-h-0">
        {/* Floating decorative stickers anchored tightly around the 3 strips */}
        <span
          aria-hidden="true"
          className="absolute -top-2 left-8 sm:left-20 md:left-28 size-12 rounded-2xl bg-white/95 border-2 border-[#FBCFE8] flex items-center justify-center text-sweet-primaryStrong shadow-sweet animate-float-soft z-20"
        >
          <HeartIcon className="size-6 text-sweet-primaryStrong" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-1 right-8 sm:right-20 md:right-28 size-12 rounded-2xl bg-white/95 border-2 border-[#DCD6F7] flex items-center justify-center text-[#9E8CE0] shadow-sweet animate-float-soft z-20"
        >
          <FlowerIcon className="size-6 text-[#9E8CE0]" />
        </span>

        {/* 3 Floating Photo Strips in True 3D Perspective (1200px Z-Axis Stage) */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 antigravity-stage py-3">
          {/* 1. Left Tilted Floating Strip */}
          <div className="animate-float-strip-1 bg-white p-3 rounded-3xl border-2 border-[#F3E6EE] shadow-sweet-strip transition-transform duration-300">
            <LayoutMock
              template={sampleLeft}
              frameColorId="cream"
              frameThemes={frameThemes}
              captionText="BESTIES"
              className="h-44 sm:h-52 md:h-56 w-auto"
            />
          </div>

          {/* 2. Center Highlighted Strip (Hero Z-Elevated) */}
          <div className="animate-float-strip-2 relative z-10 bg-white p-3.5 sm:p-4 rounded-[2.2rem] border-4 border-[#FBCFE8] shadow-sweet-strip flex flex-col items-center gap-2">
            <LayoutMock
              template={selectedTemplate}
              frameColorId={selectedFrameColor}
              frameThemes={frameThemes}
              captionText="SWEET STUDIO"
              className="h-52 sm:h-60 md:h-64 w-auto"
            />
            <div className="flex items-center gap-2 text-sweet-primaryStrong pt-1">
              <HeartIcon className="size-3.5 fill-[#DB2777]" />
              <BowIcon className="size-4" />
              <SparkleIcon className="size-3.5" />
              <FlowerIcon className="size-3.5" />
            </div>
          </div>

          {/* 3. Right Tilted Floating Strip */}
          <div className="animate-float-strip-3 bg-white p-3 rounded-3xl border-2 border-white/95 shadow-sweet-strip transition-transform duration-300">
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

      {/* Center-Bottom Headline & Big Tactile Touch CTA */}
      <div className="space-y-3.5 w-full max-w-lg mx-auto z-10 pb-2 stagger-item stagger-3 shrink-0">
        <div className="space-y-1">
          <h1
            id="welcome-heading"
            className="font-heading font-extrabold text-[#3F3D56] tracking-wide"
            style={{ fontSize: "clamp(2.1rem, 1.5rem + 2.2vw, 2.85rem)" }}
          >
            Let&apos;s make memories!
          </h1>
          <p className="text-sm sm:text-base font-heading font-medium text-sweet-muted mx-auto">
            Abadikan momen manis bersama sahabat atau pasangan dalam hitungan detik.
          </p>
        </div>

        {!cameraConnected ? (
          <div className="p-4 rounded-3xl bg-[#FCECEE] border-2 border-[#EABAC0] space-y-2">
            <StatusBadge tone="error">Kamera Sedang Tidak Siap</StatusBadge>
            <p className="text-sm text-sweet-text font-medium mx-auto">
              Kamera belum terhubung ke booth. Silakan hubungi operator atau tunggu beberapa saat.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 stagger-item stagger-4">
            <Button
              variant="strong"
              size="xl"
              onClick={onStartTapped}
              rightIcon={<HeartIcon className="size-8 text-white fill-white" />}
              className="w-full min-h-[76px] text-2xl sm:text-3xl font-heading font-extrabold shadow-sweet-strip rounded-full animate-pulse-cta active:scale-95 transition-all duration-300"
            >
              START PHOTO
            </Button>
            <p className="text-xs sm:text-sm font-heading font-extrabold text-sweet-muted tracking-widest uppercase mx-auto">
              TOUCH TO BEGIN • SENTUH TOMBOL UNTUK MEMULAI
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
