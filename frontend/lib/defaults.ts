import { FrameThemeOption, TemplateOption } from "@/types/photobooth";

export const DEFAULT_FRAME_THEMES: FrameThemeOption[] = [
  { id: "pink", name: "Sweet Pink", hex: "#F6C9D2" },
  { id: "cream", name: "Minimal Cream", hex: "#FAF7F0" },
  { id: "lavender", name: "Lavender Dream", hex: "#DCD6F7" },
  { id: "white", name: "Studio Crisp White", hex: "#FFFFFF" },
  { id: "sky", name: "Pastel Sky Blue", hex: "#DEF1FF" },
  { id: "mint", name: "Matcha Mint", hex: "#E0F5E9" },
  { id: "gold", name: "Couple & Event Gold", hex: "#FCF9F2" },
  { id: "burgundy", name: "Vintage Film Maroon", hex: "#761624" },
  { id: "black", name: "Midnight Film Noir", hex: "#14161C" },
];

export const DEFAULT_TEMPLATES: TemplateOption[] = [
  {
    id: "retro_strip_4",
    name: "Sweet Korean Strip (4 Pose)",
    photos_required: 4,
    layout: "vertical_4",
    category: "strip",
    aspect_label: "2x6 Strip • 4 Foto",
    prints_doubled: false,
    default_frame: "pink",
    description:
      "Strip 4 pose vertikal khas Korean photobooth dengan frame pastel manis.",
  },
  {
    id: "classic_strip_3",
    name: "Sweet Classic Strip (3 Pose)",
    photos_required: 3,
    layout: "vertical",
    category: "strip",
    aspect_label: "2x6 Strip • 3 Foto",
    prints_doubled: false,
    default_frame: "cream",
    description:
      "Strip 3 pose klasik dengan ruang judul & tanggal kenangan di bagian bawah.",
  },
  {
    id: "ourbooth_twin_3",
    name: "Twin Strip Cetak Ganda (3 Pose)",
    photos_required: 3,
    layout: "twin_strip",
    category: "strip",
    aspect_label: "2× 2x6 Strip • 3 Foto",
    prints_doubled: true,
    default_frame: "cream",
    description:
      "Dua strip kembar berdampingan (ukuran kertas 4x6) siap dibagi bersama sahabat.",
  },
  {
    id: "twin_strip_4",
    name: "Twin Strip Cetak Ganda (4 Pose)",
    photos_required: 4,
    layout: "twin_strip_4",
    category: "strip",
    aspect_label: "2× 2x6 Strip • 4 Foto",
    prints_doubled: true,
    default_frame: "pink",
    description:
      "Empat pose vertikal yang digandakan otomatis menjadi 2 strip kembar.",
  },
  {
    id: "grid_2x2_4",
    name: "Scrapbook Postcard 2×2 (4 Pose)",
    photos_required: 4,
    layout: "grid",
    category: "postcard",
    aspect_label: "4x6 Postcard • 4 Foto",
    prints_doubled: false,
    default_frame: "lavender",
    description:
      "Susunan 4 pose ukuran kartu pos 2×2 bergaya scrapbook manis.",
  },
  {
    id: "cinema_ticket_4",
    name: "Vintage Film Ticket (4 Pose)",
    photos_required: 4,
    layout: "ticket",
    category: "special",
    aspect_label: "Movie Ticket • 4 Foto",
    prints_doubled: false,
    default_frame: "burgundy",
    description:
      "Tiket bioskop retro 'ADMIT ONE / MOVIE NIGHT' dengan tepi bergerigi.",
  },
  {
    id: "engagement_event_3",
    name: "Couple & Birthday Edition (3 Pose)",
    photos_required: 3,
    layout: "event_strip",
    category: "special",
    aspect_label: "2x6 Event Strip • 3 Foto",
    prints_doubled: false,
    default_frame: "gold",
    description:
      "Strip 3 pose elegan dengan aksen garis keemasan untuk acara spesial & pasangan.",
  },
  {
    id: "landscape_trio_3",
    name: "Landscape Trio Postcard (3 Pose)",
    photos_required: 3,
    layout: "landscape_3",
    category: "postcard",
    aspect_label: "16:9 Postcard • 3 Foto",
    prints_doubled: false,
    default_frame: "white",
    description:
      "Tiga foto potret berjajar rapi dalam satu kartu pos horizontal.",
  },
  {
    id: "solo_duo_2",
    name: "Bestie Duo Strip (2 Pose)",
    photos_required: 2,
    layout: "vertical_2",
    category: "strip",
    aspect_label: "2x4 Duo • 2 Foto",
    prints_doubled: false,
    default_frame: "lavender",
    description:
      "Dua pose vertikal berukuran besar yang cepat, simpel, dan menggemaskan.",
  },
  {
    id: "single_frame_1",
    name: "Sweet Polaroid Portrait (1 Pose)",
    photos_required: 1,
    layout: "single",
    category: "single",
    aspect_label: "4x6 Polaroid • 1 Foto",
    prints_doubled: false,
    default_frame: "pink",
    description:
      "Satu foto besar bergaya polaroid dengan ruang catatan manis di bawahnya.",
  },
  {
    id: "wide_recap_1",
    name: "Widescreen Memory Card (1 Pose)",
    photos_required: 1,
    layout: "wide_1",
    category: "single",
    aspect_label: "16:9 Widescreen • 1 Foto",
    prints_doubled: false,
    default_frame: "cream",
    description:
      "Satu foto landscape lebar untuk foto grup atau momen kebersamaan.",
  },
];

export interface PhotoFilterOption {
  id: string;
  name: string;
  desc: string;
  css: string;
}

export const PHOTO_FILTERS: PhotoFilterOption[] = [
  {
    id: "original",
    name: "Natural",
    desc: "Warna asli jernih natural",
    css: "none",
  },
  {
    id: "beauty",
    name: "Soft Beauty",
    desc: "Kulit halus & cerah merona",
    css: "brightness(1.08) contrast(0.96) saturate(1.12)",
  },
  {
    id: "bw",
    name: "Classic Mono",
    desc: "Hitam putih studio kontras",
    css: "grayscale(100%) contrast(1.2) brightness(1.04)",
  },
  {
    id: "warm",
    name: "Peachy Warm",
    desc: "Rona keemasan hangat lembut",
    css: "sepia(0.2) saturate(1.25) brightness(1.05) hue-rotate(-8deg)",
  },
  {
    id: "cool",
    name: "Dreamy Cool",
    desc: "Pastel sejuk Seoul studio",
    css: "hue-rotate(12deg) saturate(1.1) brightness(1.06) contrast(1.02)",
  },
  {
    id: "vintage",
    name: "Film Retro",
    desc: "Nuansa film vintage analog 90s",
    css: "sepia(0.48) contrast(1.08) brightness(0.96) saturate(1.12)",
  },
  {
    id: "rosy",
    name: "Rosy Blush",
    desc: "Pastel pink merona manis",
    css: "brightness(1.06) saturate(1.22) hue-rotate(-15deg)",
  },
  {
    id: "y2k",
    name: "Y2K Cyber Pop",
    desc: "Warna pop & dreamy bloom",
    css: "contrast(1.22) saturate(1.38) brightness(1.06)",
  },
  {
    id: "contrast",
    name: "Crisp Pop",
    desc: "Kontras tegas & tajam",
    css: "contrast(1.28) saturate(1.18) brightness(1.02)",
  },
  {
    id: "moody",
    name: "Moody Noir",
    desc: "Warm latte & soft shadow",
    css: "sepia(0.3) contrast(1.15) brightness(0.94) saturate(0.9)",
  },
];

export function buildFilterCssFromParams(params?: {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  smoothness?: number;
}): string {
  if (!params) return "none";
  const b = params.brightness ?? 1.0;
  const c = params.contrast ?? 1.0;
  const s = params.saturation ?? 1.0;
  const t = params.temperature ?? 1.0;
  const tint = params.tint ?? 1.0;

  const parts: string[] = [];
  if (Math.abs(b - 1.0) > 0.01) parts.push(`brightness(${b.toFixed(2)})`);
  if (Math.abs(c - 1.0) > 0.01) parts.push(`contrast(${c.toFixed(2)})`);
  if (Math.abs(s - 1.0) > 0.01) parts.push(`saturate(${s.toFixed(2)})`);
  if (t > 1.02) {
    const sep = Math.min(0.4, (t - 1.0) * 0.8);
    parts.push(`sepia(${sep.toFixed(2)})`);
  } else if (t < 0.98) {
    const deg = Math.round((1.0 - t) * 35);
    parts.push(`hue-rotate(${deg}deg)`);
  }
  if (tint > 1.02) {
    const deg = Math.round((tint - 1.0) * -20);
    parts.push(`hue-rotate(${deg}deg)`);
  }
  return parts.length > 0 ? parts.join(" ") : "none";
}

export function getFilterCss(
  filterId?: string,
  customPresets?: { id: string; params: Record<string, number> }[]
): string {
  if (!filterId) return "none";
  const found = PHOTO_FILTERS.find((f) => f.id === filterId);
  if (found) return found.css;
  if (customPresets) {
    const custom = customPresets.find((p) => p.id === filterId);
    if (custom) return buildFilterCssFromParams(custom.params);
  }
  return "none";
}

export const DEFAULT_STICKER_OPTIONS = [
  {
    id: "sweet_bows",
    name: "Mix Pita & Bunga",
    desc: "Kombinasi pita, hati, bunga & bintang",
  },
  {
    id: "hearts_only",
    name: "Lovely Hearts",
    desc: "Stiker hati manis di setiap sudut foto",
  },
  {
    id: "flowers_only",
    name: "Cherry Blossom",
    desc: "Stiker bunga pastel di setiap sudut foto",
  },
  {
    id: "sparkles_only",
    name: "Y2K Sparkles",
    desc: "Bintang kilau berkilauan",
  },
  {
    id: "none",
    name: "Tanpa Stiker (Clean)",
    desc: "Bingkai bersih minimalis tanpa stiker sudut",
  },
];

export interface ArPresetChoice {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const DEFAULT_AR_PRESETS: ArPresetChoice[] = [
  {
    id: "none",
    name: "Tanpa AR",
    emoji: "OFF",
    desc: "Foto natural tanpa stiker wajah",
  },
  {
    id: "pink_bunny_sweet",
    name: "Pink Bunny",
    emoji: "BUNNY",
    desc: "Telinga kelinci & pipi cinta",
  },
  {
    id: "cute_glasses_blush",
    name: "Cute Glasses",
    emoji: "GLASS",
    desc: "Kacamata aesthetic & perona pipi",
  },
  {
    id: "kitty_whiskers",
    name: "Kitty Whiskers",
    emoji: "KITTY",
    desc: "Telinga kucing & pita manis",
  },
  {
    id: "royal_princess",
    name: "Royal Princess",
    emoji: "CROWN",
    desc: "Mahkota emas & taburan hati",
  },
  {
    id: "sakura_fairy",
    name: "Sakura Fairy",
    emoji: "BLOOM",
    desc: "Pita pastel & kelopak sakura",
  },
];
