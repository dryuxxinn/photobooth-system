"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { SessionDetail } from "@/types/photobooth";
import { photoboothApi, resolveStorageUrl } from "@/services/api";
import { loadOperatorConfig } from "@/lib/config";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckIcon,
  DownloadIcon,
  EyeIcon,
  PrinterIcon,
  QrIcon,
  RefreshIcon,
  ShareIcon,
  SpinnerIcon,
} from "@/components/icons";

interface SessionTableProps {
  sessions: SessionDetail[];
  onRefresh?: () => Promise<void>;
}

export function SessionTable({ sessions, onRefresh }: SessionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    id: string;
    msg: string;
    tone: "success" | "error";
  } | null>(null);

  // Gallery Modal state
  const [selectedGallerySession, setSelectedGallerySession] =
    useState<SessionDetail | null>(null);
  const [galleryTab, setGalleryTab] = useState<"strip" | "poses" | "gif">(
    "strip"
  );

  // QR & Share Modal state
  const [activeShareSession, setActiveShareSession] =
    useState<SessionDetail | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter sessions by search text and status
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        s.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customer_name &&
          s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        s.status.toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  const handleReprint = async (session: SessionDetail) => {
    setReprintingId(session.session_id);
    setActionNotice(null);
    try {
      const res = await photoboothApi.reprintSession(session.session_id, 1);
      setActionNotice({
        id: session.session_id,
        msg: res.message || "Berhasil dikirim ke printer.",
        tone: "success",
      });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setActionNotice({
        id: session.session_id,
        msg: err?.message || "Gagal mencetak ulang.",
        tone: "error",
      });
    } finally {
      setReprintingId(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const getPublicShareUrl = (session: SessionDetail) => {
    const cfg = loadOperatorConfig();
    const base = (cfg.publicShareBaseUrl || "").trim().replace(/\/$/, "");
    if (base) {
      return `${base}/share/${session.session_id}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${session.session_id}`;
    }
    return `/share/${session.session_id}`;
  };

  const handleCopyShareLink = async (url: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <Card variant="surface" padding="md" className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-extrabold text-base text-sweet-text">
            Riwayat Sesi Photobooth ({filteredSessions.length} dari {sessions.length})
          </h3>
          <p className="text-xs text-sweet-muted">
            Data tersimpan kronologis di SQLite lokal. Format ID: Tanggal, Waktu & GMT.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Cari ID sesi atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-semibold text-sweet-text placeholder:text-sweet-muted w-full sm:w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="STARTED">STARTED / AKTIF</option>
            <option value="ERROR">ERROR</option>
            <option value="ABORTED">ABORTED</option>
          </select>

          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg hover:bg-sweet-surface border border-sweet-border text-sweet-text font-heading font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
              title="Perbarui data sesi"
            >
              <RefreshIcon className="size-3.5" />
              <span>Muat Ulang</span>
            </button>
          )}
        </div>
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
      ) : filteredSessions.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-2">
          <p className="font-heading font-bold text-sm text-sweet-text">
            Tidak ada sesi yang cocok dengan pencarian
          </p>
          <p className="text-xs text-sweet-muted">
            Coba ubah kata kunci pencarian atau filter status sesi di atas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">
              Tabel riwayat sesi photobooth terbaru dengan kendali cetak ulang dan galeri
            </caption>
            <thead>
              <tr className="border-b-2 border-sweet-border text-sweet-muted">
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Session ID (Tanggal & GMT)
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Pelanggan
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Pembayaran
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Template & Frame
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Foto
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Status
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold">
                  Waktu
                </th>
                <th scope="col" className="py-2.5 px-3 font-heading font-bold text-right">
                  Aksi Operator
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sweet-border/60">
              {filteredSessions.map((s) => {
                const isDone = s.status === "COMPLETED";
                const isErr = s.status === "ERROR" || s.status === "ABORTED";
                const isReprinting = reprintingId === s.session_id;
                const notice =
                  actionNotice?.id === s.session_id ? actionNotice : null;

                return (
                  <tr key={s.session_id} className="hover:bg-sweet-bg/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-sweet-text text-[11px] select-all">
                        {s.session_id}
                      </div>
                      {notice && (
                        <span
                          className={`text-[10px] font-heading font-bold block mt-0.5 ${
                            notice.tone === "success"
                              ? "text-[#1f6a45]"
                              : "text-sweet-error"
                          }`}
                        >
                          {notice.msg}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-sweet-text font-medium">
                      {s.customer_name || "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-heading font-bold text-sweet-text block">
                        {s.payment_amount != null
                          ? `Rp ${Number(s.payment_amount).toLocaleString("id-ID")}`
                          : "Rp 35.000"}
                      </span>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sweet-bg border border-sweet-border text-sweet-muted">
                        {s.payment_method || "QRIS"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sweet-muted">
                      <span className="font-semibold text-sweet-text">
                        {s.template_id || "classic_strip_3"}
                      </span>
                      <span className="block text-[10px]">
                        Frame: {s.frame_color || "cream"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGallerySession(s);
                          setGalleryTab("strip");
                        }}
                        className="group flex items-center gap-2 p-1 rounded-xl hover:bg-sweet-primary/20 transition-all text-left min-h-[44px]"
                        title="Buka galeri foto sesi ini"
                      >
                        {s.processed_image_url || (s.photos && s.photos.length > 0) ? (
                          <div className="relative size-10 rounded-lg overflow-hidden border border-sweet-border bg-sweet-bg shrink-0 shadow-2xs group-hover:border-sweet-primary">
                            <img
                              src={
                                resolveStorageUrl(s.processed_image_url) ||
                                resolveStorageUrl(
                                  s.photos?.[0]?.thumbnail_url ||
                                    s.photos?.[0]?.original_url
                                )
                              }
                              alt="Thumbnail sesi"
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="size-10 rounded-lg border border-dashed border-sweet-border bg-sweet-bg/60 flex items-center justify-center text-[10px] text-sweet-muted shrink-0">
                            -
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-sweet-text block">
                            {s.photos_taken}/{s.photos_required}
                          </span>
                          <span className="text-[10px] text-sweet-primaryStrong font-semibold group-hover:underline">
                            Lihat Foto
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        tone={isDone ? "success" : isErr ? "error" : "lavender"}
                      >
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-3 text-sweet-muted font-mono">
                      {new Date(s.started_at).toLocaleTimeString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Tombol Buka Galeri */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGallerySession(s);
                            setGalleryTab("strip");
                          }}
                          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white border border-sweet-border text-sweet-text hover:border-sweet-primaryStrong text-[11px] font-heading font-bold inline-flex items-center gap-1.5 transition-colors"
                          title="Buka galeri foto dan detail sesi"
                        >
                          <EyeIcon className="size-3.5 text-sweet-primaryStrong" />
                          <span>Galeri</span>
                        </button>

                        {/* Tombol Bagi / QR Code Modal */}
                        {isDone && (
                          <button
                            type="button"
                            onClick={() => setActiveShareSession(s)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white border border-sweet-border text-sweet-text hover:border-sweet-primaryStrong text-[11px] font-heading font-bold inline-flex items-center gap-1.5 transition-colors"
                            title="Tampilkan QR Galeri Digital untuk pelanggan"
                          >
                            <QrIcon className="size-3.5 text-sweet-primaryStrong" />
                            <span>Bagi QR</span>
                          </button>
                        )}

                        {/* Tombol Cetak Ulang (Reprint) */}
                        {isDone && (
                          <button
                            type="button"
                            disabled={isReprinting}
                            onClick={() => handleReprint(s)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text text-[11px] font-heading font-bold inline-flex items-center gap-1.5 border border-sweet-primaryStrong/40 transition-colors disabled:opacity-50"
                            title="Kirim ulang strip foto ke printer"
                          >
                            {isReprinting ? (
                              <SpinnerIcon className="size-3.5 animate-spin" />
                            ) : (
                              <PrinterIcon className="size-3.5" />
                            )}
                            <span>{isReprinting ? "Mencetak..." : "Reprint"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Galeri Foto & Detail Lengkap Sesi */}
      {selectedGallerySession && (
        <Modal
          isOpen={Boolean(selectedGallerySession)}
          onClose={() => setSelectedGallerySession(null)}
          title="Galeri Foto & Detail Sesi"
          subtitle={`Sesi: ${selectedGallerySession.session_id}`}
          maxWidthClass="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Metadata Ringkasan Sesi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-sweet-bg border border-sweet-border text-xs">
              <div>
                <span className="text-[10px] text-sweet-muted block">Pelanggan</span>
                <span className="font-heading font-bold text-sweet-text truncate block">
                  {selectedGallerySession.customer_name || "Tamu Booth"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sweet-muted block">Pembayaran</span>
                <span className="font-heading font-bold text-sweet-text block">
                  {selectedGallerySession.payment_amount != null
                    ? `Rp ${Number(selectedGallerySession.payment_amount).toLocaleString("id-ID")}`
                    : "Rp 35.000"}
                  <span className="ml-1 text-[10px] text-sweet-muted font-mono uppercase">
                    ({selectedGallerySession.payment_method || "QRIS"})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sweet-muted block">Template / Filter</span>
                <span className="font-heading font-bold text-sweet-text truncate block">
                  {selectedGallerySession.template_id || "classic_strip_3"} / {selectedGallerySession.filter_name || "original"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sweet-muted block">Waktu Sesi</span>
                <span className="font-heading font-bold text-sweet-text block font-mono">
                  {new Date(selectedGallerySession.started_at).toLocaleTimeString("id-ID")}
                </span>
              </div>
            </div>

            {/* Tab Navigasi Galeri */}
            <div
              role="group"
              aria-label="Tampilan galeri foto"
              className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-sweet-bg border border-sweet-border"
            >
              <button
                type="button"
                aria-pressed={galleryTab === "strip"}
                onClick={() => setGalleryTab("strip")}
                className={`min-h-[44px] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  galleryTab === "strip"
                    ? "bg-sweet-primary text-sweet-text shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                <span>Strip Foto Cetak</span>
              </button>
              <button
                type="button"
                aria-pressed={galleryTab === "poses"}
                onClick={() => setGalleryTab("poses")}
                className={`min-h-[44px] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  galleryTab === "poses"
                    ? "bg-sweet-primary text-sweet-text shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                <span>Pose Bilik ({selectedGallerySession.photos?.length || selectedGallerySession.photos_taken})</span>
              </button>
              <button
                type="button"
                aria-pressed={galleryTab === "gif"}
                onClick={() => setGalleryTab("gif")}
                className={`min-h-[44px] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  galleryTab === "gif"
                    ? "bg-sweet-primary text-sweet-text shadow-xs"
                    : "text-sweet-muted hover:text-sweet-text"
                }`}
              >
                <span>Animasi Boomerang</span>
              </button>
            </div>

            {/* Tab Content: Strip Foto Cetak */}
            {galleryTab === "strip" && (
              <div className="space-y-3">
                {selectedGallerySession.processed_image_url ? (
                  <div className="flex flex-col items-center">
                    <div className="max-h-[450px] overflow-auto p-2 bg-sweet-bg/80 rounded-2xl border border-sweet-border flex items-center justify-center">
                      <img
                        src={resolveStorageUrl(selectedGallerySession.processed_image_url)}
                        alt="Strip Foto Siap Cetak"
                        className="max-h-[420px] w-auto rounded-xl shadow-md object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                      <a
                        href={resolveStorageUrl(selectedGallerySession.processed_image_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-sweet-border text-sweet-text hover:border-sweet-primaryStrong font-heading font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <EyeIcon className="size-4 text-sweet-primaryStrong" />
                        <span>Buka Resolusi Penuh</span>
                      </a>
                      <a
                        href={resolveStorageUrl(selectedGallerySession.processed_image_url)}
                        download={`photobooth_${selectedGallerySession.session_id}_strip.jpg`}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <DownloadIcon className="size-4" />
                        <span>Unduh File Cetak</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-1">
                    <p className="font-heading font-bold text-sm text-sweet-text">
                      Strip foto belum selesai diproses
                    </p>
                    <p className="text-xs text-sweet-muted">
                      Sesi ini belum mencapai tahap akhir atau kompilasi strip belum dijalankan.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Pose Bilik (Individual Raw Photos) */}
            {galleryTab === "poses" && (
              <div className="space-y-3">
                {selectedGallerySession.photos && selectedGallerySession.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto p-1">
                    {selectedGallerySession.photos.map((photo, idx) => {
                      const photoUrl = resolveStorageUrl(photo.preview_url || photo.original_url);
                      return (
                        <div
                          key={photo.photo_id || idx}
                          className="p-2 rounded-2xl bg-sweet-bg border border-sweet-border flex flex-col items-center gap-2 group hover:border-sweet-primary transition-all"
                        >
                          <div className="w-full aspect-3/2 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                            <img
                              src={photoUrl}
                              alt={`Pose ${idx + 1}`}
                              className="size-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </div>
                          <div className="w-full flex items-center justify-between px-1">
                            <span className="text-[11px] font-heading font-bold text-sweet-text">
                              Pose {idx + 1}
                            </span>
                            <a
                              href={photoUrl}
                              download={`pose_${idx + 1}_${selectedGallerySession.session_id}.jpg`}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white border border-sweet-border text-sweet-text hover:border-sweet-primaryStrong text-[10px] font-heading font-bold inline-flex items-center gap-1 transition-colors"
                              title="Unduh foto pose ini"
                            >
                              <DownloadIcon className="size-3" />
                              <span>Unduh</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-1">
                    <p className="font-heading font-bold text-sm text-sweet-text">
                      Belum ada pose foto individu yang tersimpan
                    </p>
                    <p className="text-xs text-sweet-muted">
                      File foto kamera asli untuk sesi ini tidak ditemukan di direktori penyimpanan.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Animasi Boomerang */}
            {galleryTab === "gif" && (
              <div className="space-y-3">
                {selectedGallerySession.gif_url ? (
                  <div className="flex flex-col items-center">
                    <div className="max-h-[450px] p-2 bg-sweet-bg/80 rounded-2xl border border-sweet-border flex items-center justify-center">
                      <img
                        src={resolveStorageUrl(selectedGallerySession.gif_url)}
                        alt="Animasi Boomerang Sesi"
                        className="max-h-[380px] w-auto rounded-xl shadow-md object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={resolveStorageUrl(selectedGallerySession.gif_url)}
                        download={`photobooth_${selectedGallerySession.session_id}_boomerang.gif`}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <DownloadIcon className="size-4" />
                        <span>Unduh Animasi GIF</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 px-4 rounded-2xl bg-sweet-bg border border-sweet-border text-center space-y-1">
                    <p className="font-heading font-bold text-sm text-sweet-text">
                      Animasi Boomerang tidak tersedia
                    </p>
                    <p className="text-xs text-sweet-muted">
                      GIF bergerak dibuat otomatis saat sesi selesai. Sesi ini belum menghasilkan animasi GIF.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sweet-border">
              <div className="flex items-center gap-2">
                {selectedGallerySession.status === "COMPLETED" && (
                  <>
                    <button
                      type="button"
                      disabled={reprintingId === selectedGallerySession.session_id}
                      onClick={() => handleReprint(selectedGallerySession)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {reprintingId === selectedGallerySession.session_id ? (
                        <SpinnerIcon className="size-4 animate-spin" />
                      ) : (
                        <PrinterIcon className="size-4" />
                      )}
                      <span>
                        {reprintingId === selectedGallerySession.session_id
                          ? "Mencetak..."
                          : "Cetak Ulang (Reprint)"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedGallerySession;
                        setSelectedGallerySession(null);
                        setActiveShareSession(target);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-sweet-border text-sweet-text hover:border-sweet-primaryStrong font-heading font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <QrIcon className="size-4 text-sweet-primaryStrong" />
                      <span>Buka QR Pelanggan</span>
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedGallerySession(null)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-sweet-bg hover:bg-sweet-surface text-sweet-text font-heading font-bold text-xs border border-sweet-border transition-colors"
              >
                Tutup Galeri
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Bagi QR & Link Download untuk Pelanggan */}
      {activeShareSession && (
        <Modal
          isOpen={Boolean(activeShareSession)}
          onClose={() => setActiveShareSession(null)}
          title="Galeri Digital Pelanggan"
          subtitle={`Sesi: ${activeShareSession.session_id}`}
          maxWidthClass="max-w-md"
        >
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-white border border-sweet-border inline-block shadow-xs">
              <QRCodeSVG
                value={getPublicShareUrl(activeShareSession)}
                size={192}
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-sweet-muted">
              Pindai kode QR di atas untuk membuka galeri foto digital dan animasi GIF langsung di ponsel pelanggan.
            </p>

            <div className="space-y-2 text-left">
              <label
                htmlFor="share-url-readonly"
                className="font-heading font-bold text-xs text-sweet-text block"
              >
                Tautan Galeri Digital:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-url-readonly"
                  type="text"
                  readOnly
                  value={getPublicShareUrl(activeShareSession)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-mono text-sweet-text"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopyShareLink(getPublicShareUrl(activeShareSession))
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 shrink-0 inline-flex items-center gap-1.5 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <CheckIcon className="size-4 text-sweet-text" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <ShareIcon className="size-4" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveShareSession(null)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-sweet-bg hover:bg-sweet-surface text-sweet-text font-heading font-bold text-xs border border-sweet-border"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
