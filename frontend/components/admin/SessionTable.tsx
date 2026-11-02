"use client";

import React from "react";
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
        <p className="text-sm text-sweet-muted py-6 text-center">
          Belum ada riwayat sesi foto hari ini.
        </p>
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
