"use client";

import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoboothApi } from "@/services/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { playSuccessChime } from "@/lib/sound";
import {
  CheckIcon,
  HeartIcon,
  QrIcon,
  RefreshIcon,
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

interface QrisRecord {
  transaction_id: string;
  invoice_number?: string;
  amount: number;
  package_name?: string;
  qr_string: string;
  status: "PENDING" | "PAID" | "FAILED";
  provider?: string;
  is_simulated?: boolean;
}

const QRIS_EXPIRY_SECONDS = 300; // 5 minutes standard DOKU QRIS expiry

export function PaymentModal({
  isOpen,
  onClose,
  amountIdr,
  validVoucherCodes,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [tab, setTab] = useState<"qris" | "voucher">("qris");
  const [qrisTx, setQrisTx] = useState<QrisRecord | null>(null);
  const [loadingQris, setLoadingQris] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(QRIS_EXPIRY_SECONDS);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successHandledRef = useRef<boolean>(false);

  // Initialize or regenerate QRIS payment
  const fetchNewQris = () => {
    setLoadingQris(true);
    setSecondsLeft(QRIS_EXPIRY_SECONDS);
    successHandledRef.current = false;
    photoboothApi
      .createQrisPayment(amountIdr, "Sweet Studio Photobooth Session")
      .then((tx) => setQrisTx(tx))
      .catch(() => null)
      .finally(() => setLoadingQris(false));
  };

  useEffect(() => {
    if (!isOpen) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
      return;
    }

    setVoucherCode("");
    setVoucherError(null);
    fetchNewQris();

    // 5-minute expiry countdown timer
    expiryTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, [isOpen, amountIdr]);

  // Real-time polling for DOKU QRIS webhook confirmation
  useEffect(() => {
    if (!isOpen || !qrisTx || qrisTx.status !== "PENDING" || secondsLeft <= 0) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await photoboothApi.getQrisPaymentStatus(qrisTx.transaction_id);
        if (check.status === "PAID" && !successHandledRef.current) {
          successHandledRef.current = true;
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setQrisTx((prev) => (prev ? { ...prev, status: "PAID" } : prev));
          playSuccessChime(true);
          setTimeout(() => {
            onPaymentSuccess();
          }, 850);
        }
      } catch {
        // Silent fallback on polling network blip
      }
    }, 2000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isOpen, qrisTx, secondsLeft, onPaymentSuccess]);

  // Manual test confirmation (for development / simulation)
  const handleSimulateQrisPaid = async () => {
    if (!qrisTx) {
      onPaymentSuccess();
      return;
    }
    setLoadingQris(true);
    try {
      const updated = await photoboothApi.confirmQrisPayment(qrisTx.transaction_id);
      setQrisTx((prev) => (prev ? { ...prev, status: updated.status } : prev));
      playSuccessChime(true);
      setTimeout(() => {
        onPaymentSuccess();
      }, 650);
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
      await photoboothApi.verifyVoucherCode(voucherCode.trim(), validVoucherCodes);
      playSuccessChime(true);
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

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Sesi Photobooth"
      subtitle="Pindai QRIS instan atau masukkan kode voucher kasir untuk mulai berfoto."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
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
          <div className="flex flex-col items-center text-center space-y-3.5">
            {/* QR Container */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-sweet-primary shadow-sweet flex flex-col items-center gap-3 relative overflow-hidden w-full max-w-xs">
              {qrisTx?.status === "PAID" ? (
                <div className="size-[210px] flex flex-col items-center justify-center gap-3 bg-[#ECFDF5] rounded-2xl border-2 border-[#A7F3D0] animate-bubble-pop text-center p-4">
                  <div className="size-16 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md">
                    <CheckIcon className="size-9" />
                  </div>
                  <span className="font-heading font-extrabold text-base text-[#065F46]">
                    Pembayaran Berhasil!
                  </span>
                  <span className="text-xs text-[#047857] font-heading font-semibold">
                    Membuka sesi foto studio...
                  </span>
                </div>
              ) : secondsLeft <= 0 ? (
                <div className="size-[210px] flex flex-col items-center justify-center gap-3 bg-[#FFF1F2] rounded-2xl border-2 border-[#FECDD3] text-center p-4">
                  <span className="font-heading font-extrabold text-sm text-[#BE123C]">
                    QRIS Telah Kedaluwarsa
                  </span>
                  <p className="text-xs text-sweet-muted">
                    Batas waktu pembayaran 5 menit telah berakhir.
                  </p>
                  <Button
                    variant="strong"
                    size="sm"
                    onClick={fetchNewQris}
                    leftIcon={<RefreshIcon className="size-4 text-white" />}
                  >
                    Buat QRIS Baru
                  </Button>
                </div>
              ) : loadingQris && !qrisTx ? (
                <div className="size-[210px] flex flex-col items-center justify-center gap-2">
                  <SpinnerIcon className="size-8 text-sweet-primaryStrong animate-spin" />
                  <span className="text-xs font-heading font-bold text-sweet-muted">
                    Membuat QRIS DOKU...
                  </span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <QRCodeSVG
                    value={qrisTx?.qr_string || "00020101021226580014ID.CO.QRIS"}
                    size={200}
                    bgColor="#FFFFFF"
                    fgColor="#3F3D56"
                    level="M"
                    includeMargin
                  />
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-heading font-bold text-sweet-muted">
                    <span className="size-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span>Menunggu Pembayaran: </span>
                    <span className="text-sweet-primaryStrong font-extrabold font-mono">
                      {timeFormatted}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <StatusBadge tone={qrisTx?.status === "PAID" ? "success" : "pink"}>
                  {qrisTx?.status === "PAID"
                    ? "Lunas • Sesi Aktif"
                    : `Nominal: ${formattedPrice}`}
                </StatusBadge>
                {qrisTx?.provider === "DOKU" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#6B21A8] text-[10px] font-heading font-extrabold border border-[#E9D5FF]">
                    DOKU Live
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-sweet-muted max-w-sm mx-auto">
              Buka aplikasi GoPay, OVO, Dana, ShopeePay, BCA, atau Mobile Banking pilihanmu, lalu pindai kode QRIS di atas.
            </p>

            {/* Bottom Actions */}
            <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="strong"
                size="lg"
                loading={loadingQris}
                leftIcon={<CheckIcon className="size-5 text-white" />}
                onClick={handleSimulateQrisPaid}
                className="flex-1 min-h-[48px]"
                title="Tekan untuk simulasi pembayaran lunas instan"
              >
                Simulasi / Tes Bayar
              </Button>
              <Button variant="surface" size="lg" onClick={onClose} className="min-h-[48px]">
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
                className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl bg-white border-2 border-sweet-border text-sweet-text font-heading font-extrabold text-base tracking-wider uppercase focus:border-[#F472B6]"
              />
              <span id="voucher-hint" className="block text-[11px] text-sweet-muted mt-1.5">
                Kode bawaan untuk kasir/operator: <code>SWEET2026</code>,{" "}
                <code>VIPFREE</code>, atau <code>BESTIE</code>.
              </span>
              {voucherError && (
                <p role="alert" className="text-xs font-heading font-bold text-sweet-error mt-2">
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
                className="flex-1 min-h-[48px]"
              >
                Gunakan Voucher & Mulai
              </Button>
              <Button type="button" variant="surface" size="lg" onClick={onClose} className="min-h-[48px]">
                Batal
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
