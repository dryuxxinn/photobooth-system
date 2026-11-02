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
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-r from-[#FBCFE8] to-[#F9A8D4] hover:from-[#F9A8D4] hover:to-[#F472B6] active:from-[#F472B6] active:to-[#EC4899] text-[#3F3D56] border-2 border-[#F472B6]/60 shadow-sweet hover:shadow-pink-300/60",
  strong:
    "bg-gradient-to-r from-[#F472B6] to-[#EC4899] hover:from-[#EC4899] hover:to-[#DB2777] active:from-[#DB2777] active:to-[#BE185D] text-white border-2 border-[#F472B6] shadow-sweetLg hover:shadow-pink-400/60",
  secondary:
    "bg-[#DCD6F7] hover:bg-[#D0C7F5] active:bg-[#BFB2F0] text-[#3F3D56] border-2 border-[#C2B4EE] shadow-sweet",
  surface:
    "bg-white/80 hover:bg-white active:bg-[#FFF0F5] text-[#3F3D56] border-2 border-white/90 backdrop-blur-sm shadow-sweet hover:shadow-pink-200/50",
  ghost:
    "bg-transparent hover:bg-white/60 active:bg-[#FBCFE8]/30 text-[#3F3D56] border-2 border-transparent",
  danger:
    "bg-[#F43F5E] hover:bg-[#E11D48] text-white border-2 border-[#E11D48] shadow-sweet",
  success:
    "bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#059669] shadow-sweet",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-[38px] px-3.5 py-1.5 text-xs rounded-full gap-1.5",
  md: "min-h-[46px] px-5 py-2 text-xs sm:text-sm rounded-full gap-2",
  lg: "min-h-[54px] px-7 py-3 text-sm sm:text-base rounded-full gap-2.5",
  xl: "min-h-[66px] px-9 py-4 text-lg sm:text-xl rounded-full gap-3",
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
      className={`inline-flex items-center justify-center font-heading font-extrabold tracking-wide transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <SpinnerIcon className="size-5" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
