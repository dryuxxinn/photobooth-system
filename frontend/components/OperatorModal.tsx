"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CameraStatus, PrinterStatus, SessionState } from "@/types/photobooth";
import { getApiBaseUrl, photoboothApi } from "@/services/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SettingsIcon } from "@/components/icons";

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SessionState;
  wsConnected: boolean;
  cameraStatus: CameraStatus | null;
  printerStatus: PrinterStatus | null;
  onRefreshStatus: () => Promise<void>;
  onEmergencyReset: () => Promise<void>;
}

export function OperatorModal({
  isOpen,
  onClose,
  state,
  wsConnected,
  cameraStatus,
  printerStatus,
  onRefreshStatus,
  onEmergencyReset,
}: OperatorModalProps) {
  const [testCaptureMessage, setTestCaptureMessage] = useState<string | null>(
    null
  );
  const [isTesting, setIsTesting] = useState(false);

  const handleTestCapture = async () => {
    setIsTesting(true);
    setTestCaptureMessage(null);
    try {
      const res = await photoboothApi.captureStandaloneTest();
      setTestCaptureMessage(`Sukses memotret: ${res.filename}`);
      await onRefreshStatus();
    } catch (err: any) {
      setTestCaptureMessage(`Gagal: ${err?.message || "Unknown error"}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnostik Cepat Operator"
      subtitle="Akses tersembunyi untuk memeriksa kamera, printer, atau mereset sesi."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm">
        <dl className="p-4 rounded-2xl bg-sweet-bg border border-sweet-border space-y-2">
          <div className="flex justify-between items-center">
            <dt className="text-sweet-muted">Server API:</dt>
            <dd className="font-mono text-xs font-bold text-sweet-text">
              {getApiBaseUrl()}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-sweet-muted">WebSocket Sinkronisasi:</dt>
            <dd>
              <StatusBadge tone={wsConnected ? "success" : "neutral"}>
                {wsConnected ? "Terhubung" : "Polling"}
              </StatusBadge>
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-sweet-muted">Status Mesin Sesi:</dt>
            <dd className="font-heading font-bold text-sweet-text">{state}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-sweet-muted">Kamera:</dt>
            <dd className="font-bold text-sweet-text">
              {cameraStatus?.model || "Tidak Terdeteksi"} (
              {cameraStatus?.driver || "-"})
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-sweet-muted">Printer:</dt>
            <dd className="font-bold text-sweet-text">
              {printerStatus?.printer_name || "-"} (
              {printerStatus?.driver || "-"})
            </dd>
          </div>
        </dl>

        {testCaptureMessage && (
          <div className="p-3 rounded-2xl bg-sweet-blush border border-sweet-primary text-xs font-mono text-sweet-text">
            {testCaptureMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="md"
            loading={isTesting}
            onClick={handleTestCapture}
          >
            Tes Jepret Kamera
          </Button>
          <Button variant="surface" size="md" onClick={onRefreshStatus}>
            Segarkan Status
          </Button>
        </div>

        <div className="pt-3 border-t border-sweet-border flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-full bg-sweet-secondary hover:bg-[#cbc2f2] text-sweet-text font-heading font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#c5bbf0]"
          >
            <SettingsIcon className="size-4" />
            <span>Buka Dashboard Admin Penuh</span>
          </Link>

          <Button
            variant="danger"
            size="md"
            onClick={async () => {
              await onEmergencyReset();
              onClose();
            }}
          >
            Force Reset IDLE
          </Button>
        </div>
      </div>
    </Modal>
  );
}
