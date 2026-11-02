import { BoothOperatorConfig } from "@/types/photobooth";

export const COUNTDOWN_SECONDS = 3;
export const CAPTURE_PAUSE_MS = 1400;
export const PREPARATION_IDLE_SECONDS = 90;
export const SELECTION_IDLE_SECONDS = 60;
export const PREVIEW_IDLE_SECONDS = 120;
export const PREVIEW_IDLE_WARN_SECONDS = 25;
export const COMPLETION_AUTO_RESET_SECONDS = 18;
export const OPERATOR_LONG_PRESS_MS = 1400;

export const OPERATOR_CONFIG_STORAGE_KEY = "sweet_studio_operator_config_v1";

export const DEFAULT_OPERATOR_CONFIG: BoothOperatorConfig = {
  defaultTemplateId: "retro_strip_4",
  defaultFrameColor: "pink",
  enablePhotoSelectionStep: true,
  enableTemplateSelectionStep: true,
  countdownSeconds: 3,
  enabledTemplateIds: [
    "retro_strip_4",
    "classic_strip_3",
    "ourbooth_twin_3",
    "twin_strip_4",
    "grid_2x2_4",
    "cinema_ticket_4",
    "engagement_event_3",
    "solo_duo_2",
    "landscape_trio_3",
    "single_frame_1",
    "wide_recap_1",
  ],
};

export function loadOperatorConfig(): BoothOperatorConfig {
  if (typeof window === "undefined") return DEFAULT_OPERATOR_CONFIG;
  try {
    const raw = window.localStorage.getItem(OPERATOR_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_OPERATOR_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_OPERATOR_CONFIG,
      ...parsed,
      enabledTemplateIds:
        Array.isArray(parsed.enabledTemplateIds) &&
        parsed.enabledTemplateIds.length > 0
          ? parsed.enabledTemplateIds
          : DEFAULT_OPERATOR_CONFIG.enabledTemplateIds,
    };
  } catch {
    return DEFAULT_OPERATOR_CONFIG;
  }
}

export function saveOperatorConfig(cfg: BoothOperatorConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      OPERATOR_CONFIG_STORAGE_KEY,
      JSON.stringify(cfg)
    );
  } catch {
    // ignore storage quota errors
  }
}
