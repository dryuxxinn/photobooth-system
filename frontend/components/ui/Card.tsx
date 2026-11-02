import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "surface" | "cream" | "blush" | "lavender";
  padding?: "none" | "sm" | "md" | "lg";
}

const VARIANT_MAP: Record<NonNullable<CardProps["variant"]>, string> = {
  glass: "bg-white/70 backdrop-blur-md border border-white/80 shadow-sweetLg",
  surface: "bg-white/85 backdrop-blur-sm border border-sweet-border shadow-sweet",
  cream: "bg-[#FFF9F2]/90 border border-sweet-border shadow-sweet",
  blush: "bg-[#FFF0F5]/90 border-2 border-[#FBCFE8] shadow-sweet",
  lavender: "bg-[#F3E8FF]/90 border-2 border-[#DCD6F7] shadow-sweet",
};

const PADDING_MAP: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  variant = "glass",
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-[2rem] ${VARIANT_MAP[variant]} ${PADDING_MAP[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
