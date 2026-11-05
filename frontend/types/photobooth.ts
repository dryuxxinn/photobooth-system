export type SessionState =
  | "IDLE"
  | "STARTED"
  | "CAPTURING"
  | "PROCESSING"
  | "PREVIEW"
  | "PRINTING"
  | "COMPLETED"
  | "ERROR"
  | "ABORTED";

export type KioskSubStep =
  | "WELCOME"
  | "PREPARATION"
  | "CAPTURING"
  | "PHOTO_SELECTION"
  | "TEMPLATE_SELECTION"
  | "PREVIEW"
  | "PRINTING"
  | "COMPLETION";

export interface PhotoItem {
  id: string;
  filename: string;
  original_path: string;
  thumbnail_path?: string | null;
  original_url?: string | null;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  created_at: string;
  index: number;
}

export interface SessionDetail {
  session_id: string;
  status: SessionState;
  customer_name?: string | null;
  photos_required: number;
  photos_taken: number;
  photos: PhotoItem[];
  selected_photo_ids?: string[] | null;
  template_id?: string | null;
  filter_name?: string | null;
  frame_color?: string | null;
  sticker_id?: string | null;
  processed_image_path?: string | null;
  processed_image_url?: string | null;
  gif_path?: string | null;
  gif_url?: string | null;
  cloud_share_url?: string | null;
  started_at: string;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface CameraStatus {
  connected: boolean;
  model: string;
  driver: string;
  battery_level: number;
  message: string;
  wifi_ip?: string | null;
  wifi_port?: number | null;
  wifi_protocol?: string | null;
  hardware_reachable?: boolean | null;
}

export interface PrinterStatus {
  ready: boolean;
  printer_name: string;
  driver: string;
  paper_remaining?: number;
  message: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  camera_driver: string;
  camera_connected: boolean;
  printer_driver: string;
  printer_ready: boolean;
  session_state: SessionState;
  storage_used_percent?: number;
  storage_free_gb?: number;
}

export interface PrintJobRecord {
  id: string;
  session_id: string;
  photo_id?: string | null;
  file_path: string;
  copies: number;
  status: string;
  printer_name?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export type TemplateLayoutType =
  | "vertical"
  | "twin_strip"
  | "vertical_4"
  | "twin_strip_4"
  | "ticket"
  | "event_strip"
  | "vertical_2"
  | "landscape_3"
  | "grid"
  | "single"
  | "wide_1";

export interface TemplateOption {
  id: string;
  name: string;
  photos_required: number;
  layout: TemplateLayoutType;
  category?: "strip" | "postcard" | "special" | "single";
  aspect_label?: string;
  prints_doubled?: boolean;
  default_frame?: string;
  description: string;
  has_custom_overlay?: boolean;
  custom_overlay_url?: string | null;
}

export interface StickerOption {
  id: string;
  name: string;
  desc: string;
}

export interface FrameThemeOption {
  id: string;
  name: string;
  hex: string;
}

export interface BoothOperatorConfig {
  defaultTemplateId: string;
  defaultFrameColor: string;
  enablePhotoSelectionStep: boolean;
  enableTemplateSelectionStep: boolean;
  countdownSeconds: number;
  enabledTemplateIds: string[];
  requirePayment?: boolean;
  sessionPriceIdr?: number;
  voucherCodes?: string[];
  enableSoundEffects?: boolean;
  publicShareBaseUrl?: string;
  cameraSourceMode?: "webcam" | "server";
  preferredDeviceId?: string | null;
  isMirrored?: boolean;
  defaultFilter?: string;
}
