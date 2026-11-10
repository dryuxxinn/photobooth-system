"use client";

import React from "react";
import Link from "next/link";
import {
  PrinterStatus as PrinterStatusType,
  PrintJobRecord,
} from "@/types/photobooth";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrinterIcon } from "@/components/icons";

interface PrinterStatusProps {
  printerStatus: PrinterStatusType | null;
  printJobs?: PrintJobRecord[];
  showJobsTable?: boolean;
}

export function PrinterStatus({
  printerStatus,
  printJobs = [],
  showJobsTable = false,
}: PrinterStatusProps) {
  const isReady = printerStatus?.ready ?? false;

  return (
    <div className="space-y-4">
      <Card variant="surface" padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-sweet-lavenderSoft flex items-center justify-center text-[#7A65B5]">
              <PrinterIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-sweet-text">
                PRINTER
              </h3>
              <p className="text-xs text-sweet-muted">
                {printerStatus?.printer_name || "CUPS / Simulasi"}
              </p>
            </div>
          </div>
          <StatusBadge tone={isReady ? "success" : "error"}>
            {isReady ? "Ready" : "Offline"}
          </StatusBadge>
        </div>

        <dl className="text-xs space-y-1 bg-sweet-bg p-3 rounded-2xl border border-sweet-border">
          <div className="flex justify-between">
            <dt className="text-sweet-muted">Driver:</dt>
            <dd className="font-mono font-bold text-sweet-text">
              {printerStatus?.driver || "-"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sweet-muted">Sisa Kertas:</dt>
            <dd className="font-bold text-sweet-text">
              {printerStatus?.paper_remaining ?? "-"} lembar
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sweet-muted">Status:</dt>
            <dd className="text-sweet-text truncate max-w-[180px]">
              {printerStatus?.message || "-"}
            </dd>
          </div>
        </dl>
      </Card>

      {showJobsTable && (
        <Card variant="surface" padding="md" className="space-y-3">
          <h3 className="font-heading font-bold text-base text-sweet-text">
            Riwayat Pekerjaan Cetak ({printJobs.length})
          </h3>
          {printJobs.length === 0 ? (
            <div className="py-6 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-2.5">
              <p className="font-heading font-extrabold text-sm text-sweet-text">
                Belum ada antrean atau riwayat pekerjaan cetak
              </p>
              <p className="text-xs text-sweet-muted max-w-md mx-auto">
                Antrean printer masih kosong karena belum ada sesi foto yang menekan tombol cetak hari ini.
              </p>
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong hover:text-white text-sweet-text font-heading font-extrabold text-xs border border-sweet-primaryStrong/40 transition-colors"
                >
                  Buka Layar Kiosk
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <caption className="sr-only">
                  Daftar pekerjaan cetak photobooth
                </caption>
                <thead>
                  <tr className="border-b border-sweet-border text-sweet-muted">
                    <th scope="col" className="py-2.5 px-3 font-heading">
                      Job ID
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-heading">
                      Session ID
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-heading">
                      Copies
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-heading">
                      Status
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-heading">
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sweet-border/60">
                  {printJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-sweet-bg/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-sweet-text">
                        {job.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-sweet-muted">
                        {job.session_id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-sweet-text">
                        {job.copies}×
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          tone={
                            job.status === "COMPLETED" ||
                            job.status === "completed"
                              ? "success"
                              : "error"
                          }
                        >
                          {job.status}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 px-3 text-sweet-muted">
                        {new Date(job.created_at).toLocaleTimeString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
