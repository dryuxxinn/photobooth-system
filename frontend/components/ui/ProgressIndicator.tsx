import React from "react";
import { CheckIcon, HeartIcon } from "@/components/icons";

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressIndicator({
  current,
  total,
  label,
}: ProgressIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const clamped = Math.min(safeTotal, Math.max(0, current));

  return (
    <div
      role="group"
      aria-label={label || `Progres foto: ${clamped} dari ${safeTotal}`}
      className="inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-sweet-surface/95 border-2 border-sweet-border shadow-sweet"
    >
      <div className="flex items-center gap-2.5" aria-hidden="true">
        {Array.from({ length: safeTotal }).map((_, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum <= clamped;
          return (
            <span
              key={stepNum}
              className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold transition-colors ${
                isCompleted
                  ? "bg-sweet-primaryStrong text-white shadow-sm"
                  : "bg-sweet-blush text-sweet-muted border border-sweet-primary"
              }`}
            >
              {isCompleted ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <HeartIcon className="size-3 text-sweet-primaryStrong/50" />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-heading font-bold text-sweet-text">
        {label || `${clamped} / ${safeTotal} photos`}
      </span>
    </div>
  );
}
