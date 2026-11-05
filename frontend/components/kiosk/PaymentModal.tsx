"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoboothApi } from "@/services/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckIcon,
  HeartIcon,
  QrIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/icons";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountIdr: number;
  validVoucherCodes?: string[];
  onPaymentSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  amountIdr,
  validVoucherCodes,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [tab, setTab] = useState<"qris" | "voucher">("qris");
  const [qrisTx, setQrisTx] = useState<{
    transaction_id: string;
    amount: number;
    qr_string: string;
    status: "PENDING" | "PAID";
  } | null>(null);
  const [loadingQris, setLoadingQris] = useState(false);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setVoucherCode("");
    setVoucherError(null);
    setLoadingQris(true);
    photoboothApi
      .createQrisPayment(amountIdr, "Sweet Studio Photobooth Session")
      .then((tx) => setQrisTx(tx))
      .catch(() => null)
      .finally(() => setLoadingQris(false));
  }, [isOpen, amountIdr]);

  const handleSimulateQrisPaid = async () => {
    if (!qrisTx) {
      onPaymentSuccess();
      return;
    }
    setLoadingQris(true);
    try {
      const updated = await photoboothApi.confirmQrisPayment(
        qrisTx.transaction_id
      );
      setQrisTx((prev) => (prev ? { ...prev, status: updated.status } : prev));
      setTimeout(() => {
        onPaymentSuccess();
      }, 450);
    } catch {
      onPaymentSuccess();
    } finally {
      setLoadingQris(false);
    }
  };

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      setVoucherError("Masukkan kode voucher terlebih dahulu.");
      return;
    }
    setVerifyingVoucher(true);
    setVoucherError(null);
    try {
      await photoboothApi.verifyVoucherCode(
        voucherCode.trim(),
        validVoucherCodes
      );
      onPaymentSuccess();
    } catch (err: any) {
      setVoucherError(
        err?.message || "Kode voucher tidak valid. Coba 'SWEET2026'."
      );
    } finally {
      setVerifyingVoucher(false);
    }
  };

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amountIdr || 35000);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Sesi Photobooth ♡"
      subtitle="Pilih pembayaran instan via QRIS atau masukkan kode voucher kasir."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-5">
        {/* Mode Switcher */}
        <div
          role="group"
          aria-label="Metode pembayaran"
          className="grid grid-cols-2 gap-2 p-1.5 rounded-full bg-sweet-bg border border-sweet-border"
        >
          <button
            type="button"
            aria-pressed={tab === "qris"}
            onClick={() => setTab("qris")}
            className={`min-h-[44px] rounded-full font-heading font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              tab === "qris"
                ? "bg-sweet-primary text-sweet-text shadow-xs"
                : "text-sweet-muted hover:text-sweet-text"
            }`}
          >
            <QrIcon className="size-4" />
            <span>Scan QRIS ({formattedPrice})</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "voucher"}
            onClick={() => setTab("voucher")}
            className={`min-h-[44px] rounded-full font-heading font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              tab === "voucher"
                ? "bg-sweet-primary text-sweet-text shadow-xs"
                : "text-sweet-muted hover:text-sweet-text"
            }`}
          >
            <SparkleIcon className="size-4" />
            <span>Kode Voucher Kasir</span>
          </button>
        </div>

        {tab === "qris" ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-5 rounded-3xl bg-white border-2 border-sweet-primary shadow-sweet flex flex-col items-center gap-3">
              {loadingQris && !qrisTx ? (
                <div className="size-[200px] flex items-center justify-center">
                  <SpinnerIcon className="size-8 text-sweet-primaryStrong animate-spin" />
                </div>
              ) : (
                <QRCodeSVG
                  value={qrisTx?.qr_string || "00020101021226580014ID.CO.QRIS"}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#493B3B"
                  level="M"
                  includeMargin
                />
              )}
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={qrisTx?.status === "PAID" ? "success" : "pink"}
                >
                  {qrisTx?.status === "PAID"
                    ? "Pembayaran Berhasil ✓"
                    : `Tagihan: ${formattedPrice}`}
                </StatusBadge>
              </div>
            </div>

            <p className="text-xs text-sweet-muted max-w-sm">
              Pindai kode QRIS di atas menggunakan aplikasi GoPay, OVO, Dana,
              ShopeePay, atau Mobile Banking.
            </p>

            <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                variant="strong"
                size="lg"
                loading={loadingQris}
                leftIcon={<CheckIcon className="size-5 text-white" />}
                onClick={handleSimulateQrisPaid}
                className="flex-1"
              >
                Konfirmasi / Simulasi Bayar QRIS
              </Button>
              <Button variant="surface" size="lg" onClick={onClose}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVoucherSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="booth-voucher-input"
                className="block font-heading font-extrabold text-xs text-sweet-text mb-1.5"
              >
                Masukkan Kode Voucher Sesi:
              </label>
              <input
                id="booth-voucher-input"
                name="voucher_code"
                type="text"
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="done"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  if (voucherError) setVoucherError(null);
                }}
                placeholder="Contoh: SWEET2026"
                aria-describedby="voucher-hint"
                className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl bg-white border-2 border-sweet-border text-sweet-text font-heading font-extrabold text-base tracking-wider uppercase focus:border-[#F472B6] outline-none"
              />
              <span
                id="voucher-hint"
                className="block text-[11px] text-sweet-muted mt-1.5"
              >
                Kode bawaan untuk demo/operator: <code>SWEET2026</code>,{" "}
                <code>VIPFREE</code>, atau <code>BESTIE</code>.
              </span>
              {voucherError && (
                <p
                  role="alert"
                  className="text-xs font-heading font-bold text-sweet-error mt-2"
                >
                  {voucherError}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                type="submit"
                variant="strong"
                size="lg"
                loading={verifyingVoucher}
                rightIcon={<HeartIcon className="size-5 text-white" />}
                className="flex-1"
              >
                Gunakan Voucher & Mulai
              </Button>
              <Button
                type="button"
                variant="surface"
                size="lg"
                onClick={onClose}
              >
                Batal
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
