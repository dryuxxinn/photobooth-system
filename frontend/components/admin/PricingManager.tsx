"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BoothOperatorConfig, SessionDetail } from "@/types/photobooth";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckIcon,
  PlusIcon,
  QrIcon,
  SparkleIcon,
  XIcon,
} from "@/components/icons";

interface PricingManagerProps {
  config: BoothOperatorConfig;
  onUpdateConfig: (next: BoothOperatorConfig) => void;
  sessions?: SessionDetail[];
}

const QUICK_PRICE_PRESETS = [1000, 15000, 25000, 35000, 50000];

export function PricingManager({
  config,
  onUpdateConfig,
  sessions = [],
}: PricingManagerProps) {
  const [priceInput, setPriceInput] = useState<string>(
    String(config.sessionPriceIdr ?? 35000)
  );
  const [newVoucherInput, setNewVoucherInput] = useState("");
  const [priceSavedNotice, setPriceSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setPriceInput(String(config.sessionPriceIdr ?? 35000));
  }, [config.sessionPriceIdr]);

  // Financial calculations from session records
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED"),
    [sessions]
  );

  const currentPrice = config.sessionPriceIdr ?? 35000;
  const estimatedRevenue = completedSessions.length * currentPrice;

  const commitPrice = (rawVal: string, showNotice = false) => {
    const digitsOnly = rawVal.replace(/\D/g, "");
    const parsed = parseInt(digitsOnly, 10);
    const nextPrice = Number.isNaN(parsed) || parsed < 1 ? 1000 : parsed;
    setPriceInput(String(nextPrice));
    onUpdateConfig({
      ...config,
      sessionPriceIdr: nextPrice,
    });
    if (showNotice) {
      setPriceSavedNotice(
        `Tarif Rp ${nextPrice.toLocaleString("id-ID")} berhasil tersimpan ke server`
      );
      setTimeout(() => setPriceSavedNotice(null), 3500);
    }
  };

  const activeVouchers = useMemo(() => {
    return (config.voucherCodes || ["SWEET2026", "VIPFREE", "BESTIE"]).filter(
      Boolean
    );
  }, [config.voucherCodes]);

  const handleAddVoucher = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newVoucherInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!clean) return;
    if (activeVouchers.includes(clean)) {
      setNewVoucherInput("");
      return;
    }
    const updated = [...activeVouchers, clean];
    onUpdateConfig({
      ...config,
      voucherCodes: updated,
    });
    setNewVoucherInput("");
  };

  const handleRemoveVoucher = (codeToRemove: string) => {
    const updated = activeVouchers.filter((c) => c !== codeToRemove);
    onUpdateConfig({
      ...config,
      voucherCodes: updated,
    });
  };

  return (
    <div className="space-y-6">
      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs">
          <span className="text-xs text-sweet-muted font-heading font-bold block mb-1">
            Estimasi Omset Selesai
          </span>
          <span className="font-heading font-extrabold text-2xl text-sweet-text">
            Rp {estimatedRevenue.toLocaleString("id-ID")}
          </span>
          <span className="text-[11px] text-sweet-muted block mt-1">
            Berdasarkan {completedSessions.length} sesi completed
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs">
          <span className="text-xs text-sweet-muted font-heading font-bold block mb-1">
            Tarif Sesi Aktif
          </span>
          <span className="font-heading font-extrabold text-2xl text-sweet-primaryStrong">
            Rp {currentPrice.toLocaleString("id-ID")}
          </span>
          <span className="text-[11px] text-sweet-muted block mt-1">
            Berlaku di layar Kiosk saat ini
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs">
          <span className="text-xs text-sweet-muted font-heading font-bold block mb-1">
            Status Pembayaran Kiosk
          </span>
          <div className="mt-1">
            <StatusBadge tone={config.requirePayment ? "success" : "lavender"}>
              {config.requirePayment ? "Mode Berbayar Aktif" : "Mode Gratis / Bebas"}
            </StatusBadge>
          </div>
          <span className="text-[11px] text-sweet-muted block mt-2">
            {config.requirePayment
              ? "Pelanggan wajib scan QRIS atau input voucher"
              : "Pelanggan langsung masuk bilik foto"}
          </span>
        </div>
      </div>

      {/* Pengaturan Harga Sesi QRIS */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <QrIcon className="size-5 text-sweet-primaryStrong" />
              <span>Pengaturan Tarif Sesi QRIS</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Ubah harga sesi kapan saja. Perubahan tersimpan di server dan langsung diterapkan di layar Kiosk.
            </p>
          </div>
          <StatusBadge tone="success">Sinkronisasi Server Aktif</StatusBadge>
        </div>

        {/* Toggle Mode Berbayar */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sweet-bg border border-sweet-border cursor-pointer">
          <div>
            <span className="font-heading font-bold text-sm text-sweet-text block">
              Aktifkan Gerbang Pembayaran Kiosk
            </span>
            <span className="text-xs text-sweet-muted">
              Wajibkan pemindaian QRIS dinamis atau penukaran kode voucher sebelum countdown foto dimulai
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.requirePayment ?? true}
            onChange={(e) =>
              onUpdateConfig({
                ...config,
                requirePayment: e.target.checked,
              })
            }
            className="size-5 accent-sweet-primaryStrong"
          />
        </label>

        {/* Input Harga & Preset */}
        <div className="p-4 rounded-3xl bg-sweet-bg border border-sweet-border space-y-3">
          <label
            htmlFor="pricing-price-input"
            className="font-heading font-bold text-xs text-sweet-text block"
          >
            Nominal Pembayaran QRIS (Rp):
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-heading font-bold text-sweet-muted">
                Rp
              </span>
              <input
                id="pricing-price-input"
                name="session_price_idr"
                type="text"
                inputMode="numeric"
                placeholder="35000"
                value={priceInput}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setPriceInput(digitsOnly);
                  const numeric = parseInt(digitsOnly, 10);
                  if (!Number.isNaN(numeric) && numeric >= 1) {
                    onUpdateConfig({
                      ...config,
                      sessionPriceIdr: numeric,
                    });
                  }
                }}
                onBlur={() => commitPrice(priceInput, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPrice(priceInput, true);
                  }
                }}
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white border border-sweet-border text-xs font-heading font-bold text-sweet-text"
              />
            </div>
            <button
              type="button"
              onClick={() => commitPrice(priceInput, true)}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 shrink-0 transition-colors"
            >
              Simpan Tarif
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-heading font-bold text-sweet-muted block mb-1.5">
              Pilihan Cepat Nominal:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRICE_PRESETS.map((preset) => {
                const isActive = currentPrice === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => commitPrice(String(preset), true)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-colors ${
                      isActive
                        ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-xs"
                        : "bg-white text-sweet-muted border-sweet-border hover:border-sweet-primaryStrong hover:text-sweet-text"
                    }`}
                  >
                    Rp {preset.toLocaleString("id-ID")}
                  </button>
                );
              })}
            </div>
          </div>

          {priceSavedNotice && (
            <p className="text-xs font-heading font-bold text-[#1f6a45] pt-1">
              {priceSavedNotice}
            </p>
          )}
        </div>
      </Card>

      {/* Manajemen Voucher Kasir */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-base text-sweet-text flex items-center gap-2">
              <SparkleIcon className="size-5 text-sweet-primaryStrong" />
              <span>Kode Voucher Kasir & Tamu VIP</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Kode rahasia kasir untuk sesi gratis atau event khusus tanpa memindai QRIS.
            </p>
          </div>
          <span className="text-xs text-sweet-muted font-heading font-semibold">
            {activeVouchers.length} Kode Aktif
          </span>
        </div>

        {/* Input Tambah Voucher Baru */}
        <form onSubmit={handleAddVoucher} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ketik kode baru (contoh: EVENTVIP2026)..."
            value={newVoucherInput}
            onChange={(e) => setNewVoucherInput(e.target.value.toUpperCase())}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold uppercase text-sweet-text placeholder:normal-case placeholder:font-normal placeholder:text-sweet-muted"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 shrink-0 inline-flex items-center gap-1.5 transition-colors"
          >
            <PlusIcon className="size-4" />
            <span>Tambah</span>
          </button>
        </form>

        {/* Daftar Badge Voucher Aktif */}
        <div className="space-y-2">
          <span className="text-xs font-heading font-bold text-sweet-muted block">
            Daftar Kode yang Sedang Berlaku:
          </span>
          <div className="flex flex-wrap gap-2">
            {activeVouchers.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-sweet-border text-xs font-mono font-bold text-sweet-text shadow-xs"
              >
                <span>{code}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVoucher(code)}
                  className="size-6 rounded-full hover:bg-sweet-bg text-sweet-muted hover:text-sweet-error inline-flex items-center justify-center transition-colors"
                  title={`Hapus kode ${code}`}
                >
                  <XIcon className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Info Integrasi DOKU QRIS Production */}
      <Card variant="surface" padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-sm text-sweet-text">
            INFORMASI GATEWAY PEMBAYARAN DOKU
          </h3>
          <StatusBadge tone="success">Produksi Aktif</StatusBadge>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-sweet-bg p-3.5 rounded-2xl border border-sweet-border">
          <div>
            <dt className="text-sweet-muted font-heading">Merchant:</dt>
            <dd className="font-heading font-bold text-sweet-text">BOOTH STUDIO</dd>
          </div>
          <div>
            <dt className="text-sweet-muted font-heading">NMID Resmi:</dt>
            <dd className="font-mono font-bold text-sweet-text">ID1026636710380</dd>
          </div>
          <div>
            <dt className="text-sweet-muted font-heading">Kota Merchant:</dt>
            <dd className="font-heading font-bold text-sweet-text">DEPOK</dd>
          </div>
          <div>
            <dt className="text-sweet-muted font-heading">Format QR:</dt>
            <dd className="font-heading font-bold text-[#1f6a45]">EMVCo Dynamic QRIS</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}