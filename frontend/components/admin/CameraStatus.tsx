"use client";

import React, { useState } from "react";
import { CameraStatus as CameraStatusType } from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CameraIcon, RefreshIcon } from "@/components/icons";

interface CameraStatusProps {
  cameraStatus: CameraStatusType | null;
  onRefresh: () => Promise<void>;
}

export function CameraStatus({ cameraStatus, onRefresh }: CameraStatusProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const isConnected = cameraStatus?.connected ?? false;

  const handleTestCapture = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await photoboothApi.captureStandaloneTest();
      setTestResult(`Berhasil: ${res.filename}`);
      await onRefresh();
    } catch (err: any) {
      setTestResult(`Gagal: ${err?.message || "Kesalahan kamera"}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card variant="surface" padding="md" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-sweet-blush flex items-center justify-center text-sweet-primaryStrong">
            <CameraIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-sweet-text">
              CAMERA
            </h3>
            <p className="text-xs text-sweet-muted">
              {cameraStatus?.model || "Canon EOS 700D"}
            </p>
          </div>
        </div>
        <StatusBadge tone={isConnected ? "success" : "error"}>
          {isConnected ? "Connected" : "Offline"}
        </StatusBadge>
      </div>

      <dl className="text-xs space-y-1 bg-sweet-bg p-3 rounded-2xl border border-sweet-border">
        <div className="flex justify-between">
          <dt className="text-sweet-muted">Driver:</dt>
          <dd className="font-mono font-bold text-sweet-text">
            {cameraStatus?.driver || "-"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sweet-muted">Baterai:</dt>
          <dd className="font-bold text-sweet-text">
            {cameraStatus?.battery_level ?? 100}%
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sweet-muted">Pesan:</dt>
          <dd className="text-sweet-text truncate max-w-[180px]">
            {cameraStatus?.message || "-"}
          </dd>
        </div>
      </dl>

      {testResult && (
        <p className="text-xs font-mono px-3 py-2 rounded-xl bg-sweet-blush text-sweet-text border border-sweet-primary">
          {testResult}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="md"
          loading={testing}
          onClick={handleTestCapture}
          className="flex-1 text-xs"
        >
          Tes Jepret Kamera
        </Button>
        <Button
          variant="surface"
          size="md"
          onClick={onRefresh}
          aria-label="Segarkan status kamera"
        >
          <RefreshIcon className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
