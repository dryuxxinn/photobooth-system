"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CustomFilterPreset } from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  BowIcon,
  CheckIcon,
  PaletteIcon,
  PlusIcon,
  RefreshIcon,
  SparkleIcon,
  TrashIcon,
} from "@/components/icons";

interface FilterStudioProps {
  onPresetsChanged?: () => void;
  readOnly?: boolean;
}

const DEFAULT_PARAMS = {
  brightness: 1.05,
  contrast: 1.1,
  saturation: 1.08,
  temperature: 1.15, // warmwhite
  tint: 1.02,
  smoothness: 25,
};

// Preset quick starter templates
const QUICK_TEMPLATES = [
  {
    name: "Warm White Cafe",
    params: {
      brightness: 1.06,
      contrast: 1.08,
      saturation: 1.12,
      temperature: 1.22,
      tint: 1.02,
      smoothness: 30,
    },
  },
  {
    name: "Korean Glow Studio",
    params: {
      brightness: 1.12,
      contrast: 0.98,
      saturation: 1.05,
      temperature: 1.04,
      tint: 1.06,
      smoothness: 50,
    },
  },
  {
    name: "Vintage Warm Film",
    params: {
      brightness: 0.98,
      contrast: 1.18,
      saturation: 0.92,
      temperature: 1.28,
      tint: 0.98,
      smoothness: 15,
    },
  },
  {
    name: "High Contrast Crisp",
    params: {
      brightness: 1.04,
      contrast: 1.32,
      saturation: 1.25,
      temperature: 1.0,
      tint: 1.0,
      smoothness: 0,
    },
  },
  {
    name: "Dreamy Cool Pastel",
    params: {
      brightness: 1.08,
      contrast: 1.02,
      saturation: 1.04,
      temperature: 0.88,
      tint: 1.05,
      smoothness: 40,
    },
  },
];

export function FilterStudio({
  onPresetsChanged,
  readOnly = false,
}: FilterStudioProps) {
  const [presets, setPresets] = useState<CustomFilterPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [presetName, setPresetName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string | null>(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [customSampleBase64, setCustomSampleBase64] = useState<string | null>(
    null
  );

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await photoboothApi.getCustomFilters();
      if (res?.presets) {
        setPresets(res.presets);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const cssFilterStyle = useMemo(() => {
    const parts: string[] = [];
    parts.push(`brightness(${params.brightness.toFixed(2)})`);
    parts.push(`contrast(${params.contrast.toFixed(2)})`);
    parts.push(`saturate(${params.saturation.toFixed(2)})`);

    if (params.temperature > 1.02) {
      const sep = Math.min(0.4, (params.temperature - 1.0) * 0.8);
      parts.push(`sepia(${sep.toFixed(2)})`);
    } else if (params.temperature < 0.98) {
      const deg = Math.round((1.0 - params.temperature) * 35);
      parts.push(`hue-rotate(${deg}deg)`);
    }

    if (params.tint > 1.02) {
      const deg = Math.round((params.tint - 1.0) * -20);
      parts.push(`hue-rotate(${deg}deg)`);
    }

    if (params.smoothness > 0) {
      const blurPx = ((params.smoothness / 100) * 0.6).toFixed(2);
      parts.push(`blur(${blurPx}px)`);
    }

    return parts.join(" ");
  }, [params]);

  const handleTestServerRender = async () => {
    try {
      setRenderingPreview(true);
      const res = await photoboothApi.previewFilter({
        custom_params: params,
        sample_image_base64: customSampleBase64 || undefined,
      });
      if (res?.preview_data_url) {
        setServerPreviewUrl(res.preview_data_url);
        setStatusMessage("Render PIL server backend berhasil diproses.");
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal merender filter di server.");
    } finally {
      setRenderingPreview(false);
    }
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const cleanName = presetName.trim();
    if (!cleanName) {
      setStatusMessage("Mohon isi nama preset terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      await photoboothApi.saveCustomFilter({
        name: cleanName,
        brightness: params.brightness,
        contrast: params.contrast,
        saturation: params.saturation,
        temperature: params.temperature,
        tint: params.tint,
        smoothness: params.smoothness,
        is_active: true,
        params,
      });
      setPresetName("");
      setStatusMessage(`Preset "${cleanName}" berhasil disimpan ke sistem.`);
      setTimeout(() => setStatusMessage(null), 3500);
      await fetchPresets();
      if (onPresetsChanged) onPresetsChanged();
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal menyimpan preset.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (readOnly) return;
    try {
      await photoboothApi.deleteCustomFilter(id);
      setStatusMessage(`Preset "${name}" berhasil dihapus.`);
      setTimeout(() => setStatusMessage(null), 3000);
      await fetchPresets();
      if (onPresetsChanged) onPresetsChanged();
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal menghapus preset.");
    }
  };

  const handleApplyQuickTemplate = (tpl: (typeof QUICK_TEMPLATES)[0]) => {
    setParams(tpl.params);
    setPresetName(tpl.name);
    setServerPreviewUrl(null);
  };

  const handleCustomSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomSampleBase64(String(reader.result || ""));
      setServerPreviewUrl(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <Card variant="surface" padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <PaletteIcon className="size-5 text-sweet-primaryStrong" />
              <span>Studio Kalibrasi Preset Filter Foto</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Atur kontras, pencahayaan, saturasi, kehangatan (warmwhite), rona
              kulit, dan kehalusan tekstur. Simpan parameter sebagai preset
              resmi bilik foto.
            </p>
          </div>
          <StatusBadge tone="pink">{presets.length} Preset Tersimpan</StatusBadge>
        </div>

        {/* Quick starter templates */}
        <div>
          <span className="text-[11px] font-heading font-bold text-sweet-muted block mb-1.5">
            Mulai dari Template Cepat:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => handleApplyQuickTemplate(tpl)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-sweet-bg hover:bg-sweet-primary border border-sweet-border text-xs font-heading font-bold text-sweet-text transition-colors shadow-xs"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Studio Grid: Controls on Left, Live Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Form Panel (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="surface" padding="md" className="space-y-5">
            <div className="flex items-center justify-between border-b border-sweet-border/70 pb-3">
              <h4 className="font-heading font-bold text-sm text-sweet-text">
                Parameter Warna & Tekstur
              </h4>
              <button
                type="button"
                onClick={() => {
                  setParams(DEFAULT_PARAMS);
                  setServerPreviewUrl(null);
                }}
                className="text-xs font-heading font-bold text-sweet-muted hover:text-sweet-primaryStrong min-h-[44px] px-2 inline-flex items-center"
              >
                Reset Default
              </button>
            </div>

            {/* Slider 1: Pencahayaan (Brightness) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label
                  htmlFor="filter-slider-brightness"
                  className="text-sweet-text"
                >
                  Pencahayaan (Brightness)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.brightness.toFixed(2)}x
                </span>
              </div>
              <input
                id="filter-slider-brightness"
                type="range"
                min="0.60"
                max="1.50"
                step="0.02"
                value={params.brightness}
                onChange={(e) =>
                  setParams({
                    ...params,
                    brightness: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Gelap (0.6x)</span>
                <span>Normal (1.0x)</span>
                <span>Terang (1.5x)</span>
              </div>
            </div>

            {/* Slider 2: Kontras (Contrast) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label
                  htmlFor="filter-slider-contrast"
                  className="text-sweet-text"
                >
                  Kontras (Contrast)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.contrast.toFixed(2)}x
                </span>
              </div>
              <input
                id="filter-slider-contrast"
                type="range"
                min="0.60"
                max="1.60"
                step="0.02"
                value={params.contrast}
                onChange={(e) =>
                  setParams({
                    ...params,
                    contrast: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Pudar / Lembut (0.6x)</span>
                <span>Normal (1.0x)</span>
                <span>Tegas / Tajam (1.6x)</span>
              </div>
            </div>

            {/* Slider 3: Saturasi (Saturation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label
                  htmlFor="filter-slider-saturation"
                  className="text-sweet-text"
                >
                  Saturasi Warna (Saturation)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.saturation.toFixed(2)}x
                </span>
              </div>
              <input
                id="filter-slider-saturation"
                type="range"
                min="0.00"
                max="2.00"
                step="0.05"
                value={params.saturation}
                onChange={(e) =>
                  setParams({
                    ...params,
                    saturation: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Monokrom / Hitam Putih (0.0x)</span>
                <span>Natural (1.0x)</span>
                <span>Vivid Pop (2.0x)</span>
              </div>
            </div>

            {/* Slider 4: Suhu Warna / Warmwhite (Temperature) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label
                  htmlFor="filter-slider-temperature"
                  className="text-sweet-text"
                >
                  Suhu Warna / Warmwhite (Temperature)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.temperature > 1.0
                    ? `+${((params.temperature - 1) * 100).toFixed(0)}% Warm`
                    : params.temperature < 1.0
                      ? `-${((1 - params.temperature) * 100).toFixed(0)}% Cool`
                      : "Netral"}
                </span>
              </div>
              <input
                id="filter-slider-temperature"
                type="range"
                min="0.75"
                max="1.45"
                step="0.02"
                value={params.temperature}
                onChange={(e) =>
                  setParams({
                    ...params,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Sejuk / Blue Cool (0.75x)</span>
                <span>Netral (1.0x)</span>
                <span>Hangat / Warmwhite (1.45x)</span>
              </div>
            </div>

            {/* Slider 5: Rona Magenta vs Hijau (Tint) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label htmlFor="filter-slider-tint" className="text-sweet-text">
                  Rona Semburat Kulit (Tint)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.tint.toFixed(2)}x
                </span>
              </div>
              <input
                id="filter-slider-tint"
                type="range"
                min="0.85"
                max="1.25"
                step="0.02"
                value={params.tint}
                onChange={(e) =>
                  setParams({
                    ...params,
                    tint: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Green Fresh (0.85x)</span>
                <span>Netral (1.0x)</span>
                <span>Rosy Pink Blush (1.25x)</span>
              </div>
            </div>

            {/* Slider 6: Kehalusan Tekstur Kulit (Smoothness) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading font-bold">
                <label
                  htmlFor="filter-slider-smoothness"
                  className="text-sweet-text"
                >
                  Kehalusan Kulit (Skin Softening)
                </label>
                <span className="font-mono text-sweet-primaryStrong">
                  {params.smoothness}%
                </span>
              </div>
              <input
                id="filter-slider-smoothness"
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.smoothness}
                onChange={(e) =>
                  setParams({
                    ...params,
                    smoothness: parseInt(e.target.value, 10),
                  })
                }
                className="w-full h-2 bg-sweet-bg rounded-lg appearance-none cursor-pointer accent-sweet-primaryStrong"
              />
              <div className="flex justify-between text-[10px] text-sweet-muted font-heading">
                <span>Asli / Pori Terbuka (0%)</span>
                <span>Beauty Glow Natural (40%)</span>
                <span>Ultra Smooth (100%)</span>
              </div>
            </div>

            {/* Form Simpan Preset */}
            {!readOnly && (
              <form
                onSubmit={handleSavePreset}
                className="pt-4 border-t border-sweet-border/70 space-y-3"
              >
                <label
                  htmlFor="filter-preset-name-input"
                  className="font-heading font-bold text-xs text-sweet-text block"
                >
                  Simpan sebagai Preset Bilik:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="filter-preset-name-input"
                    type="text"
                    placeholder="Contoh: Warm White Studio 2026..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text placeholder:font-normal placeholder:text-sweet-muted"
                  />
                  <button
                    type="submit"
                    disabled={loading || !presetName.trim()}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong disabled:opacity-50 text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 shadow-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <PlusIcon className="size-4" />
                    <span>Simpan Preset</span>
                  </button>
                </div>
              </form>
            )}

            {statusMessage && (
              <p className="text-xs font-heading font-bold text-[#1f6a45] pt-1">
                {statusMessage}
              </p>
            )}
          </Card>
        </div>

        {/* Live Preview Panel (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="surface" padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-bold text-sm text-sweet-text">
                Live Preview Kalibrasi
              </h4>
              <StatusBadge tone="pink">Real-time Canvas</StatusBadge>
            </div>

            {/* Interactive Preview Canvas Box */}
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#2D2226] border-2 border-sweet-border flex items-center justify-center shadow-inner">
              {serverPreviewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={serverPreviewUrl}
                  alt="Server Render Preview"
                  className="w-full h-full object-cover"
                />
              ) : customSampleBase64 ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={customSampleBase64}
                  alt="Custom Sample Preview"
                  style={{ filter: cssFilterStyle }}
                  className="w-full h-full object-cover transition-all duration-150"
                />
              ) : (
                /* Default Portrait SVG Mock with real-time CSS filter */
                <div
                  style={{ filter: cssFilterStyle }}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none transition-all duration-150 bg-gradient-to-b from-[#fce4ec] to-[#f8bbd0]"
                >
                  <div className="size-32 rounded-full bg-[#f48fb1]/60 flex items-center justify-center border-4 border-white shadow-md mb-4">
                    <BowIcon className="size-16 text-[#ad1457]" />
                  </div>
                  <span className="font-heading font-extrabold text-base text-[#4a148c]">
                    SWEET PORTRAIT PREVIEW
                  </span>
                  <span className="text-xs font-heading text-[#880e4f] mt-1">
                    Simulasi Rona Kulit & Suhu Ruangan
                  </span>
                  <div className="mt-4 flex gap-2">
                    <span className="size-6 rounded-full bg-[#fff0f3] border border-white" />
                    <span className="size-6 rounded-full bg-[#fce4ec] border border-white" />
                    <span className="size-6 rounded-full bg-[#e8eaf6] border border-white" />
                    <span className="size-6 rounded-full bg-[#f3e5f5] border border-white" />
                  </div>
                </div>
              )}

              {/* Status Pill on Top */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-heading font-bold shadow-xs">
                {serverPreviewUrl
                  ? "Rendered by Python PIL Server"
                  : "Live GPU Shader / CSS"}
              </div>
            </div>

            {/* Actions for Preview */}
            <div className="space-y-2 pt-1">
              <Button
                variant="surface"
                size="md"
                onClick={handleTestServerRender}
                disabled={renderingPreview}
                className="w-full text-xs font-heading font-bold"
                leftIcon={<RefreshIcon className="size-4" />}
              >
                {renderingPreview
                  ? "Merender via Python Server..."
                  : "Uji Render Server Backend (PIL Asli)"}
              </Button>

              <label
                htmlFor="upload-custom-sample"
                className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-sweet-bg hover:bg-sweet-primary border border-sweet-border text-xs font-heading font-bold text-sweet-text cursor-pointer inline-flex items-center justify-center text-center transition-colors shadow-xs"
              >
                <span>Upload Foto Uji dari Komputer...</span>
              </label>
              <input
                id="upload-custom-sample"
                type="file"
                accept="image/*"
                onChange={handleCustomSampleUpload}
                className="sr-only"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Saved Presets Section */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sweet-border/70 pb-3">
          <div>
            <h4 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <SparkleIcon className="size-4 text-sweet-primaryStrong" />
              <span>Daftar Preset Tersimpan di Mesin Bilik</span>
            </h4>
            <p className="text-xs text-sweet-muted">
              Preset aktif ini langsung muncul dan dapat dipilih oleh pelanggan
              pada layar pemilihan filter photobooth.
            </p>
          </div>
          <Button
            variant="surface"
            size="sm"
            onClick={fetchPresets}
            disabled={loading}
            leftIcon={<RefreshIcon className="size-3.5" />}
          >
            Segarkan
          </Button>
        </div>

        {presets.length === 0 ? (
          <div className="p-8 text-center bg-sweet-bg rounded-2xl border border-sweet-border text-xs text-sweet-muted">
            Belum ada custom preset yang tersimpan. Sesuaikan slider di atas dan
            klik <strong>Simpan Preset</strong> untuk menambahkan ke mesin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset) => {
              const p = preset.params || {
                brightness: preset.brightness ?? 1.0,
                contrast: preset.contrast ?? 1.0,
                saturation: preset.saturation ?? 1.0,
                temperature: preset.temperature ?? 1.0,
                tint: preset.tint ?? 1.0,
                smoothness: preset.smoothness ?? 0,
              };
              return (
                <div
                  key={preset.id}
                  className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-heading font-extrabold text-sm text-sweet-text">
                        {preset.name}
                      </h5>
                      <span className="text-[10px] text-sweet-muted font-mono">
                        {preset.created_at?.slice(0, 10)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-heading font-semibold text-sweet-muted bg-sweet-bg p-2.5 rounded-xl border border-sweet-border/60">
                      <div>
                        Kecerahan:{" "}
                        <strong className="text-sweet-text">
                          {(p.brightness ?? 1.0).toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        Kontras:{" "}
                        <strong className="text-sweet-text">
                          {(p.contrast ?? 1.0).toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        Saturasi:{" "}
                        <strong className="text-sweet-text">
                          {(p.saturation ?? 1.0).toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        Warmwhite:{" "}
                        <strong className="text-sweet-text">
                          {(p.temperature ?? 1.0).toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        Tint:{" "}
                        <strong className="text-sweet-text">
                          {(p.tint ?? 1.0).toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        Halus:{" "}
                        <strong className="text-sweet-text">
                          {p.smoothness ?? 0}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-sweet-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        setParams({
                          brightness: p.brightness ?? 1.0,
                          contrast: p.contrast ?? 1.0,
                          saturation: p.saturation ?? 1.0,
                          temperature: p.temperature ?? 1.0,
                          tint: p.tint ?? 1.0,
                          smoothness: p.smoothness ?? 0,
                        });
                        setPresetName(preset.name);
                        setServerPreviewUrl(null);
                      }}
                      className="min-h-[44px] flex-1 px-3 py-1.5 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text text-xs font-heading font-bold border border-sweet-primaryStrong/40 transition-colors"
                    >
                      Muat ke Studio
                    </button>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeletePreset(preset.id, preset.name)
                        }
                        className="min-h-[44px] size-11 rounded-xl bg-[#FCECEE] hover:bg-[#F7D6DA] text-sweet-error inline-flex items-center justify-center border border-[#EABAC0] transition-colors"
                        title="Hapus Preset"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
