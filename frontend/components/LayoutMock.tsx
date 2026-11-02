"use client";

import React, { useId } from "react";
import { FrameThemeOption, PhotoItem, TemplateOption } from "@/types/photobooth";
import { getThemeHex, inkFor, isDarkHex, subInkFor } from "@/lib/color";
import { getMockSpec } from "@/lib/layouts";
import { resolveStorageUrl } from "@/services/api";

interface LayoutMockProps {
  template: TemplateOption;
  frameColorId: string;
  frameThemes?: FrameThemeOption[];
  photos?: PhotoItem[];
  captionText?: string;
  className?: string;
}

const POSE_PASTELS = [
  ["#FDE2E7", "#F6C9D2"],
  ["#ECE8FC", "#DCD6F7"],
  ["#E2F1FF", "#C8E3FF"],
  ["#E4F6EC", "#C7ECD8"],
];

function accentForTheme(frameColorId: string, bgHex: string): string {
  switch (frameColorId) {
    case "pink":
      return "#E5738A";
    case "lavender":
      return "#8C76CD";
    case "sky":
      return "#4B91D2";
    case "mint":
      return "#48A874";
    case "gold":
      return "#C59B27";
    case "burgundy":
      return "#F5D07D";
    case "black":
      return "#F6C9D2";
    default:
      return isDarkHex(bgHex) ? "#F6C9D2" : "#E892A2";
  }
}

function SvgHeart({
  cx,
  cy,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  const s = r / 12;
  return (
    <path
      transform={`translate(${cx}, ${cy}) scale(${s})`}
      d="M 0 10 C -2 8 -12 1 -12 -5 C -12 -9 -8 -12 -4 -12 C -1 -12 0 -9 0 -8 C 0 -9 1 -12 4 -12 C 8 -12 12 -9 12 -5 C 12 1 2 8 0 10 Z"
      fill={fill}
    />
  );
}

function SvgSparkle({
  cx,
  cy,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  const inner = r * 0.32;
  const pts = [
    `${cx},${cy - r}`,
    `${cx + inner},${cy - inner}`,
    `${cx + r},${cy}`,
    `${cx + inner},${cy + inner}`,
    `${cx},${cy + r}`,
    `${cx - inner},${cy + inner}`,
    `${cx - r},${cy}`,
    `${cx - inner},${cy - inner}`,
  ].join(" ");
  return <polygon points={pts} fill={fill} />;
}

function SvgFlower({
  cx,
  cy,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  const petalR = r * 0.46;
  const dist = r * 0.52;
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const ang = (2 * Math.PI * i) / 5 - Math.PI / 2;
    return {
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist,
    };
  });
  return (
    <g>
      {petals.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r={petalR} fill={fill} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.36} fill="#F7D97E" />
    </g>
  );
}

function SvgBow({
  cx,
  cy,
  r,
  fill,
  knotFill = "#FFF9F2",
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  knotFill?: string;
}) {
  return (
    <g>
      {/* Left & right tails */}
      <polygon
        points={`${cx - 2},${cy + 2} ${cx - r * 0.8},${cy + r * 1.1} ${
          cx - r * 0.32
        },${cy + r * 1.2}`}
        fill={fill}
      />
      <polygon
        points={`${cx + 2},${cy + 2} ${cx + r * 0.8},${cy + r * 1.1} ${
          cx + r * 0.32
        },${cy + r * 1.2}`}
        fill={fill}
      />
      {/* Left & right wings */}
      <polygon
        points={`${cx},${cy} ${cx - r * 1.2},${cy - r * 0.68} ${
          cx - r * 1.2
        },${cy + r * 0.58}`}
        fill={fill}
      />
      <polygon
        points={`${cx},${cy} ${cx + r * 1.2},${cy - r * 0.68} ${
          cx + r * 1.2
        },${cy + r * 0.58}`}
        fill={fill}
      />
      <circle cx={cx} cy={cy} r={r * 0.34} fill={knotFill} />
    </g>
  );
}

export function LayoutMock({
  template,
  frameColorId,
  frameThemes,
  photos = [],
  captionText,
  className = "",
}: LayoutMockProps) {
  const rawId = useId().replace(/:/g, "");
  const spec = getMockSpec(template.layout, template.photos_required);
  const bgHex = getThemeHex(frameColorId, frameThemes);
  const ink = inkFor(bgHex);
  const subInk = subInkFor(bgHex);
  const accent = accentForTheme(frameColorId, bgHex);
  const stickerBg = isDarkHex(bgHex) ? "#282C36" : "#FFF9F2";
  const title = (captionText?.trim() || "SWEET STUDIO").toUpperCase();

  return (
    <svg
      aria-hidden="true"
      height="100%"
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      className={`select-none drop-shadow-sm ${className}`}
    >
      <defs>
        {POSE_PASTELS.map(([c1, c2], idx) => (
          <linearGradient
            key={idx}
            id={`slotGrad-${rawId}-${idx}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        ))}
      </defs>

      {/* Main Frame Canvas */}
      <rect
        x={0}
        y={0}
        width={spec.width}
        height={spec.height}
        rx={26}
        fill={bgHex}
        stroke="rgba(73,59,59,0.18)"
        strokeWidth={8}
      />

      {/* Decorative Stitched Inner Frame Border + Corner Ornaments */}
      {spec.kind !== "ticket" && spec.kind !== "event" && (
        <g>
          <rect
            x={16}
            y={16}
            width={spec.width - 32}
            height={spec.height - 32}
            rx={20}
            fill="none"
            stroke={accent}
            strokeWidth={5}
            strokeDasharray="22 14"
            opacity={0.85}
          />
          {/* Corner Flowers & Hearts */}
          <SvgFlower cx={42} cy={42} r={22} fill={accent} />
          <SvgFlower cx={spec.width - 42} cy={42} r={22} fill={accent} />
          <SvgHeart cx={42} cy={spec.height - 42} r={20} fill={accent} />
          <SvgHeart
            cx={spec.width - 42}
            cy={spec.height - 42}
            r={20}
            fill={accent}
          />
          {/* Top Center Cute Coquette Bow */}
          <SvgBow
            cx={spec.width / 2}
            cy={34}
            r={26}
            fill={accent}
            knotFill={stickerBg}
          />
          <SvgSparkle cx={spec.width / 2 - 140} cy={34} r={14} fill={accent} />
          <SvgSparkle cx={spec.width / 2 + 140} cy={34} r={14} fill={accent} />
        </g>
      )}

      {/* Event Gold Geometric Border */}
      {spec.kind === "event" && (
        <g>
          <rect
            x={14}
            y={14}
            width={spec.width - 28}
            height={spec.height - 28}
            rx={16}
            fill="none"
            stroke="#BC922A"
            strokeWidth={6}
          />
          <rect
            x={40}
            y={spec.height - 265}
            width={spec.width - 80}
            height={235}
            fill="none"
            stroke="#BC922A"
            strokeWidth={5}
          />
          <rect
            x={54}
            y={spec.height - 251}
            width={spec.width - 108}
            height={207}
            fill="none"
            stroke="#BC922A"
            strokeWidth={2}
          />
          <SvgHeart
            cx={spec.width / 2}
            cy={spec.height - 218}
            r={18}
            fill="#BC922A"
          />
        </g>
      )}

      {/* Twin strip center cut line */}
      {spec.kind === "twin" && (
        <line
          x1={spec.width / 2}
          y1={24}
          x2={spec.width / 2}
          y2={spec.height - 24}
          stroke={subInk}
          strokeWidth={6}
          strokeDasharray="18 18"
        />
      )}

      {/* Ticket inner border & scalloped notches */}
      {spec.kind === "ticket" && (
        <g>
          <rect
            x={40}
            y={40}
            width={spec.width - 80}
            height={spec.height - 80}
            rx={16}
            fill="#FAF5E8"
            stroke="#2A2020"
            strokeWidth={6}
          />
          <rect
            x={54}
            y={54}
            width={spec.width - 108}
            height={spec.height - 108}
            rx={10}
            fill="none"
            stroke="#2A2020"
            strokeWidth={3}
          />
        </g>
      )}

      {/* Photo Slots + Cute Corner Sticker Badges */}
      {spec.slots.map((slot, idx) => {
        const photo = photos[slot.poseIndex];
        const photoSrc = photo
          ? resolveStorageUrl(photo.preview_url || photo.thumbnail_url)
          : "";
        const gradId = `slotGrad-${rawId}-${slot.poseIndex % POSE_PASTELS.length}`;
        const clipId = `slotClip-${rawId}-${idx}`;
        const stickerX = idx % 2 === 0 ? slot.x + 36 : slot.x + slot.w - 36;
        const stickerY = slot.y + 36;
        const stickerKind = idx % 4;

        return (
          <g key={idx}>
            <clipPath id={clipId}>
              <rect
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
                rx={16}
              />
            </clipPath>

            <g clipPath={`url(#${clipId})`}>
              <rect
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
                fill={`url(#${gradId})`}
              />
              {photoSrc ? (
                <image
                  href={photoSrc}
                  x={slot.x}
                  y={slot.y}
                  width={slot.w}
                  height={slot.h}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g>
                  {/* Cute sample portrait silhouette */}
                  <circle
                    cx={slot.x + slot.w * 0.5}
                    cy={slot.y + slot.h * 0.4}
                    r={Math.min(slot.w, slot.h) * 0.16}
                    fill="rgba(73, 59, 59, 0.22)"
                  />
                  <path
                    d={`M ${slot.x + slot.w * 0.26} ${slot.y + slot.h * 0.88} Q ${
                      slot.x + slot.w * 0.5
                    } ${slot.y + slot.h * 0.56} ${slot.x + slot.w * 0.74} ${
                      slot.y + slot.h * 0.88
                    }`}
                    fill="rgba(73, 59, 59, 0.18)"
                  />
                  <text
                    x={slot.x + slot.w / 2}
                    y={slot.y + slot.h - 28}
                    textAnchor="middle"
                    fill="#493B3B"
                    fontSize={Math.max(26, Math.min(slot.w, slot.h) * 0.08)}
                    fontWeight="700"
                    opacity={0.7}
                  >
                    {`POSE ${slot.poseIndex + 1} ♡`}
                  </text>
                </g>
              )}
            </g>

            {/* Double Photo Slot Frame Border */}
            <rect
              x={slot.x}
              y={slot.y}
              width={slot.w}
              height={slot.h}
              rx={16}
              fill="none"
              stroke={stickerBg}
              strokeWidth={10}
            />
            <rect
              x={slot.x - 2}
              y={slot.y - 2}
              width={slot.w + 4}
              height={slot.h + 4}
              rx={18}
              fill="none"
              stroke={spec.kind === "event" ? "#BC922A" : accent}
              strokeWidth={4}
            />

            {/* Cute Corner Sticker Badge on Photo */}
            {spec.kind !== "ticket" && (
              <g>
                <circle
                  cx={stickerX}
                  cy={stickerY}
                  r={28}
                  fill={stickerBg}
                  stroke={spec.kind === "event" ? "#BC922A" : accent}
                  strokeWidth={4}
                />
                {stickerKind === 0 && (
                  <SvgHeart
                    cx={stickerX}
                    cy={stickerY}
                    r={16}
                    fill={spec.kind === "event" ? "#BC922A" : accent}
                  />
                )}
                {stickerKind === 1 && (
                  <SvgFlower cx={stickerX} cy={stickerY} r={17} fill={accent} />
                )}
                {stickerKind === 2 && (
                  <SvgBow
                    cx={stickerX}
                    cy={stickerY - 2}
                    r={15}
                    fill={accent}
                    knotFill="#F7D97E"
                  />
                )}
                {stickerKind === 3 && (
                  <SvgSparkle
                    cx={stickerX}
                    cy={stickerY}
                    r={17}
                    fill={accent}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Center Scrapbook Flower Emblem for 2x2 Grid */}
      {template.layout === "grid" && (
        <g>
          <circle
            cx={spec.width / 2}
            cy={445}
            r={46}
            fill={stickerBg}
            stroke={accent}
            strokeWidth={6}
          />
          <SvgFlower cx={spec.width / 2} cy={445} r={28} fill={accent} />
        </g>
      )}

      {/* Footer / Header Branding */}
      {spec.kind === "ticket" ? (
        <g>
          <text
            x={80}
            y={140}
            fill="#2A2020"
            fontSize={34}
            fontWeight="800"
          >
            * ADMIT ONE *
          </text>
          <text
            x={80}
            y={220}
            fill="#2A2020"
            fontSize={26}
            fontWeight="700"
          >
            ROW 14 • SEAT 21
          </text>
          <text
            x={spec.width - 235}
            y={140}
            fill="#2A2020"
            fontSize={30}
            fontWeight="800"
          >
            SWEET FILM
          </text>
          <text
            x={spec.width - 235}
            y={205}
            fill="#761624"
            fontSize={28}
            fontWeight="800"
          >
            ★ ★ ★ ★ ★
          </text>
        </g>
      ) : (
        <g>
          {/* Decorative Footer Pill Badge */}
          {spec.kind !== "event" && (
            <rect
              x={spec.width * 0.12}
              y={spec.footerY - 46}
              width={spec.width * 0.76}
              height={108}
              rx={28}
              fill={stickerBg}
              stroke={accent}
              strokeWidth={4}
            />
          )}
          <text
            x={spec.width / 2}
            y={spec.footerY}
            textAnchor="middle"
            fill={spec.kind === "event" ? "#876216" : ink}
            fontSize={Math.max(28, spec.width * 0.03)}
            fontWeight="800"
            letterSpacing="3"
          >
            {`✦ ${title.slice(0, 18)} ✦`}
          </text>
          <text
            x={spec.width / 2}
            y={spec.footerY + 38}
            textAnchor="middle"
            fill={spec.kind === "event" ? "#BC922A" : subInk}
            fontSize={Math.max(20, spec.width * 0.02)}
            fontWeight="600"
          >
            a little moment, a lovely memory ♡
          </text>
        </g>
      )}
    </svg>
  );
}
