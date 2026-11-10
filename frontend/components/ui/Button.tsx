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
    "bg-[#FBCFE8] hover:bg-[#F9A8D4] active:bg-[#F472B6] text-[#3F3D56] border-2 border-[#F472B6]/60",
  strong:
    "bg-[#F472B6] hover:bg-[#EC4899] active:bg-[#DB2777] text-white border-2 border-[#EC4899]",
  secondary:
    "bg-[#DCD6F7] hover:bg-[#D0C7F5] active:bg-[#BFB2F0] text-[#3F3D56] border-2 border-[#C2B4EE]",
  surface:
    "bg-white hover:bg-[#FFF9F2] active:bg-[#FFF0F5] text-[#3F3D56] border-2 border-[#F3E6EE]",
  ghost:
    "bg-transparent hover:bg-white/70 active:bg-[#FBCFE8]/30 text-[#3F3D56] border-2 border-transparent",
  danger:
    "bg-[#B84C58] hover:bg-[#9F3E49] text-white border-2 border-[#9F3E49]",
  success:
    "bg-[#54866A] hover:bg-[#436D56] text-white border-2 border-[#436D56]",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-[44px] px-3.5 py-2 text-xs rounded-xl gap-1.5",
  md: "min-h-[48px] px-5 py-2.5 text-xs sm:text-sm rounded-2xl gap-2",
  lg: "min-h-[54px] px-7 py-3 text-sm sm:text-base rounded-2xl gap-2.5",
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
      className={`inline-flex items-center justify-center font-heading font-extrabold tracking-wide transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <SpinnerIcon className="size-5" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
