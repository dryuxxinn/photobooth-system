import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "cream" | "blush" | "lavender";
  padding?: "none" | "sm" | "md" | "lg";
}

const VARIANT_MAP: Record<NonNullable<CardProps["variant"]>, string> = {
  surface: "bg-sweet-surface border-sweet-border",
  cream: "bg-sweet-bg border-sweet-border",
  blush: "bg-sweet-blush border-sweet-primary/60",
  lavender: "bg-sweet-lavenderSoft border-sweet-secondary",
};

const PADDING_MAP: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  variant = "surface",
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-3xl border-2 shadow-sweet ${VARIANT_MAP[variant]} ${PADDING_MAP[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
