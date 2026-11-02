import { TemplateLayoutType } from "@/types/photobooth";

export interface MockSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  poseIndex: number;
}

export interface MockSpec {
  width: number;
  height: number;
  kind: "strip" | "twin" | "ticket" | "event" | "postcard";
  slots: MockSlot[];
  footerY: number;
}

function buildStripSpec(poses: number, strips: 1 | 2 = 1): MockSpec {
  const n = Math.max(1, poses);
  const slotW = 800;
  const slotH = 533;
  const margin = 30;
  const headerH = 30;
  const footerH = 160;
  const singleW = slotW + margin * 2; // 860
  const totalH = headerH + margin + n * (slotH + margin) + footerH;
  const gap = 24;
  const totalW = strips === 2 ? singleW * 2 + gap : singleW;

  const slots: MockSlot[] = [];
  for (let s = 0; s < strips; s++) {
    const xOffset = s * (singleW + gap);
    for (let i = 0; i < n; i++) {
      slots.push({
        x: xOffset + margin,
        y: headerH + margin + i * (slotH + margin),
        w: slotW,
        h: slotH,
        poseIndex: i,
      });
    }
  }

  return {
    width: totalW,
    height: totalH,
    kind: strips === 2 ? "twin" : "strip",
    slots,
    footerY: totalH - footerH + 45,
  };
}

export function getMockSpec(
  layout: TemplateLayoutType,
  posesRequired: number = 3
): MockSpec {
  switch (layout) {
    case "twin_strip":
      return buildStripSpec(3, 2);
    case "twin_strip_4":
      return buildStripSpec(4, 2);
    case "vertical_4":
      return buildStripSpec(4, 1);
    case "vertical_2":
      return buildStripSpec(2, 1);
    case "single":
      return buildStripSpec(1, 1);
    case "event_strip": {
      const n = 3;
      const slotW = 800;
      const slotH = 533;
      const margin = 30;
      const footerH = 280;
      const totalW = 860;
      const totalH = margin + n * (slotH + margin) + footerH;
      const slots: MockSlot[] = Array.from({ length: n }, (_, i) => ({
        x: margin,
        y: margin + i * (slotH + margin),
        w: slotW,
        h: slotH,
        poseIndex: i,
      }));
      return {
        width: totalW,
        height: totalH,
        kind: "event",
        slots,
        footerY: totalH - footerH + 95,
      };
    }
    case "ticket": {
      const totalW = 2020;
      const totalH = 630;
      const slotW = 340;
      const slotH = 440;
      const gap = 22;
      const startX = 45 + 240 + gap;
      const slots: MockSlot[] = Array.from({ length: 4 }, (_, i) => ({
        x: startX + i * (slotW + gap),
        y: 95,
        w: slotW,
        h: slotH,
        poseIndex: i,
      }));
      return {
        width: totalW,
        height: totalH,
        kind: "ticket",
        slots,
        footerY: 575,
      };
    }
    case "landscape_3": {
      const slotW = 480;
      const slotH = 640;
      const margin = 40;
      const totalW = 1600;
      const totalH = 840;
      const slots: MockSlot[] = Array.from({ length: 3 }, (_, i) => ({
        x: margin + i * (slotW + margin),
        y: margin,
        w: slotW,
        h: slotH,
        poseIndex: i,
      }));
      return {
        width: totalW,
        height: totalH,
        kind: "postcard",
        slots,
        footerY: 745,
      };
    }
    case "grid": {
      const slotW = 600;
      const slotH = 400;
      const margin = 30;
      const totalW = 1290;
      const totalH = 1010;
      const positions = [
        [margin, margin],
        [margin * 2 + slotW, margin],
        [margin, margin * 2 + slotH],
        [margin * 2 + slotW, margin * 2 + slotH],
      ];
      return {
        width: totalW,
        height: totalH,
        kind: "postcard",
        slots: positions.map(([x, y], i) => ({
          x,
          y,
          w: slotW,
          h: slotH,
          poseIndex: i,
        })),
        footerY: 925,
      };
    }
    case "wide_1": {
      return {
        width: 1600,
        height: 1000,
        kind: "postcard",
        slots: [{ x: 60, y: 60, w: 1480, h: 790, poseIndex: 0 }],
        footerY: 925,
      };
    }
    case "vertical":
    default:
      return buildStripSpec(posesRequired || 3, 1);
  }
}
