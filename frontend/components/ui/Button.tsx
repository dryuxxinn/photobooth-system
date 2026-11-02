"use client";

import React from "react";
import { SpinnerIcon } from "@/components/icons";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "strong"
    | "secondary"
    | "surface"
    | "ghost"
    | "danger"
    | "success";
  size?: "md" | "lg" | "xl";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-sweet-primary hover:bg-sweet-primaryStrong active:bg-sweet-primaryStrong text-sweet-text border-2 border-sweet-primaryStrong/40 shadow-sweet",
  strong:
    "bg-sweet-primaryStrong hover:bg-[#df6d7e] active:bg-[#d45f70] text-white border-2 border-sweet-primaryStrong shadow-sweetLg",
  secondary:
    "bg-sweet-secondary hover:bg-[#cbc2f2] active:bg-[#bfb4ee] text-sweet-text border-2 border-[#c5bbf0] shadow-sweet",
  surface:
    "bg-sweet-surface hover:bg-sweet-blush active:bg-sweet-primary/40 text-sweet-text border-2 border-sweet-border shadow-sweet",
  ghost:
    "bg-transparent hover:bg-sweet-blush/80 active:bg-sweet-primary/30 text-sweet-text border-2 border-transparent",
  danger:
    "bg-sweet-error hover:bg-[#a13d48] text-white border-2 border-sweet-error shadow-sweet",
  success:
    "bg-sweet-success hover:bg-[#46735a] text-white border-2 border-sweet-success shadow-sweet",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "min-h-[48px] px-5 py-2.5 text-sm rounded-full gap-2",
  lg: "min-h-[54px] px-6 py-3 text-base rounded-full gap-2.5",
  xl: "min-h-[68px] px-9 py-4 text-xl rounded-full gap-3",
};

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-heading font-bold tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <SpinnerIcon className="size-5" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
