"use client";

import React, { useState } from "react";
import {
  BoothOperatorConfig,
  FrameThemeOption,
  TemplateOption,
} from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { LayoutMock } from "@/components/LayoutMock";
import { PHOTO_FILTERS } from "@/lib/defaults";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CameraIcon, CheckIcon } from "@/components/icons";

interface TemplateManagerProps {
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  config: BoothOperatorConfig;
  onUpdateConfig: (next: BoothOperatorConfig) => void;
  onRefreshTemplates?: () => Promise<void>;
}

export function TemplateManager({
  templates,
  frameThemes,
  config,
  onUpdateConfig,
  onRefreshTemplates,
}: TemplateManagerProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [overlayNotice, setOverlayNotice] = useState<string | null>(null);

  const handleOverlayFileChange = async (
    templateId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(templateId);
    setOverlayNotice(null);

    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal membaca file PNG"));
        reader.readAsDataURL(file);
      });
      const res = await photoboothApi.uploadTemplateOverlay(
        templateId,
        dataUrl
      );
      setOverlayNotice(res.message);
      if (onRefreshTemplates) await onRefreshTemplates();
    } catch (err: any) {
      setOverlayNotice(err?.message || "Gagal mengunggah PNG overlay.");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  const handleRemoveOverlay = async (templateId: string) => {
    setUploadingId(templateId);
    setOverlayNotice(null);
    try {
      const res = await photoboothApi.deleteTemplateOverlay(templateId);
      setOverlayNotice(res.message);
      if (onRefreshTemplates) await onRefreshTemplates();
    } catch (err: any) {
      setOverlayNotice(err?.message || "Gagal menghapus overlay.");
    } finally {
      setUploadingId(null);
    }
  };

  const toggleTemplateEnabled = (id: string) => {
    const exists = config.enabledTemplateIds.includes(id);
    if (exists && config.enabledTemplateIds.length <= 1) return;
    const nextIds = exists
      ? config.enabledTemplateIds.filter((item) => item !== id)
      : [...config.enabledTemplateIds, id];
    const nextDefault = nextIds.includes(config.defaultTemplateId)
      ? config.defaultTemplateId
      : nextIds[0];
    onUpdateConfig({
      ...config,
      enabledTemplateIds: nextIds,
      defaultTemplateId: nextDefault,
    });
  };

  return (
    <div className="space-y-5">
      {/* Pengaturan Hardware & Arsitektur Kamera Kiosk (Hanya via Admin) */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <CameraIcon className="size-5 text-sweet-primaryStrong" />
              <span>Arsitektur Kamera Kiosk & Hardware</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Tentukan arsitektur kamera yang digunakan pada kios pelanggan (diatur khusus via admin).
            </p>
          </div>
          <StatusBadge tone={config.cameraSourceMode === "server" ? "lavender" : "pink"}>
            Mode: {config.cameraSourceMode === "server" ? "DSLR Server (USB)" : "iPad / Capture Card"}
          </StatusBadge>
        </div>

        {/* Pilihan Mode Arsitektur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              const next = { ...config, cameraSourceMode: "webcam" as const };
              onUpdateConfig(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("dryu_camera_source", "webcam");
              }
            }}
            className={`p-4 rounded-3xl border-3 text-left transition-all flex flex-col gap-2 ${
              config.cameraSourceMode !== "server"
                ? "bg-[#FFF0F5] border-[#F472B6] shadow-sweet ring-2 ring-[#FBCFE8]"
                : "bg-sweet-bg border-sweet-border hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-sm text-[#3F3D56] flex items-center gap-2">
                <span>📱 iPad / Dongle Capture Card</span>
              </span>
              {config.cameraSourceMode !== "server" && (
                <span className="text-[#F472B6] font-bold text-xs">✓ Aktif</span>
              )}
            </div>
            <p className="text-xs text-sweet-muted">
              Kamera DSLR dihubungkan via HDMI-to-USB-C Capture Card ke iPad / browser tablet. Praktis, portable, dan langsung live di layar.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = { ...config, cameraSourceMode: "server" as const };
              onUpdateConfig(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("dryu_camera_source", "server");
              }
            }}
            className={`p-4 rounded-3xl border-3 text-left transition-all flex flex-col gap-2 ${
              config.cameraSourceMode === "server"
                ? "bg-[#F3E8FF] border-[#A855F7] shadow-sweet ring-2 ring-[#E9D5FF]"
                : "bg-sweet-bg border-sweet-border hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-sm text-[#3F3D56] flex items-center gap-2">
                <span>🖥️ DSLR USB Laptop (Server Backend)</span>
              </span>
              {config.cameraSourceMode === "server" && (
                <span className="text-[#A855F7] font-bold text-xs">✓ Aktif</span>
              )}
            </div>
            <p className="text-xs text-sweet-muted">
              Kamera DSLR dihubungkan langsung via kabel USB ke Laptop/Mini PC server (driver gPhoto2). Mendukung sinkronisasi lampu studio flash & shutter mekanik.
            </p>
          </button>
        </div>

        {/* Pengaturan Tambahan: Mirror & Default Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                🪞 Cermin Kamera (Mirror Viewfinder)
              </span>
              <span className="text-xs text-sweet-muted">
                Balik preview kamera secara horizontal layaknya cermin (disarankan untuk kenyamanan selfie)
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.isMirrored ?? true}
              onChange={(e) => {
                const next = { ...config, isMirrored: e.target.checked };
                onUpdateConfig(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("dryu_camera_mirrored", String(e.target.checked));
                }
              }}
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <div className="p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border flex flex-col justify-between gap-1.5">
            <label htmlFor="admin-default-filter" className="font-heading font-bold text-sm text-sweet-text block">
              🪄 Filter Kamera Awal Kiosk:
            </label>
            <select
              id="admin-default-filter"
              value={config.defaultFilter || "original"}
              onChange={(e) => {
                const next = { ...config, defaultFilter: e.target.value };
                onUpdateConfig(next);
              }}
              className="w-full min-h-[38px] px-3 rounded-xl bg-white border border-sweet-border text-xs font-heading font-bold text-sweet-text outline-none"
            >
              {PHOTO_FILTERS.map((flt) => (
                <option key={flt.id} value={flt.id}>
                  {flt.name} - {flt.desc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text">
              Konfigurasi Alur Kiosk & Default Frame
            </h3>
            <p className="text-xs text-sweet-muted">
              Atur tahapan sesi dan template default tanpa perlu mengubah kode
              aplikasi.
            </p>
          </div>
          <StatusBadge tone="success">Tersimpan Otomatis</StatusBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Tahap Pilih Foto (Photo Selection)
              </span>
              <span className="text-xs text-sweet-muted">
                Tampilkan halaman review foto sebelum memilih frame
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enablePhotoSelectionStep}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enablePhotoSelectionStep: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Tahap Pilih Frame (Template Selection)
              </span>
              <span className="text-xs text-sweet-muted">
                Tampilkan halaman Pick Your Vibe setelah foto diambil
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enableTemplateSelectionStep}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enableTemplateSelectionStep: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Efek Suara Kiosk (Beep, Shutter & Chime)
              </span>
              <span className="text-xs text-sweet-muted">
                Bunyikan audio saat hitung mundur dan kamera memotret
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.enableSoundEffects ?? true}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  enableSoundEffects: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
            <div>
              <span className="font-heading font-bold text-sm text-sweet-text block">
                Mode Berbayar (QRIS & Kode Voucher)
              </span>
              <span className="text-xs text-sweet-muted">
                Wajibkan pembayaran QRIS / Voucher sebelum sesi dimulai
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.requirePayment ?? false}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  requirePayment: e.target.checked,
                })
              }
              className="size-5 accent-sweet-primaryStrong"
            />
          </label>
        </div>

        {/* Pengaturan Harga QRIS, Voucher & Public Cloud Share URL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label
              htmlFor="admin-price-input"
              className="font-heading font-bold text-xs text-sweet-text block mb-1"
            >
              Harga Sesi QRIS (Rp):
            </label>
            <input
              id="admin-price-input"
              name="session_price_idr"
              type="text"
              inputMode="numeric"
              value={String(config.sessionPriceIdr ?? 35000)}
              onChange={(e) => {
                const numeric = parseInt(
                  e.target.value.replace(/\D/g, ""),
                  10
                );
                onUpdateConfig({
                  ...config,
                  sessionPriceIdr: Number.isNaN(numeric) ? 0 : numeric,
                });
              }}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-bold text-sweet-text"
            />
          </div>

          <div>
            <label
              htmlFor="admin-vouchers-input"
              className="font-heading font-bold text-xs text-sweet-text block mb-1"
            >
              Kode Voucher Kasir (pisahkan koma):
            </label>
            <input
              id="admin-vouchers-input"
              name="voucher_codes"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={(config.voucherCodes || ["SWEET2026", "VIPFREE"]).join(", ")}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  voucherCodes: e.target.value
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-bold text-sweet-text"
            />
          </div>

          <div>
            <label
              htmlFor="admin-cloud-url-input"
              className="font-heading font-bold text-xs text-sweet-text block mb-1"
            >
              Domain Cloud / Public Share URL (Opsional):
            </label>
            <input
              id="admin-cloud-url-input"
              name="public_share_base_url"
              type="url"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Contoh: https://booth.sweetstudio.id"
              value={config.publicShareBaseUrl || ""}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  publicShareBaseUrl: e.target.value,
                })
              }
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-semibold text-sweet-text"
            />
          </div>
        </div>

        <div>
          <span className="font-heading font-bold text-xs text-sweet-text block mb-2">
            Warna Frame Default:
          </span>
          <div className="flex flex-wrap gap-2">
            {frameThemes.map((theme) => {
              const isDefault = config.defaultFrameColor === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={isDefault}
                  onClick={() =>
                    onUpdateConfig({ ...config, defaultFrameColor: theme.id })
                  }
                  className={`min-h-[42px] px-3.5 py-1.5 rounded-full border-2 text-xs font-heading font-bold flex items-center gap-2 ${
                    isDefault
                      ? "bg-sweet-blush border-sweet-primaryStrong text-sweet-text"
                      : "bg-sweet-bg border-sweet-border text-sweet-muted"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: theme.hex }}
                    className="size-4 rounded-full border border-sweet-text/20"
                  />
                  <span>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading font-bold text-base text-sweet-text">
            Daftar Template & Custom PNG Overlay ({config.enabledTemplateIds.length} Aktif dari{" "}
            {templates.length})
          </h3>
          <span className="text-xs text-sweet-muted">
            Unggah file PNG transparan (Canva/Photoshop) untuk mengganti dekorasi frame bawaan
          </span>
        </div>

        {overlayNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-2xl bg-sweet-blush/70 border border-sweet-primaryStrong/40 text-xs font-heading font-bold text-sweet-text"
          >
            {overlayNotice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const isEnabled = config.enabledTemplateIds.includes(tpl.id);
            const isDefault = config.defaultTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-3xl border-2 flex flex-col justify-between gap-3 ${
                  isEnabled
                    ? "bg-sweet-bg border-sweet-primary"
                    : "bg-sweet-surface/60 border-sweet-border opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-24 w-20 flex items-center justify-center shrink-0 bg-white rounded-2xl p-1.5 border border-sweet-border">
                    <LayoutMock
                      template={tpl}
                      frameColorId={tpl.default_frame || config.defaultFrameColor}
                      frameThemes={frameThemes}
                      className="h-20 w-auto"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="font-heading font-bold text-sm text-sweet-text">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-sweet-muted">
                      {tpl.aspect_label} • {tpl.photos_required} Pose
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isDefault && (
                        <StatusBadge tone="pink">Template Utama</StatusBadge>
                      )}
                      {tpl.has_custom_overlay && (
                        <StatusBadge tone="success">PNG Overlay Aktif</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom PNG Overlay Upload / Remove Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sweet-border/60">
                  <label
                    htmlFor={`overlay-upload-${tpl.id}`}
                    className="min-h-[36px] flex-1 px-3 py-1 rounded-full bg-white hover:bg-sweet-blush border border-sweet-border text-[11px] font-heading font-bold text-sweet-text cursor-pointer inline-flex items-center justify-center text-center transition-colors"
                  >
                    {uploadingId === tpl.id
                      ? "Mengunggah..."
                      : tpl.has_custom_overlay
                        ? "Ganti PNG Overlay"
                        : "+ Upload PNG Overlay"}
                  </label>
                  <input
                    id={`overlay-upload-${tpl.id}`}
                    type="file"
                    accept="image/png"
                    disabled={uploadingId === tpl.id}
                    onChange={(e) => handleOverlayFileChange(tpl.id, e)}
                    className="sr-only"
                  />
                  {tpl.has_custom_overlay && (
                    <button
                      type="button"
                      disabled={uploadingId === tpl.id}
                      onClick={() => handleRemoveOverlay(tpl.id)}
                      className="min-h-[36px] px-3 py-1 rounded-full bg-[#FCECEE] hover:bg-[#F7D6DA] text-sweet-error text-[11px] font-heading font-bold border border-[#EABAC0]"
                    >
                      Hapus PNG
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    aria-pressed={isEnabled}
                    onClick={() => toggleTemplateEnabled(tpl.id)}
                    className={`min-h-[42px] flex-1 px-3 py-1.5 rounded-full text-xs font-heading font-bold border inline-flex items-center justify-center gap-1.5 ${
                      isEnabled
                        ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong/40"
                        : "bg-white text-sweet-muted border-sweet-border"
                    }`}
                  >
                    {isEnabled && <CheckIcon className="size-3.5" />}
                    <span>{isEnabled ? "Aktif" : "Nonaktif"}</span>
                  </button>

                  {isEnabled && !isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ ...config, defaultTemplateId: tpl.id })
                      }
                      className="min-h-[42px] px-3 py-1.5 rounded-full bg-white hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                    >
                      Jadikan Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
