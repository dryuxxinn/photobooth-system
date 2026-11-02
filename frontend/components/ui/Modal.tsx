"use client";

import React, { useEffect, useId, useRef } from "react";
import { XIcon } from "@/components/icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-xl",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ("closedBy" in HTMLDialogElement.prototype) return;

    const handleClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    };

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      onClose={onClose}
      className={`w-[92vw] ${maxWidthClass} rounded-3xl bg-sweet-surface text-sweet-text border-2 border-sweet-border p-0 shadow-sweetLg`}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-sweet-border bg-sweet-blush/50">
        <div>
          <h2 id={titleId} className="text-xl font-heading font-bold text-sweet-text">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-sweet-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Tutup dialog"
            className="min-h-[48px] min-w-[48px] px-4 rounded-full bg-sweet-surface hover:bg-sweet-primary/40 border border-sweet-border text-sweet-text font-bold text-sm inline-flex items-center justify-center gap-1.5"
          >
            <XIcon className="size-4" />
            <span>Tutup</span>
          </button>
        </form>
      </div>
      <div className="p-6 max-h-[78dvh] overflow-y-auto kiosk-scroll">
        {children}
      </div>
    </dialog>
  );
}
