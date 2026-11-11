"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SettlementCalculationResult,
  SettlementRule,
} from "@/types/photobooth";
import { photoboothApi } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckIcon,
  PlusIcon,
  QrIcon,
  RefreshIcon,
  SparkleIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/icons";

interface FinanceReportProps {
  currentSessionPrice?: number;
}

export function FinanceReport({
  currentSessionPrice = 35000,
}: FinanceReportProps) {
  const [rules, setRules] = useState<SettlementRule[]>([]);
  const [calculation, setCalculation] =
    useState<SettlementCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Date filters
  const [dateFilterPreset, setDateFilterPreset] = useState<
    "today" | "7d" | "30d" | "all" | "custom"
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(75);

  // Modal / Form state for new rule
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleBasis, setNewRuleBasis] = useState<
    "per_photo" | "per_settlement"
  >("per_photo");
  const [newRuleType, setNewRuleType] = useState<"percentage" | "fixed">(
    "fixed"
  );
  const [newRuleValue, setNewRuleValue] = useState<string>("5000");
  const [newRuleThreshold, setNewRuleThreshold] = useState<string>("0");
  const [newRuleDesc, setNewRuleDesc] = useState("");

  // Preset date calculator
  const applyDatePreset = (preset: "today" | "7d" | "30d" | "all") => {
    setDateFilterPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7d") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "30d") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesRes, calcRes] = await Promise.all([
        photoboothApi.getSettlementRules().catch(() => null),
        photoboothApi
          .calculateSettlement({
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            target_margin_percent: targetMarginPercent,
          })
          .catch(() => null),
      ]);

      if (rulesRes?.rules) {
        setRules(rulesRes.rules);
      }
      if (calcRes?.data) {
        setCalculation(calcRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, targetMarginPercent]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRuleName.trim();
    if (!cleanName) {
      setStatusMessage("Mohon isi nama aturan potongan.");
      return;
    }
    const parsedVal = parseFloat(newRuleValue.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(parsedVal) || parsedVal < 0) {
      setStatusMessage("Nilai potongan tidak valid.");
      return;
    }
    const parsedThreshold = parseFloat(
      newRuleThreshold.replace(/[^0-9.]/g, "")
    );

    try {
      setLoading(true);
      await photoboothApi.saveSettlementRule({
        name: cleanName,
        basis: newRuleBasis,
        rule_type: newRuleType,
        value: parsedVal,
        min_gross_threshold: Number.isNaN(parsedThreshold)
          ? 0
          : parsedThreshold,
        description: newRuleDesc.trim(),
        is_active: true,
      });

      setShowAddRuleModal(false);
      setNewRuleName("");
      setNewRuleDesc("");
      setNewRuleValue("5000");
      setNewRuleThreshold("0");
      setStatusMessage(`Aturan potongan "${cleanName}" berhasil disimpan.`);
      setTimeout(() => setStatusMessage(null), 3500);
      await fetchFinanceData();
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal menyimpan aturan potongan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    try {
      await photoboothApi.deleteSettlementRule(ruleId);
      setStatusMessage(`Aturan "${ruleName}" berhasil dihapus.`);
      setTimeout(() => setStatusMessage(null), 3000);
      await fetchFinanceData();
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal menghapus aturan.");
    }
  };

  const handleToggleRuleActive = async (rule: SettlementRule) => {
    try {
      await photoboothApi.saveSettlementRule({
        ...rule,
        is_active: !rule.is_active,
      });
      await fetchFinanceData();
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal mengubah status aturan.");
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      await photoboothApi.downloadSettlementExcel({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        target_margin_percent: targetMarginPercent,
      });
      setStatusMessage("File Excel (.xlsx) berhasil diunduh.");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal mengunduh Excel.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await photoboothApi.downloadSettlementPdf({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        target_margin_percent: targetMarginPercent,
      });
      setStatusMessage("Dokumen Laporan PDF resmi berhasil diunduh.");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage(err?.message || "Gagal mengunduh PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const summary = calculation?.summary;

  return (
    <div className="space-y-6">
      {/* Top Filter & Period Control Bar */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sweet-border/70 pb-3">
          <div>
            <h3 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <QrIcon className="size-5 text-sweet-primaryStrong" />
              <span>Pendataan Keuangan Otomatis & Kalkulasi Margin</span>
            </h3>
            <p className="text-xs text-sweet-muted">
              Rekapitulasi omset kotor, potongan operasional (per foto atau per
              settlement), laba bersih, dan ekspor dokumen Excel/PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="surface"
              size="sm"
              onClick={fetchFinanceData}
              disabled={loading}
              leftIcon={<RefreshIcon className="size-3.5" />}
            >
              Hitung Ulang
            </Button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyDatePreset("today")}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-colors ${
                dateFilterPreset === "today"
                  ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-xs"
                  : "bg-white text-sweet-muted border-sweet-border hover:text-sweet-text"
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("7d")}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-colors ${
                dateFilterPreset === "7d"
                  ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-xs"
                  : "bg-white text-sweet-muted border-sweet-border hover:text-sweet-text"
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("30d")}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-colors ${
                dateFilterPreset === "30d"
                  ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-xs"
                  : "bg-white text-sweet-muted border-sweet-border hover:text-sweet-text"
              }`}
            >
              30 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("all")}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold border transition-colors ${
                dateFilterPreset === "all"
                  ? "bg-sweet-primary text-sweet-text border-sweet-primaryStrong shadow-xs"
                  : "bg-white text-sweet-muted border-sweet-border hover:text-sweet-text"
              }`}
            >
              Semua Periode
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-heading">
            <div className="flex items-center gap-1.5">
              <span className="text-sweet-muted">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDateFilterPreset("custom");
                  setStartDate(e.target.value);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-sweet-bg border border-sweet-border text-sweet-text text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sweet-muted">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDateFilterPreset("custom");
                  setEndDate(e.target.value);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-sweet-bg border border-sweet-border text-sweet-text text-xs"
              />
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || !summary}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1f6a45] hover:bg-[#185336] disabled:opacity-50 text-white font-heading font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              {exportingExcel ? (
                <SpinnerIcon className="size-4 animate-spin" />
              ) : (
                <SparkleIcon className="size-4" />
              )}
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || !summary}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#b01446] hover:bg-[#8f1038] disabled:opacity-50 text-white font-heading font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              {exportingPdf ? (
                <SpinnerIcon className="size-4 animate-spin" />
              ) : (
                <QrIcon className="size-4" />
              )}
              <span>Ekspor PDF (.pdf)</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="text-xs font-heading font-bold text-[#1f6a45] pt-1">
            {statusMessage}
          </p>
        )}
      </Card>

      {/* 4 Main Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omset Kotor */}
        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs space-y-1">
          <span className="text-xs text-sweet-muted font-heading font-bold block">
            Omset Kotor (Gross)
          </span>
          <span className="font-heading font-extrabold text-2xl text-sweet-text block">
            Rp {(summary?.gross_revenue ?? 0).toLocaleString("id-ID")}
          </span>
          <span className="text-[11px] text-sweet-muted block pt-1">
            Dari {summary?.completed_sessions ?? 0} sesi sukses (
            {summary?.total_photos_printed ?? 0} lembar cetak)
          </span>
        </div>

        {/* Card 2: Total Potongan */}
        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs space-y-1">
          <span className="text-xs text-sweet-muted font-heading font-bold block">
            Total Potongan Operasional
          </span>
          <span className="font-heading font-extrabold text-2xl text-[#b01446] block">
            - Rp {(summary?.total_deductions ?? 0).toLocaleString("id-ID")}
          </span>
          <span className="text-[11px] text-sweet-muted block pt-1">
            {calculation?.applied_deductions?.length ?? 0} komponen biaya
            terpotong
          </span>
        </div>

        {/* Card 3: Laba Bersih */}
        <div className="p-4 rounded-3xl bg-white border-2 border-sweet-primaryStrong/40 shadow-xs space-y-1 bg-gradient-to-br from-white to-sweet-blush/40">
          <span className="text-xs text-sweet-muted font-heading font-bold block">
            Laba Bersih (Net Profit)
          </span>
          <span className="font-heading font-extrabold text-2xl text-[#1f6a45] block">
            Rp {(summary?.net_profit ?? 0).toLocaleString("id-ID")}
          </span>
          <span className="text-[11px] text-sweet-muted block pt-1">
            Penghasilan riil setelah semua potongan
          </span>
        </div>

        {/* Card 4: Net Margin % */}
        <div className="p-4 rounded-3xl bg-white border border-sweet-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sweet-muted font-heading font-bold block">
              Net Profit Margin
            </span>
            <StatusBadge
              tone={
                (summary?.net_margin_percent ?? 0) >= targetMarginPercent
                  ? "success"
                  : "pink"
              }
            >
              Target: {targetMarginPercent}%
            </StatusBadge>
          </div>
          <span className="font-heading font-extrabold text-2xl text-sweet-primaryStrong block">
            {(summary?.net_margin_percent ?? 0).toFixed(1)}%
          </span>
          <span className="text-[11px] text-sweet-muted block pt-1">
            Rasio laba bersih terhadap omset kotor
          </span>
        </div>
      </div>

      {/* Rincian Potongan Terhitung (Applied Deductions Breakdown) */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sweet-border/70 pb-3">
          <div>
            <h4 className="font-heading font-extrabold text-sm text-sweet-text">
              Rincian Potongan Periode Ini
            </h4>
            <p className="text-xs text-sweet-muted">
              Breakdown biaya operasional, bagi hasil, dan fee yang dikalkulasi
              secara dinamis.
            </p>
          </div>
          <span className="text-xs font-heading font-bold text-sweet-muted">
            Total Sesi Terhitung: {summary?.completed_sessions ?? 0}
          </span>
        </div>

        {calculation?.applied_deductions &&
        calculation.applied_deductions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-sweet-border font-heading font-bold text-sweet-muted uppercase text-[10px]">
                  <th className="py-2.5 px-3">Nama Potongan</th>
                  <th className="py-2.5 px-3">Basis / Model</th>
                  <th className="py-2.5 px-3">Tipe & Nilai Rule</th>
                  <th className="py-2.5 px-3">Syarat Threshold</th>
                  <th className="py-2.5 px-3 text-right">
                    Total Nominal Terpotong
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sweet-border/50">
                {calculation.applied_deductions.map((d, idx) => (
                  <tr key={idx} className="hover:bg-sweet-bg/40">
                    <td className="py-2.5 px-3 font-heading font-bold text-sweet-text">
                      {d.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-sweet-bg border border-sweet-border font-heading text-[10px] font-semibold">
                        {d.basis === "per_photo"
                          ? "Per Lembar Foto"
                          : "Per Settlement"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {d.rule_type === "percentage"
                        ? `${d.value}% dari omset`
                        : `Rp ${d.value.toLocaleString("id-ID")} statis`}
                    </td>
                    <td className="py-2.5 px-3 text-sweet-muted">
                      {d.min_gross_threshold > 0
                        ? `Jika omset >= Rp ${d.min_gross_threshold.toLocaleString("id-ID")}`
                        : "Tanpa threshold (langsung)"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-heading font-bold text-[#b01446]">
                      - Rp {d.calculated_amount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sweet-border font-heading font-extrabold text-sweet-text bg-sweet-bg">
                  <td colSpan={4} className="py-3 px-3 text-right">
                    TOTAL POTONGAN:
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-[#b01446]">
                    - Rp{" "}
                    {(summary?.total_deductions ?? 0).toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center bg-sweet-bg rounded-2xl border border-sweet-border text-xs text-sweet-muted">
            Tidak ada potongan yang aktif atau memenuhi syarat threshold pada
            periode ini.
          </div>
        )}
      </Card>

      {/* Aturan Potongan & Kustomisasi Margin (Settlement Rules Manager) */}
      <Card variant="surface" padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sweet-border/70 pb-3">
          <div>
            <h4 className="font-heading font-extrabold text-base text-sweet-text flex items-center gap-2">
              <SparkleIcon className="size-4 text-sweet-primaryStrong" />
              <span>Kelola Aturan Potongan & Skema Margin</span>
            </h4>
            <p className="text-xs text-sweet-muted">
              Tambahkan aturan biaya cetak per foto, sewa tempat (% atau nominal
              statis), fee QRIS, atau aturan bersyarat (threshold omset).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddRuleModal(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs border border-sweet-primaryStrong/40 shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <PlusIcon className="size-4" />
            <span>Tambah Aturan Potongan</span>
          </button>
        </div>

        {/* Rules Table */}
        {rules.length === 0 ? (
          <div className="p-8 text-center bg-sweet-bg rounded-2xl border border-sweet-border text-xs text-sweet-muted">
            Belum ada aturan potongan. Klik <strong>Tambah Aturan Potongan</strong>{" "}
            untuk membuat skema perhitungan laba baru.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-heading font-extrabold text-sm text-sweet-text">
                      {rule.name}
                    </h5>
                    <button
                      type="button"
                      onClick={() => handleToggleRuleActive(rule)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-full text-[11px] font-heading font-bold border transition-colors ${
                        rule.is_active
                          ? "bg-[#1f6a45]/15 text-[#1f6a45] border-[#1f6a45]/30"
                          : "bg-sweet-bg text-sweet-muted border-sweet-border"
                      }`}
                    >
                      {rule.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>

                  <p className="text-xs text-sweet-muted">
                    {rule.description || "Aturan potongan sistem"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-sweet-bg p-2.5 rounded-xl border border-sweet-border/60">
                    <div>
                      <span className="text-[10px] text-sweet-muted block font-heading">
                        Basis Perhitungan:
                      </span>
                      <strong className="text-sweet-text font-heading">
                        {rule.basis === "per_photo"
                          ? "Per Lembar Foto"
                          : "Per Settlement"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-sweet-muted block font-heading">
                        Nilai Potongan:
                      </span>
                      <strong className="text-sweet-primaryStrong font-heading">
                        {rule.rule_type === "percentage"
                          ? `${rule.value}% dari omset`
                          : `Rp ${rule.value.toLocaleString("id-ID")}`}
                      </strong>
                    </div>
                    {rule.min_gross_threshold > 0 && (
                      <div className="col-span-2 pt-1 border-t border-sweet-border/60">
                        <span className="text-[10px] text-sweet-muted block font-heading">
                          Aturan Bersyarat (Threshold):
                        </span>
                        <strong className="text-sweet-text font-heading">
                          Aktif hanya bila omset &gt;= Rp{" "}
                          {rule.min_gross_threshold.toLocaleString("id-ID")}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-sweet-border/60">
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id, rule.name)}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#FCECEE] hover:bg-[#F7D6DA] text-sweet-error text-xs font-heading font-bold border border-[#EABAC0] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <TrashIcon className="size-4" />
                    <span>Hapus Aturan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Tambah Aturan Potongan */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-sweet-border max-w-lg w-full p-6 shadow-2xl space-y-4 text-sweet-text">
            <div className="flex items-center justify-between border-b border-sweet-border pb-3">
              <h3 className="font-heading font-extrabold text-base text-sweet-text">
                Tambah Aturan Potongan Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRuleModal(false)}
                className="size-8 rounded-full hover:bg-sweet-bg text-sweet-muted hover:text-sweet-text inline-flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label
                  htmlFor="new-rule-name"
                  className="font-heading font-bold text-sweet-text block"
                >
                  Nama Potongan / Biaya:
                </label>
                <input
                  id="new-rule-name"
                  type="text"
                  placeholder="Contoh: Biaya Kertas Foto & Ribbon..."
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="new-rule-basis"
                    className="font-heading font-bold text-sweet-text block"
                  >
                    Basis Penerapan:
                  </label>
                  <select
                    id="new-rule-basis"
                    value={newRuleBasis}
                    onChange={(e) =>
                      setNewRuleBasis(
                        e.target.value as "per_photo" | "per_settlement"
                      )
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                  >
                    <option value="per_photo">
                      Per Lembar Foto (Unit Cost)
                    </option>
                    <option value="per_settlement">
                      Per Settlement (Total Omset)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="new-rule-type"
                    className="font-heading font-bold text-sweet-text block"
                  >
                    Tipe Nilai:
                  </label>
                  <select
                    id="new-rule-type"
                    value={newRuleType}
                    onChange={(e) =>
                      setNewRuleType(e.target.value as "percentage" | "fixed")
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                  >
                    <option value="fixed">Nominal Statis (Rp)</option>
                    <option value="percentage">Persentase (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="new-rule-value"
                    className="font-heading font-bold text-sweet-text block"
                  >
                    {newRuleType === "percentage"
                      ? "Besaran Persen (%):"
                      : "Nominal Rupiah (Rp):"}
                  </label>
                  <input
                    id="new-rule-value"
                    type="number"
                    step="any"
                    placeholder={
                      newRuleType === "percentage" ? "15" : "5000"
                    }
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="new-rule-threshold"
                    className="font-heading font-bold text-sweet-text block"
                  >
                    Minimal Omset (Threshold Rp):
                  </label>
                  <input
                    id="new-rule-threshold"
                    type="number"
                    step="1000"
                    placeholder="0 = Tanpa syarat"
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="new-rule-desc"
                  className="font-heading font-bold text-sweet-text block"
                >
                  Keterangan Tambahan (Opsional):
                </label>
                <input
                  id="new-rule-desc"
                  type="text"
                  placeholder="Contoh: Biaya sewa space mall bila omset tembus target"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs text-sweet-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-sweet-border">
                <Button
                  variant="surface"
                  size="md"
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={loading}
                >
                  Simpan Aturan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
