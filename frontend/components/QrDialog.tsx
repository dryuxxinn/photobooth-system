"use client";

import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertIcon, HeartIcon, ShareIcon } from "@/components/icons";

interface QrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  sessionId: string;
  onDownloadOrShare: () => Promise<void>;
}

export function QrDialog({
  isOpen,
  onClose,
  imageUrl,
  sessionId,
  onDownloadOrShare,
}: QrDialogProps) {
  const [customHost, setCustomHost] = useState("");

  const isLocalhostUrl = useMemo(() => {
    try {
      const parsed = new URL(imageUrl);
      return (
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
      );
    } catch {
      return false;
    }
  }, [imageUrl]);

  const effectiveQrUrl = useMemo(() => {
    if (!customHost.trim()) return imageUrl;
    try {
      const parsed = new URL(imageUrl);
      parsed.hostname = customHost.trim();
      return parsed.toString();
    } catch {
      return imageUrl;
    }
  }, [imageUrl, customHost]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unduh Foto Digital ♡"
      subtitle="Pindai kode QR di bawah ini menggunakan kamera ponsel atau gunakan tombol Bagikan."
      maxWidthClass="max-w-lg"
    >
      <div className="flex flex-col items-center text-center space-y-5">
        {isLocalhostUrl && !customHost.trim() && (
          <div className="w-full p-4 rounded-2xl bg-[#FCECEE] border border-[#EABAC0] text-left flex items-start gap-3">
            <AlertIcon className="size-5 text-sweet-error shrink-0 mt-0.5" />
            <div className="text-xs text-sweet-text space-y-2 flex-1">
              <p className="font-bold text-sweet-error">
                Perhatian Jaringan Lokal (localhost)
              </p>
              <p>
                Kiosk sedang dibuka melalui <code>localhost</code>. Agar ponsel
                pengunjung dapat mengunduh melalui Wi-Fi booth, masukkan IP LAN
                server Mini PC di bawah ini:
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
                  type="text"
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
            size={210}
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

        <div className="w-full flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<ShareIcon className="size-5" />}
            onClick={onDownloadOrShare}
            className="flex-1"
          >
            Bagikan / Simpan File
          </Button>
          <Button
            variant="surface"
            size="lg"
            onClick={onClose}
            className="sm:w-36"
          >
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
