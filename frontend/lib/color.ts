import { FrameThemeOption } from "@/types/photobooth";
import { DEFAULT_FRAME_THEMES } from "./defaults";

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return [250, 247, 240];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function isDarkHex(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.48;
}

export function inkFor(hex: string): string {
  return isDarkHex(hex) ? "#FFF9F2" : "#493B3B";
}

export function subInkFor(hex: string): string {
  return isDarkHex(hex) ? "rgba(255, 249, 242, 0.72)" : "#887B7B";
}

export function getThemeHex(
  frameId?: string | null,
  themes: FrameThemeOption[] = DEFAULT_FRAME_THEMES
): string {
  const found =
    themes.find((t) => t.id === frameId) ||
    DEFAULT_FRAME_THEMES.find((t) => t.id === frameId);
  return found?.hex || "#F6C9D2";
}

export function getShortThemeLabel(
  frameId?: string | null,
  themes: FrameThemeOption[] = DEFAULT_FRAME_THEMES
): string {
  const found =
    themes.find((t) => t.id === frameId) ||
    DEFAULT_FRAME_THEMES.find((t) => t.id === frameId);
  return found?.name || "Sweet Pink";
}
