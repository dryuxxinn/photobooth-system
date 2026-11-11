"use client";

import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { photoboothApi } from "@/services/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { playSuccessChime } from "@/lib/sound";
import {
  AlertIcon,
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
  checkout_url?: string | null;
  status: "PENDING" | "PAID" | "FAILED";
  provider?: string;
}

const QRIS_EXPIRY_SECONDS = 300; // 5 minutes DOKU QRIS expiry

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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(QRIS_EXPIRY_SECONDS);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successHandledRef = useRef<boolean>(false);

  // Initialize or regenerate production DOKU QRIS payment
  const fetchNewQris = () => {
    setLoadingQris(true);
    setQrisError(null);
    setStatusNotice(null);
    setQrisTx(null);
    setSecondsLeft(QRIS_EXPIRY_SECONDS);
    successHandledRef.current = false;

    photoboothApi
      .createQrisPayment(amountIdr, "Sweet Studio Photobooth Session")
      .then((tx) => {
        setQrisTx(tx);
      })
      .catch((err: any) => {
        setQrisError(
          err?.message ||
            "Gagal membuat kode QRIS DOKU. Pastikan koneksi dan kredensial DOKU aktif."
        );
      })
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

  // Real-time polling for DOKU QRIS webhook & server status confirmation
  useEffect(() => {
    if (!isOpen || !qrisTx || qrisTx.status !== "PENDING" || secondsLeft <= 0) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await photoboothApi.getQrisPaymentStatus(
          qrisTx.transaction_id
        );
        if (check.status === "PAID" && !successHandledRef.current) {
          successHandledRef.current = true;
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setQrisTx((prev) => (prev ? { ...prev, status: "PAID" } : prev));
          playSuccessChime(true);
          setTimeout(() => {
            onPaymentSuccess();
          }, 850);
        } else if (check.status === "FAILED") {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setQrisTx((prev) => (prev ? { ...prev, status: "FAILED" } : prev));
          setQrisError("Transaksi QRIS gagal atau dibatalkan. Silakan buat QRIS baru.");
        }
      } catch {
        // Ignore transient network blips during background polling
      }
    }, 2500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isOpen, qrisTx, secondsLeft, onPaymentSuccess]);

  // Active status verification with DOKU server when user taps "Cek Status Pembayaran"
  const handleCheckPaymentStatus = async () => {
    if (!qrisTx) {
      fetchNewQris();
      return;
    }
    setCheckingStatus(true);
    setStatusNotice(null);
    setQrisError(null);
    try {
      const updated = await photoboothApi.confirmQrisPayment(
        qrisTx.transaction_id
      );
      if (updated.status === "PAID" && !successHandledRef.current) {
        successHandledRef.current = true;
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        setQrisTx((prev) => (prev ? { ...prev, status: "PAID" } : prev));
        playSuccessChime(true);
        setTimeout(() => {
          onPaymentSuccess();
        }, 700);
      } else if (updated.status === "FAILED") {
        setQrisTx((prev) => (prev ? { ...prev, status: "FAILED" } : prev));
        setQrisError("Transaksi QRIS tidak berhasil. Silakan buat QRIS baru.");
      } else {
        setStatusNotice(
          "Pembayaran belum terkonfirmasi dari DOKU. Jika Anda sudah membayar, mohon tunggu beberapa detik karena sistem sedang memverifikasi otomatis."
        );
      }
    } catch (err: any) {
      setQrisError(
        err?.message || "Gagal memeriksa status pembayaran ke server DOKU."
      );
    } finally {
      setCheckingStatus(false);
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
      playSuccessChime(true);
      onPaymentSuccess();
    } catch (err: any) {
      setVoucherError(
        err?.message ||
          "Kode voucher tidak ditemukan atau sudah tidak berlaku. Silakan hubungi kasir."
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
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Sesi Photobooth"
      subtitle="Pindai QRIS DOKU resmi atau masukkan kode voucher kasir untuk mulai berfoto."
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
              ) : secondsLeft <= 0 || qrisTx?.status === "FAILED" ? (
                <div className="size-[210px] flex flex-col items-center justify-center gap-3 bg-[#FFF1F2] rounded-2xl border-2 border-[#FECDD3] text-center p-4">
                  <span className="font-heading font-extrabold text-sm text-[#BE123C]">
                    {qrisTx?.status === "FAILED"
                      ? "Transaksi QRIS Gagal"
                      : "QRIS Telah Kedaluwarsa"}
                  </span>
                  <p className="text-xs text-sweet-muted">
                    {qrisTx?.status === "FAILED"
                      ? "Silakan buat ulang kode QRIS untuk melanjutkan pembayaran."
                      : "Batas waktu pembayaran 5 menit telah berakhir."}
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
              ) : loadingQris ? (
                <div className="size-[210px] flex flex-col items-center justify-center gap-2">
                  <SpinnerIcon className="size-8 text-sweet-primaryStrong animate-spin" />
                  <span className="text-xs font-heading font-bold text-sweet-muted">
                    Menghubungkan ke DOKU QRIS...
                  </span>
                </div>
              ) : qrisError || !qrisTx?.qr_string ? (
                <div
                  role="alert"
                  className="min-h-[210px] w-full flex flex-col items-center justify-center gap-2.5 bg-[#FFF1F2] rounded-2xl border border-[#FECDD3] text-center p-4"
                >
                  <div className="size-10 rounded-full bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center">
                    <AlertIcon className="size-5" />
                  </div>
                  <span className="font-heading font-extrabold text-xs text-[#BE123C]">
                    QRIS Belum Dapat Ditampilkan
                  </span>
                  <p className="text-[11px] text-sweet-muted leading-relaxed">
                    {qrisError || "Menunggu respons dari server pembayaran DOKU."}
                  </p>
                  <Button
                    variant="strong"
                    size="sm"
                    onClick={fetchNewQris}
                    leftIcon={<RefreshIcon className="size-4 text-white" />}
                  >
                    Coba Muat Ulang
                  </Button>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <QRCodeSVG
                    value={qrisTx.qr_string}
                    size={200}
                    bgColor="#FFFFFF"
                    fgColor="#3F3D56"
                    level="M"
                    includeMargin
                  />
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-heading font-bold text-sweet-muted">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-[#10B981]"
                    />
                    <span>Menunggu Pembayaran: </span>
                    <span className="text-sweet-primaryStrong font-extrabold font-mono">
                      {timeFormatted}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <StatusBadge
                  tone={qrisTx?.status === "PAID" ? "success" : "pink"}
                >
                  {qrisTx?.status === "PAID"
                    ? "Lunas • Sesi Aktif"
                    : `Nominal: ${formattedPrice}`}
                </StatusBadge>
                {qrisTx?.invoice_number && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-sweet-bg text-sweet-muted text-[10px] font-mono font-bold border border-sweet-border">
                    {qrisTx.invoice_number}
                  </span>
                )}
              </div>
            </div>

            {statusNotice && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs font-heading font-bold text-sweet-text bg-sweet-blush/80 border border-sweet-primary px-3.5 py-2 rounded-2xl max-w-sm"
              >
                {statusNotice}
              </p>
            )}

            <p className="text-xs text-sweet-muted max-w-sm mx-auto">
              Buka aplikasi GoPay, OVO, DANA, ShopeePay, BCA, atau Mobile Banking pilihanmu, lalu pindai kode QRIS di atas. Sesi akan terbuka otomatis setelah pembayaran berhasil.
            </p>

            {/* Bottom Actions */}
            <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="strong"
                size="lg"
                loading={checkingStatus}
                disabled={loadingQris || !qrisTx || qrisTx.status === "PAID"}
                leftIcon={<CheckIcon className="size-5 text-white" />}
                onClick={handleCheckPaymentStatus}
                className="flex-1 min-h-[48px]"
              >
                Sudah Bayar? Cek Status
              </Button>
              <Button
                variant="surface"
                size="lg"
                disabled={loadingQris || checkingStatus}
                onClick={fetchNewQris}
                leftIcon={<RefreshIcon className="size-4" />}
                className="min-h-[48px]"
              >
                QR Baru
              </Button>
              <Button
                variant="surface"
                size="lg"
                onClick={onClose}
                className="min-h-[48px]"
              >
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
                placeholder="Masukkan kode voucher"
                aria-describedby="voucher-hint"
                className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl bg-white border-2 border-sweet-border text-sweet-text font-heading font-extrabold text-base tracking-wider uppercase focus:border-[#F472B6]"
              />
              <span
                id="voucher-hint"
                className="block text-[11px] text-sweet-muted mt-1.5"
              >
                Masukkan kode voucher resmi yang diberikan oleh kasir atau petugas studio.
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
                className="flex-1 min-h-[48px]"
              >
                Gunakan Voucher & Mulai
              </Button>
              <Button
                type="button"
                variant="surface"
                size="lg"
                onClick={onClose}
                className="min-h-[48px]"
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
