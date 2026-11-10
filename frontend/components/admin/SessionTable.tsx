"use client";

import React from "react";
import Link from "next/link";
import { SessionDetail } from "@/types/photobooth";
import { resolveStorageUrl } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface SessionTableProps {
  sessions: SessionDetail[];
}

export function SessionTable({ sessions }: SessionTableProps) {
  return (
    <Card variant="surface" padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-sweet-text">
          Recent Sessions ({sessions.length})
        </h3>
        <span className="text-xs text-sweet-muted">
          Data tersimpan di SQLite lokal
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-3">
          <div className="space-y-1">
            <p className="font-heading font-extrabold text-sm text-sweet-text">
              Belum ada riwayat sesi foto yang tercatat
            </p>
            <p className="text-xs text-sweet-muted max-w-md mx-auto">
              Database lokal belum menerima sesi pemotretan baru hari ini. Mulai sesi pertama dari layar utama untuk melihat riwayat foto dan status cetak di sini.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong hover:text-white text-sweet-text font-heading font-extrabold text-xs border-2 border-sweet-primaryStrong/40 transition-colors"
            >
              Buka Layar Kiosk untuk Memulai Sesi
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">
              Tabel riwayat sesi photobooth terbaru
            </caption>
            <thead>
              <tr className="border-b-2 border-sweet-border text-sweet-muted">
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Session ID
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Customer / Caption
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Template
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Photos
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Status
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Time
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading">
                  Hasil
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sweet-border/60">
              {sessions.map((s) => {
                const isDone = s.status === "COMPLETED";
                const isErr = s.status === "ERROR" || s.status === "ABORTED";
                const imgUrl = resolveStorageUrl(s.processed_image_url);
                return (
                  <tr key={s.session_id} className="hover:bg-sweet-bg/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-sweet-text">
                      {s.session_id}
                    </td>
                    <td className="py-2.5 px-3 text-sweet-text font-medium">
                      {s.customer_name || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-sweet-muted">
                      {s.template_id || "classic_strip_3"} ({s.frame_color || "cream"})
                    </td>
                    <td className="py-2.5 px-3 font-bold text-sweet-text">
                      {s.photos_taken}/{s.photos_required}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        tone={isDone ? "success" : isErr ? "error" : "lavender"}
                      >
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-3 text-sweet-muted">
                      {new Date(s.started_at).toLocaleTimeString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3">
                      {imgUrl ? (
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-heading font-bold text-sweet-primaryStrong underline"
                        >
                          Lihat Strip #{s.session_id.slice(-4)}
                        </a>
                      ) : (
                        <span className="text-sweet-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
