"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { loadOperatorConfig } from "@/lib/config";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertIcon,
  HeartIcon,
  ShareIcon,
  SparkleIcon,
} from "@/components/icons";

interface QrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  gifUrl?: string;
  sessionId: string;
  onDownloadOrShare: () => Promise<void>;
}

export function QrDialog({
  isOpen,
  onClose,
  imageUrl,
  gifUrl,
  sessionId,
  onDownloadOrShare,
}: QrDialogProps) {
  const [customHost, setCustomHost] = useState("");
  const [qrMode, setQrMode] = useState<"gallery" | "strip" | "gif">("gallery");
  const [publicBaseUrl, setPublicBaseUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const cfg = loadOperatorConfig();
    if (cfg.publicShareBaseUrl) {
      setPublicBaseUrl(cfg.publicShareBaseUrl);
    }
  }, [isOpen]);

  const galleryShareUrl = useMemo(() => {
    if (publicBaseUrl.trim()) {
      return `${publicBaseUrl.trim().replace(/\/$/, "")}/share/${sessionId}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${sessionId}`;
    }
    return `http://localhost:3000/share/${sessionId}`;
  }, [publicBaseUrl, sessionId]);

  const rawTargetUrl = useMemo(() => {
    if (qrMode === "gallery") return galleryShareUrl;
    if (qrMode === "gif" && gifUrl) return gifUrl;
    return imageUrl;
  }, [qrMode, galleryShareUrl, gifUrl, imageUrl]);

  const isLocalhostUrl = useMemo(() => {
    try {
      const parsed = new URL(rawTargetUrl);
      return (
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
      );
    } catch {
      return false;
    }
  }, [rawTargetUrl]);

  const effectiveQrUrl = useMemo(() => {
    if (!customHost.trim()) return rawTargetUrl;
    try {
      const parsed = new URL(rawTargetUrl);
      parsed.hostname = customHost.trim();
      return parsed.toString();
    } catch {
      return rawTargetUrl;
    }
  }, [rawTargetUrl, customHost]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unduh Foto & Boomerang GIF"
      subtitle="Pindai kode QR menggunakan kamera ponsel untuk membuka Galeri Digital (Strip + GIF + Semua Pose)."
      maxWidthClass="max-w-lg"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* QR Target Mode Switcher */}
        <div
          role="group"
          aria-label="Target tautan kode QR"
          className="inline-flex flex-wrap items-center justify-center p-1 rounded-2xl bg-sweet-bg border border-sweet-border gap-1 w-full"
        >
          <button
            type="button"
            aria-pressed={qrMode === "gallery"}
            onClick={() => setQrMode("gallery")}
            className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs transition-all ${
              qrMode === "gallery"
                ? "bg-sweet-primary text-sweet-text shadow-xs"
                : "text-sweet-muted hover:text-sweet-text"
            }`}
          >
            Galeri Lengkap
          </button>
          <button
            type="button"
            aria-pressed={qrMode === "strip"}
            onClick={() => setQrMode("strip")}
            className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs transition-all ${
              qrMode === "strip"
                ? "bg-sweet-primary text-sweet-text shadow-xs"
                : "text-sweet-muted hover:text-sweet-text"
            }`}
          >
            Strip Foto
          </button>
          {gifUrl && (
            <button
              type="button"
              aria-pressed={qrMode === "gif"}
              onClick={() => setQrMode("gif")}
              className={`min-h-[44px] flex-1 px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs transition-all ${
                qrMode === "gif"
                  ? "bg-sweet-primary text-sweet-text shadow-xs"
                  : "text-sweet-muted hover:text-sweet-text"
              }`}
            >
              Boomerang GIF
            </button>
          )}
        </div>

        {isLocalhostUrl && !customHost.trim() && (
          <div className="w-full p-3.5 rounded-2xl bg-[#FCECEE] border border-[#EABAC0] text-left flex items-start gap-3">
            <AlertIcon className="size-5 text-sweet-error shrink-0 mt-0.5" />
            <div className="text-xs text-sweet-text space-y-2 flex-1">
              <p className="font-bold text-sweet-error">
                Perhatian Jaringan Lokal (localhost)
              </p>
              <p>
                Masukkan IP LAN server Mini PC agar ponsel pengunjung dapat
                memindai QR melalui Wi-Fi booth:
              </p>
              <div>
                <label
                  htmlFor="lan-ip-override"
                  className="block font-bold mb-1 text-sweet-text"
                >
                  IP LAN Server (opsional):
                </label>
                <input
                  id="lan-ip-override"
                  name="lan_ip_override"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="Contoh: 192.168.1.10"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-sweet-border text-sweet-text text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-5 rounded-3xl bg-white border-2 border-sweet-primary shadow-sweet flex flex-col items-center gap-3">
          <QRCodeSVG
            value={effectiveQrUrl || "https://sweetstudio.local"}
            size={205}
            bgColor="#FFFFFF"
            fgColor="#493B3B"
            level="M"
            includeMargin
          />
          <StatusBadge
            tone="pink"
            icon={<HeartIcon className="size-3.5 text-sweet-primaryStrong" />}
          >
            Sesi #{sessionId}
          </StatusBadge>
        </div>

        <p className="text-xs text-sweet-muted font-mono break-all px-4">
          {effectiveQrUrl}
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<ShareIcon className="size-5" />}
            onClick={onDownloadOrShare}
            className="flex-1"
          >
            Bagikan / Simpan File
          </Button>
          <Link
            href={`/share/${sessionId}`}
            target="_blank"
            className="min-h-[54px] px-4 py-2.5 rounded-full bg-sweet-secondary hover:bg-[#CBBFF5] text-sweet-text font-heading font-extrabold text-sm inline-flex items-center justify-center gap-1.5 border-2 border-white shadow-xs transition-all"
          >
            <SparkleIcon className="size-4" />
            <span>Buka Halaman Galeri</span>
          </Link>
          <Button
            variant="surface"
            size="lg"
            onClick={onClose}
            className="sm:w-28"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
