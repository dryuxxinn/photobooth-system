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

export const PHOTO_FILTERS = [
  { id: "original", name: "Natural ✨", desc: "Warna asli cerah" },
  { id: "warm", name: "Peachy Warm 🌸", desc: "Rona hangat lembut" },
  { id: "vintage", name: "Film Retro 🎞️", desc: "Sentuhan klasik" },
  { id: "bw", name: "Mono B&W 🖤", desc: "Hitam putih dramatis" },
  { id: "contrast", name: "Crisp Pop 🎀", desc: "Kontras lebih tegas" },
] as const;
