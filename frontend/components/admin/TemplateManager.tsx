"use client";

import React from "react";
import {
  BoothOperatorConfig,
  FrameThemeOption,
  TemplateOption,
} from "@/types/photobooth";
import { LayoutMock } from "@/components/LayoutMock";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CheckIcon } from "@/components/icons";

interface TemplateManagerProps {
  templates: TemplateOption[];
  frameThemes: FrameThemeOption[];
  config: BoothOperatorConfig;
  onUpdateConfig: (next: BoothOperatorConfig) => void;
}

export function TemplateManager({
  templates,
  frameThemes,
  config,
  onUpdateConfig,
}: TemplateManagerProps) {
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
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-sweet-text">
            Daftar Template ({config.enabledTemplateIds.length} Aktif dari{" "}
            {templates.length})
          </h3>
          <span className="text-xs text-sweet-muted">
            Rekomendasi MVP: aktifkan 3–5 template siap cetak
          </span>
        </div>

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
                    {isDefault && (
                      <StatusBadge tone="pink">Template Utama</StatusBadge>
                    )}
                  </div>
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
