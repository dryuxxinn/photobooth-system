"use client";

import React, { useEffect, useState } from "react";
import {
  BoothOperatorConfig,
  CustomFilterPreset,
  FrameThemeOption,
  TemplateOption,
} from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { LayoutMock } from "@/components/LayoutMock";
import { PHOTO_FILTERS } from "@/lib/defaults";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CheckIcon, PaletteIcon, SparkleIcon } from "@/components/icons";

interface TemplateManagerProps {
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  config: BoothOperatorConfig;
  onUpdateConfig: (next: BoothOperatorConfig) => void;
  onRefreshTemplates?: () => Promise<void>;
  readOnly?: boolean;
}

export function TemplateManager({
  templates,
  frameThemes,
  config,
  onUpdateConfig,
  onRefreshTemplates,
  readOnly = false,
}: TemplateManagerProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [overlayNotice, setOverlayNotice] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<CustomFilterPreset[]>([]);

  useEffect(() => {
    photoboothApi
      .getCustomFilters()
      .then((res) => {
        if (res?.presets && Array.isArray(res.presets)) {
          setCustomPresets(res.presets);
        }
      })
      .catch(() => null);
  }, []);

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
    <div className="space-y-6">
      {/* Warna Frame Default & Filter Kamera Awal */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <PaletteIcon className="size-5 text-sweet-primaryStrong" />
              <span>Tema Warna Frame & Filter Awal</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Atur nuansa visual default yang tampil saat pelanggan mulai memilih frame.
            </p>
          </div>
          <StatusBadge tone="success">Tersimpan Otomatis</StatusBadge>
        </div>

        {/* Pilihan Warna Frame Bawaan */}
        <div className="space-y-2">
          <span className="font-heading font-bold text-xs text-sweet-text block">
            Warna Frame Bawaan:
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
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border-2 text-xs font-heading font-bold flex items-center gap-2 transition-colors ${
                    isDefault
                      ? "bg-sweet-blush border-sweet-primaryStrong text-sweet-text shadow-xs"
                      : "bg-sweet-bg border-sweet-border text-sweet-muted hover:text-sweet-text"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: theme.hex }}
                    className="size-4 rounded-full border border-sweet-text/20 shrink-0"
                  />
                  <span>{theme.name}</span>
                  {isDefault && <CheckIcon className="size-3.5 text-sweet-primaryStrong" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pilihan Filter Foto Default */}
        <div className="pt-2 border-t border-sweet-border/60">
          <label
            htmlFor="admin-default-filter"
            className="font-heading font-bold text-xs text-sweet-text block mb-1.5"
          >
            Filter Foto Awal Kiosk:
          </label>
          <select
            id="admin-default-filter"
            value={config.defaultFilter || "original"}
            onChange={(e) => {
              onUpdateConfig({ ...config, defaultFilter: e.target.value });
            }}
            className="w-full max-w-md min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-bold text-sweet-text"
          >
            <optgroup label="Filter Bawaan">
              {PHOTO_FILTERS.map((flt) => (
                <option key={flt.id} value={flt.id}>
                  {flt.name} : {flt.desc}
                </option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="Preset Studio Kustom">
                {customPresets.map((prs) => (
                  <option key={prs.id} value={prs.id}>
                    {prs.name} (Custom Studio)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </Card>

      {/* Daftar Template & Upload Custom PNG Overlay */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <SparkleIcon className="size-5 text-sweet-primaryStrong" />
              <span>Katalog Template Photobooth</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              {config.enabledTemplateIds.length} dari {templates.length} template aktif di Kiosk. Unggah file PNG transparan untuk mengganti frame bawaan.
            </p>
          </div>
          <span className="text-xs text-sweet-muted font-heading font-semibold">
            Format: PNG Transparan (Alpha Channel)
          </span>
        </div>

        {overlayNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-sweet-blush/80 border border-sweet-primaryStrong/40 text-xs font-heading font-bold text-sweet-text"
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
                className={`p-4 rounded-3xl border-2 flex flex-col justify-between gap-3 transition-colors ${
                  isEnabled
                    ? "bg-sweet-bg border-sweet-primary"
                    : "bg-sweet-surface/60 border-sweet-border opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-24 w-20 flex items-center justify-center shrink-0 bg-white rounded-2xl p-1.5 border border-sweet-border shadow-xs">
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
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {isDefault && (
                        <StatusBadge tone="pink">Template Utama</StatusBadge>
                      )}
                      {tpl.has_custom_overlay && (
                        <StatusBadge tone="success">PNG Aktif</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload & Remove PNG Overlay Controls (Khusus Admin) */}
                {!readOnly ? (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sweet-border/60">
                    <label
                      htmlFor={`overlay-upload-${tpl.id}`}
                      className="min-h-[44px] flex-1 px-3 py-1.5 rounded-xl bg-white hover:bg-sweet-blush border border-sweet-border text-[11px] font-heading font-bold text-sweet-text cursor-pointer inline-flex items-center justify-center text-center transition-colors"
                    >
                      {uploadingId === tpl.id
                        ? "Mengunggah..."
                        : tpl.has_custom_overlay
                          ? "Ganti PNG Overlay"
                          : "+ Upload PNG Frame"}
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
                        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#FCECEE] hover:bg-[#F7D6DA] text-sweet-error text-[11px] font-heading font-bold border border-[#EABAC0]"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-sweet-border/60 text-[10px] text-sweet-muted font-heading font-semibold">
                    Overlay hanya dapat diubah oleh Administrator
                  </div>
                )}

                {/* Toggle Aktif & Jadikan Default */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={readOnly}
                    aria-pressed={isEnabled}
                    onClick={() => toggleTemplateEnabled(tpl.id)}
                    className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl text-xs font-heading font-bold border inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed ${
                      isEnabled
                        ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong/40"
                        : "bg-white text-sweet-muted border-sweet-border"
                    }`}
                  >
                    {isEnabled && <CheckIcon className="size-3.5" />}
                    <span>{isEnabled ? "Aktif" : "Nonaktif"}</span>
                  </button>

                  {!readOnly && isEnabled && !isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ ...config, defaultTemplateId: tpl.id })
                      }
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white hover:bg-sweet-blush border border-sweet-border text-xs font-heading font-bold text-sweet-text"
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