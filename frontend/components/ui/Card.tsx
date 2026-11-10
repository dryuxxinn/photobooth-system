import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "surface" | "cream" | "blush" | "lavender";
  padding?: "none" | "sm" | "md" | "lg";
}

const VARIANT_MAP: Record<NonNullable<CardProps["variant"]>, string> = {
  glass: "bg-white border-2 border-[#F3E6EE]",
  surface: "bg-white border border-sweet-border",
  cream: "bg-[#FFF9F2] border border-sweet-border",
  blush: "bg-[#FFF0F5] border-2 border-[#FBCFE8]",
  lavender: "bg-[#F3E8FF] border-2 border-[#DCD6F7]",
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
