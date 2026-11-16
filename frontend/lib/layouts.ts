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
    case "quad_mini": {
      const totalW = 1200;
      const totalH = 1800;
      const slotW = 500;
      const slotH = 640;
      const slots: MockSlot[] = [
        { x: 50, y: 55, w: slotW, h: slotH, poseIndex: 0 },
        { x: 650, y: 55, w: slotW, h: slotH, poseIndex: 1 },
        { x: 50, y: 955, w: slotW, h: slotH, poseIndex: 2 },
        { x: 650, y: 955, w: slotW, h: slotH, poseIndex: 3 },
      ];
      return {
        width: totalW,
        height: totalH,
        kind: "postcard",
        slots,
        footerY: 1720,
      };
    }
    case "custom_mixed": {
      const totalW = 1200;
      const totalH = 1800;
      const slots: MockSlot[] = [
        { x: 70, y: 65, w: 1060, h: 930, poseIndex: 0 },
        { x: 50, y: 1240, w: 500, h: 430, poseIndex: 1 },
        { x: 650, y: 1240, w: 500, h: 430, poseIndex: 2 },
      ];
      return {
        width: totalW,
        height: totalH,
        kind: "postcard",
        slots,
        footerY: 1720,
      };
    }
    case "vertical":
    default:
      return buildStripSpec(posesRequired || 3, 1);
  }
}
