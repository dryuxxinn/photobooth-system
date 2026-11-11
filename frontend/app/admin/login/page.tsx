"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { photoboothApi } from "@/services/api";
import { setStoredAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import {
  ArrowLeftIcon,
  BowIcon,
  LockIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/icons";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Harap masukkan username dan password.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await photoboothApi.login(username.trim(), password);
      if (res.token && res.user) {
        setStoredAuth(res.token, res.user);
        router.push("/admin");
      } else {
        setErrorMsg("Respon autentikasi tidak valid.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Username atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center items-center p-4 sweet-bg text-sweet-text">
      <div className="w-full max-w-md space-y-6">
        {/* Top Header Logo */}
        <div className="text-center space-y-2">
          <div className="size-16 rounded-3xl bg-sweet-primary mx-auto flex items-center justify-center text-sweet-primaryStrong border-2 border-sweet-primaryStrong/40 shadow-sweet">
            <BowIcon className="size-8" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-sweet-text flex items-center justify-center gap-2">
            <span>SWEET STUDIO</span>
            <SparkleIcon className="size-5 text-sweet-primaryStrong" />
          </h1>
          <p className="text-xs text-sweet-muted font-heading">
            Portal Masuk Operator & Administrator Photobooth
          </p>
        </div>

        {/* Login Card */}
        <Card variant="surface" padding="lg" className="space-y-5 shadow-sweet">
          <div className="border-b border-sweet-border pb-3">
            <h2 className="font-heading font-bold text-base text-sweet-text">
              Login Akun Operator
            </h2>
            <p className="text-xs text-sweet-muted">
              Pilih peran Anda untuk mengakses kontrol bilik foto.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-[#FCECEE] border border-sweet-error/40 text-xs font-heading font-bold text-sweet-error"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="font-heading font-bold text-xs text-sweet-text block mb-1"
              >
                Username:
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                placeholder="admin atau user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text placeholder:text-sweet-muted"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="font-heading font-bold text-xs text-sweet-text block mb-1"
              >
                Password:
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-sweet-bg border border-sweet-border text-xs font-heading font-bold text-sweet-text placeholder:text-sweet-muted"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-sweet-primary hover:bg-sweet-primaryStrong text-sweet-text font-heading font-extrabold text-sm border-2 border-sweet-primaryStrong/40 shadow-sweet transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="size-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard</span>
              )}
            </button>
          </form>

          {/* Quick Credential Helper Pills */}
          <div className="pt-2 border-t border-sweet-border/60 space-y-2">
            <span className="text-[11px] font-heading font-bold text-sweet-muted block">
              Pilihan Akun Cepat (Demo RBAC):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin", "admin")}
                className="min-h-[44px] p-2.5 rounded-xl bg-sweet-bg hover:bg-sweet-blush/60 border border-sweet-border text-left transition-colors"
              >
                <div className="font-heading font-bold text-xs text-sweet-text">
                  Owner (Admin)
                </div>
                <div className="text-[10px] text-sweet-muted font-mono">
                  admin / admin
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("user", "user")}
                className="min-h-[44px] p-2.5 rounded-xl bg-sweet-bg hover:bg-sweet-blush/60 border border-sweet-border text-left transition-colors"
              >
                <div className="font-heading font-bold text-xs text-sweet-text">
                  Pegawai (Kasir)
                </div>
                <div className="text-[10px] text-sweet-muted font-mono">
                  user / user
                </div>
              </button>
            </div>
          </div>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-heading font-bold text-sweet-muted hover:text-sweet-primaryStrong inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Kembali ke Layar Utama Kiosk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}