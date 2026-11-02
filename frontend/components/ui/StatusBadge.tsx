import React from "react";
import {
  AlertIcon,
  CheckIcon,
  HeartIcon,
  SparkleIcon,
} from "@/components/icons";

export type BadgeTone =
  | "success"
  | "warning"
  | "error"
  | "pink"
  | "lavender"
  | "neutral";

interface StatusBadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TONE_STYLES: Record<BadgeTone, string> = {
  success:
    "bg-[#EAF4EE] text-sweet-success border-[#BBDAC6]",
  warning:
    "bg-[#FFF8DF] text-[#8A6D1B] border-[#F0D98C]",
  error:
    "bg-[#FCECEE] text-sweet-error border-[#EABAC0]",
  pink:
    "bg-sweet-blush text-sweet-text border-sweet-primary",
  lavender:
    "bg-sweet-lavenderSoft text-sweet-text border-sweet-secondary",
  neutral:
    "bg-sweet-surface text-sweet-muted border-sweet-border",
};

function defaultIconForTone(tone: BadgeTone) {
  switch (tone) {
    case "success":
      return <CheckIcon className="size-4 shrink-0" />;
    case "warning":
      return <SparkleIcon className="size-3.5 shrink-0 text-[#C59B27]" />;
    case "error":
      return <AlertIcon className="size-4 shrink-0" />;
    case "lavender":
      return <SparkleIcon className="size-3.5 shrink-0 text-[#7A65B5]" />;
    case "pink":
    default:
      return <HeartIcon className="size-3.5 shrink-0 text-sweet-primaryStrong" />;
  }
}

export function StatusBadge({
  tone = "pink",
  icon,
  children,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-heading font-bold ${TONE_STYLES[tone]} ${className}`}
    >
      {icon !== undefined ? icon : defaultIconForTone(tone)}
      <span>{children}</span>
    </span>
  );
}
