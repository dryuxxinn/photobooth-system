import {
  CameraStatus,
  FrameThemeOption,
  HealthStatus,
  PhotoItem,
  PrinterStatus,
  PrintJobRecord,
  SessionDetail,
  SessionState,
  TemplateOption,
} from "@/types/photobooth";

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    // If accessed on "booth.<domain>", route API calls to "api-booth.<domain>"
    if (host.startsWith("booth.")) {
      return `${window.location.protocol}//api-${host}`;
    }
    // If accessed over HTTPS without custom API URL, use same-origin (Next.js rewrites proxy to backend)
    if (window.location.protocol === "https:") {
      return window.location.origin;
    }
    return `http://${host}:8000`;
  }
  return envUrl || "http://localhost:8000";
}

export function getWsUrl(): string {
  const base = getApiBaseUrl();
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    if (host.startsWith("booth.")) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//api-${host}/ws/session`;
    }
    if (!base || base === window.location.origin) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}/ws/session`;
    }
  }
  return base.replace(/^http/, "ws") + "/ws/session";
}

export function resolveStorageUrl(
  relativePath?: string | null,
  cacheBust?: string | number
): string {
  if (!relativePath) return "";
  const suffix = cacheBust ? `?v=${encodeURIComponent(String(cacheBust))}` : "";
  if (
    relativePath.startsWith("http://") ||
    relativePath.startsWith("https://")
  ) {
    return `${relativePath}${suffix}`;
  }
  const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${getApiBaseUrl()}${clean}${suffix}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) errMsg = data.detail;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const photoboothApi = {
  getHealth: () => request<HealthStatus>("/health"),
  getCameraStatus: () => request<CameraStatus>("/camera/status"),
  getPrinterStatus: () => request<PrinterStatus>("/printer/status"),
  getTemplatesData: () =>
    request<{ templates: TemplateOption[]; frame_themes?: FrameThemeOption[] }>(
      "/templates"
    ),

  getCurrentSession: () =>
    request<{
      active: boolean;
      state: SessionState;
      session: SessionDetail | null;
    }>("/session/current"),

  getSessionHistory: (limit: number = 25) =>
    request<{ sessions: SessionDetail[] }>(`/session/history?limit=${limit}`),

  getPrintJobs: () => request<{ jobs: PrintJobRecord[] }>("/printer/jobs"),

  startSession: (payload: {
    customer_name?: string;
    photos_required: number;
    template_id: string;
    frame_color?: string;
  }) =>
    request<SessionDetail>("/session/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  capturePhoto: (sessionId: string, imageData?: string | null) =>
    request<PhotoItem>(`/session/${sessionId}/capture`, {
      method: "POST",
      body: imageData ? JSON.stringify({ image_data: imageData }) : undefined,
    }),

  retakeLastPhoto: (sessionId: string) =>
    request<SessionDetail>(`/session/${sessionId}/retake`, {
      method: "POST",
    }),

  processSession: (payload: {
    session_id: string;
    filter_name?: string;
    template_id?: string;
    frame_color?: string;
    custom_text?: string;
    selected_photo_ids?: string[];
  }) =>
    request<SessionDetail>("/image/process", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  printSession: (sessionId: string, copies: number = 1) =>
    request<{
      success: boolean;
      message: string;
      print_job?: PrintJobRecord;
      session: SessionDetail;
    }>("/print", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, copies }),
    }),

  completeSession: (sessionId: string) =>
    request<{ message: string; session: SessionDetail }>(
      `/session/${sessionId}/complete`,
      { method: "POST" }
    ),

  abortSession: (sessionId: string) =>
    request<{ message: string }>(`/session/${sessionId}/abort`, {
      method: "POST",
    }),

  resetSystem: () =>
    request<{ message: string }>("/session/reset", {
      method: "POST",
    }),

  captureStandaloneTest: () =>
    request<{
      success: boolean;
      filename: string;
      file_path: string;
      timestamp: string;
    }>("/camera/capture", { method: "POST" }),
};
