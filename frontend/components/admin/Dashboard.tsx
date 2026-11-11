"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BoothOperatorConfig,
  CameraStatus as CameraStatusType,
  FrameThemeOption,
  HealthStatus,
  PrinterStatus as PrinterStatusType,
  PrintJobRecord,
  SessionDetail,
  TemplateOption,
} from "@/types/photobooth";
import {
  DEFAULT_FRAME_THEMES,
  DEFAULT_TEMPLATES,
} from "@/lib/defaults";
import {
  DEFAULT_OPERATOR_CONFIG,
  loadOperatorConfig,
  saveOperatorConfig,
} from "@/lib/config";
import { AuthUser, clearStoredAuth, getStoredAuthUser } from "@/lib/auth";
import { getApiBaseUrl, photoboothApi } from "@/services/api";
import { CameraStatus } from "./CameraStatus";
import { PrinterStatus } from "./PrinterStatus";
import { SessionTable } from "./SessionTable";
import { TemplateManager } from "./TemplateManager";
import { PricingManager } from "./PricingManager";
import { HardwareManager } from "./HardwareManager";
import { FilterStudio } from "./FilterStudio";
import { FinanceReport } from "./FinanceReport";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeftIcon,
  BowIcon,
  CameraIcon,
  PaletteIcon,
  QrIcon,
  RefreshIcon,
  SettingsIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/icons";

type AdminSection =
  | "dashboard"
  | "sessions"
  | "pricing"
  | "finance"
  | "filters"
  | "templates"
  | "hardware";

export function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeNav, setActiveNav] = useState<AdminSection>("dashboard");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatusType | null>(
    null
  );
  const [printerStatus, setPrinterStatus] = useState<PrinterStatusType | null>(
    null
  );
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>([]);
  const [templates, setTemplates] =
    useState<TemplateOption[]>(DEFAULT_TEMPLATES);
  const [frameThemes, setFrameThemes] =
    useState<FrameThemeOption[]>(DEFAULT_FRAME_THEMES);
  const [operatorConfig, setOperatorConfig] = useState<BoothOperatorConfig>(
    DEFAULT_OPERATOR_CONFIG
  );
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredAuthUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }
    setCurrentUser(user);
    setAuthChecked(true);
  }, [router]);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    setOperatorConfig(loadOperatorConfig());
  }, []);

  // Force navigate away from pricing/finance tab if employee role
  useEffect(() => {
    if (
      authChecked &&
      !isAdmin &&
      (activeNav === "pricing" || activeNav === "finance")
    ) {
      setActiveNav("dashboard");
    }
  }, [authChecked, isAdmin, activeNav]);

  const refreshAll = useCallback(async () => {
    const [hlth, cam, prn, hist, jobs, tplData, serverCfg] = await Promise.all([
      photoboothApi.getHealth().catch(() => null),
      photoboothApi.getCameraStatus().catch(() => null),
      photoboothApi.getPrinterStatus().catch(() => null),
      photoboothApi.getSessionHistory(30).catch(() => null),
      photoboothApi.getPrintJobs().catch(() => null),
      photoboothApi.getTemplatesData().catch(() => null),
      photoboothApi.getOperatorConfig().catch(() => null),
    ]);

    if (hlth) setHealth(hlth);
    if (cam) setCameraStatus(cam);
    if (prn) setPrinterStatus(prn);
    if (hist?.sessions) setSessions(hist.sessions);
    if (jobs?.jobs) setPrintJobs(jobs.jobs);
    if (tplData?.templates?.length) setTemplates(tplData.templates);
    if (tplData?.frame_themes?.length) setFrameThemes(tplData.frame_themes);
    if (serverCfg && typeof serverCfg === "object") {
      const merged = { ...loadOperatorConfig(), ...serverCfg };
      setOperatorConfig(merged);
      saveOperatorConfig(merged);
    }
  }, []);

  useEffect(() => {
    if (authChecked) {
      refreshAll();
    }
  }, [authChecked, refreshAll]);

  const handleUpdateConfig = (next: BoothOperatorConfig) => {
    setOperatorConfig(next);
    saveOperatorConfig(next);
    photoboothApi
      .saveOperatorConfig(next)
      .then((saved) => {
        if (saved && typeof saved === "object") {
          const merged = { ...next, ...saved };
          setOperatorConfig(merged);
          saveOperatorConfig(merged);
        }
      })
      .catch(() => null);
  };

  const handleForceReset = async () => {
    await photoboothApi.resetSystem().catch(() => null);
    setResetMessage("Status mesin sesi berhasil di-reset ke IDLE.");
    await refreshAll();
    setTimeout(() => setResetMessage(null), 4000);
  };

  const handleLogout = () => {
    clearStoredAuth();
    photoboothApi.logout().catch(() => null);
    router.push("/admin/login");
  };

  if (!authChecked) {
    return (
      <div className="min-h-dvh flex flex-col justify-center items-center sweet-bg text-sweet-text space-y-3">
        <SpinnerIcon className="size-8 text-sweet-primaryStrong animate-spin" />
        <p className="text-xs font-heading font-bold text-sweet-muted">
          Memverifikasi akses operator...
        </p>
      </div>
    );
  }

  const totalSessions = sessions.length;
  const successfulPrints = printJobs.filter(
    (j) => j.status === "COMPLETED" || j.status === "completed"
  ).length;
  const failedJobs =
    printJobs.filter(
      (j) => j.status !== "COMPLETED" && j.status !== "completed"
    ).length + sessions.filter((s) => s.status === "ERROR").length;

  const allNavItems: {
    id: AdminSection;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[] = [
    { id: "dashboard", label: "Ringkasan", icon: <BowIcon className="size-4" /> },
    { id: "sessions", label: "Riwayat Sesi", icon: <SparkleIcon className="size-4" /> },
    {
      id: "pricing",
      label: "Tarif & Kasir",
      icon: <QrIcon className="size-4" />,
      adminOnly: true,
    },
    {
      id: "finance",
      label: "Laporan & Margin",
      icon: <SparkleIcon className="size-4" />,
      adminOnly: true,
    },
    {
      id: "filters",
      label: "Studio Filter",
      icon: <PaletteIcon className="size-4" />,
    },
    { id: "templates", label: "Desain Frame", icon: <BowIcon className="size-4" /> },
    { id: "hardware", label: "Hardware & Kios", icon: <SettingsIcon className="size-4" /> },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-dvh flex flex-col sweet-bg text-sweet-text">
      {/* Admin Top Header */}
      <header className="px-6 py-4 bg-sweet-surface border-b-2 border-sweet-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-sweet-primary flex items-center justify-center text-sweet-primaryStrong border border-sweet-primaryStrong/40 shadow-xs">
            <BowIcon className="size-6" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-xl text-sweet-text flex items-center gap-2">
              <span>SWEET STUDIO ADMIN</span>
              <SparkleIcon className="size-4 text-sweet-primaryStrong" />
            </h1>
            <p className="text-xs text-sweet-muted">
              Portal Operator Photobooth • Bilik Kamera, Printer & Riwayat Sesi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Role & User Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sweet-bg border border-sweet-border text-xs font-heading shadow-xs">
            <span
              className={`size-2 rounded-full ${
                isAdmin ? "bg-sweet-primaryStrong" : "bg-[#1f6a45]"
              }`}
            />
            <span className="font-bold text-sweet-text">
              {currentUser?.display_name || (isAdmin ? "Administrator" : "Petugas Booth")}
            </span>
            <span className="text-[10px] text-sweet-muted font-mono uppercase px-1.5 py-0.5 rounded-md bg-white border border-sweet-border">
              {currentUser?.role || "user"}
            </span>
          </div>

          <StatusBadge tone={health ? "success" : "error"}>
            {health ? "System Online" : "API Offline"}
          </StatusBadge>

          <Button
            variant="surface"
            size="md"
            leftIcon={<RefreshIcon className="size-4" />}
            onClick={refreshAll}
          >
            Refresh
          </Button>

          <Link
            href="/"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-bold text-xs inline-flex items-center gap-1.5 border border-sweet-primaryStrong/40 shadow-xs transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Layar Kiosk</span>
          </Link>

          <Button
            variant="danger"
            size="md"
            onClick={handleLogout}
            className="text-xs"
          >
            Keluar
          </Button>
        </div>
      </header>

      {/* Main Sidebar + Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <Card variant="surface" padding="sm" className="space-y-1.5">
            <nav aria-label="Menu Administrasi Operator" className="space-y-1.5">
              {navItems.map((item) => {
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveNav(item.id)}
                    className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl text-left font-heading font-bold text-sm transition-all flex items-center justify-between ${
                      active
                        ? "bg-sweet-primary text-sweet-text shadow-sm"
                        : "hover:bg-sweet-blush/50 text-sweet-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={active ? "text-sweet-primaryStrong" : "text-sweet-muted"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-sweet-primaryStrong"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-sweet-border space-y-2 px-2">
              <div className="text-xs text-sweet-muted">
                Status Sesi Aktif:{" "}
                <strong className="text-sweet-text">
                  {health?.session_state || "IDLE"}
                </strong>
              </div>
              <Button
                variant="danger"
                size="md"
                onClick={handleForceReset}
                className="w-full text-xs"
              >
                Force Reset ke IDLE
              </Button>
              {resetMessage && (
                <p className="text-xs text-sweet-success font-bold">
                  {resetMessage}
                </p>
              )}
            </div>
          </Card>
        </aside>

        {/* Main Content Panel */}
        <main className="lg:col-span-9 space-y-6">
          {activeNav === "dashboard" && (
            <>
              {/* Top 4 Status Cards: CAMERA, PRINTER, STORAGE, NETWORK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CameraStatus
                  cameraStatus={cameraStatus}
                  onRefresh={refreshAll}
                />
                <PrinterStatus printerStatus={printerStatus} />

                <Card variant="surface" padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm text-sweet-text">
                      STORAGE
                    </h3>
                    <StatusBadge tone={health ? "pink" : "neutral"}>
                      {health
                        ? `${health.storage_used_percent}% Terpakai`
                        : "Belum Terukur"}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-sweet-muted">
                    Ruang bebas disk lokal:{" "}
                    <strong className="text-sweet-text">
                      {health ? `${health.storage_free_gb} GB` : "Menunggu API"}
                    </strong>
                  </p>
                </Card>

                <Card variant="surface" padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm text-sweet-text">
                      NETWORK & API
                    </h3>
                    <StatusBadge tone={health ? "success" : "error"}>
                      {health ? "LAN Connected" : "Disconnected"}
                    </StatusBadge>
                  </div>
                  <p className="text-xs font-mono text-sweet-muted">
                    Endpoint: {getApiBaseUrl()}
                  </p>
                </Card>
              </div>

              {/* TODAY'S SESSIONS & REVENUE Summary Box */}
              <Card variant="blush" padding="md" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-heading font-extrabold text-base text-sweet-text">
                    RINGKASAN OPERASIONAL HARI INI
                  </h2>
                  <span className="text-xs text-sweet-muted font-heading font-semibold">
                    Tarif Aktif: Rp {(operatorConfig.sessionPriceIdr ?? 35000).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs">
                    <span className="text-xs text-sweet-muted block font-heading font-semibold">
                      Total Sesi Dimulai
                    </span>
                    <span className="font-heading font-extrabold text-2xl text-sweet-text">
                      {totalSessions}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs">
                    <span className="text-xs text-sweet-muted block font-heading font-semibold">
                      Sesi Sukses / Cetak
                    </span>
                    <span className="font-heading font-extrabold text-2xl text-sweet-success">
                      {successfulPrints}
                    </span>
                  </div>
                  {isAdmin ? (
                    <div className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs">
                      <span className="text-xs text-sweet-muted block font-heading font-semibold">
                        Estimasi Omset Selesai
                      </span>
                      <span className="font-heading font-extrabold text-2xl text-sweet-primaryStrong">
                        Rp {(successfulPrints * (operatorConfig.sessionPriceIdr ?? 35000)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs">
                      <span className="text-xs text-sweet-muted block font-heading font-semibold">
                        Status Bilik Kiosk
                      </span>
                      <span className="font-heading font-extrabold text-xl text-sweet-text">
                        {health?.session_state || "SIAP / IDLE"}
                      </span>
                    </div>
                  )}
                  <div className="p-4 rounded-2xl bg-white border border-sweet-border shadow-xs">
                    <span className="text-xs text-sweet-muted block font-heading font-semibold">
                      Gagal / Error
                    </span>
                    <span className="font-heading font-extrabold text-2xl text-sweet-error">
                      {failedJobs}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Recent Sessions Table */}
              <SessionTable
                sessions={sessions.slice(0, 10)}
                onRefresh={refreshAll}
              />
            </>
          )}

          {activeNav === "sessions" && (
            <SessionTable sessions={sessions} onRefresh={refreshAll} />
          )}

          {isAdmin && activeNav === "pricing" && (
            <PricingManager
              config={operatorConfig}
              onUpdateConfig={handleUpdateConfig}
              sessions={sessions}
            />
          )}

          {isAdmin && activeNav === "finance" && (
            <FinanceReport
              currentSessionPrice={operatorConfig.sessionPriceIdr ?? 35000}
            />
          )}

          {activeNav === "filters" && (
            <FilterStudio readOnly={!isAdmin} />
          )}

          {activeNav === "templates" && (
            <TemplateManager
              templates={templates}
              frameThemes={frameThemes}
              config={operatorConfig}
              onUpdateConfig={handleUpdateConfig}
              onRefreshTemplates={refreshAll}
              readOnly={!isAdmin}
            />
          )}

          {activeNav === "hardware" && (
            <HardwareManager
              config={operatorConfig}
              onUpdateConfig={handleUpdateConfig}
              cameraStatus={cameraStatus}
              printerStatus={printerStatus}
              printJobs={printJobs}
              onRefresh={refreshAll}
              readOnly={!isAdmin}
            />
          )}
        </main>
      </div>
    </div>
  );
}
