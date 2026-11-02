"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BoothOperatorConfig,
  CameraStatus,
  FrameThemeOption,
  KioskSubStep,
  PrinterStatus,
  SessionDetail,
  SessionState,
  TemplateOption,
} from "@/types/photobooth";
import {
  CAPTURE_PAUSE_MS,
  COUNTDOWN_SECONDS,
  DEFAULT_OPERATOR_CONFIG,
  loadOperatorConfig,
} from "@/lib/config";
import {
  DEFAULT_FRAME_THEMES,
  DEFAULT_TEMPLATES,
} from "@/lib/defaults";
import { getWsUrl, photoboothApi } from "@/services/api";
import { useWebcam } from "@/hooks/useWebcam";

export { DEFAULT_FRAME_THEMES, DEFAULT_TEMPLATES };

export function usePhotoboothSession() {
  const [state, setState] = useState<SessionState>("IDLE");
  const [kioskStep, setKioskStep] = useState<KioskSubStep>("WELCOME");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [completedSession, setCompletedSession] =
    useState<SessionDetail | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(
    null
  );
  const [templates, setTemplates] =
    useState<TemplateOption[]>(DEFAULT_TEMPLATES);
  const [frameThemes, setFrameThemes] =
    useState<FrameThemeOption[]>(DEFAULT_FRAME_THEMES);
  const [operatorConfig, setOperatorConfig] = useState<BoothOperatorConfig>(
    DEFAULT_OPERATOR_CONFIG
  );

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(
    DEFAULT_TEMPLATES[0]
  );
  const [selectedFrameColor, setSelectedFrameColor] = useState<string>("pink");
  const [selectedCountdownSeconds, setSelectedCountdownSeconds] =
    useState<number>(3);
  const [reviewCountdown, setReviewCountdown] = useState<number | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [imageVersion, setImageVersion] = useState<number>(1);

  // Centralized ARIA live region messages
  const [politeMessage, setPoliteMessage] = useState<string>("");
  const [assertiveMessage, setAssertiveMessage] = useState<string>("");

  const webcamActive =
    kioskStep === "PREPARATION" ||
    kioskStep === "CAPTURING" ||
    state === "STARTED" ||
    state === "CAPTURING";
  const webcam = useWebcam({ active: webcamActive });

  const abortFlowRef = useRef(false);
  const sequenceRunningRef = useRef(false);
  const customizingRef = useRef(false);
  const reviewResolverRef = useRef<((choice: "next" | "retake") => void) | null>(
    null
  );
  const runSequenceRef = useRef<(s: SessionDetail) => Promise<void>>(
    async () => {}
  );

  // Load operator config from localStorage on mount
  useEffect(() => {
    const cfg = loadOperatorConfig();
    setOperatorConfig(cfg);
    setSelectedCountdownSeconds(cfg.countdownSeconds || COUNTDOWN_SECONDS);
    const defaultTpl =
      DEFAULT_TEMPLATES.find((t) => t.id === cfg.defaultTemplateId) ||
      DEFAULT_TEMPLATES[0];
    setSelectedTemplate(defaultTpl);
    setSelectedFrameColor(
      cfg.defaultFrameColor || defaultTpl.default_frame || "pink"
    );
  }, []);

  const handleSelectTemplate = useCallback((tpl: TemplateOption) => {
    setSelectedTemplate(tpl);
    if (tpl.default_frame) {
      setSelectedFrameColor(tpl.default_frame);
    }
  }, []);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const waitForReviewIntermission = useCallback(
    (durationSeconds: number = 5): Promise<"next" | "retake"> => {
      return new Promise((resolve) => {
        let secondsLeft = durationSeconds;
        setReviewCountdown(secondsLeft);

        let timer: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (timer) clearInterval(timer);
          reviewResolverRef.current = null;
          setReviewCountdown(null);
        };

        const handleChoice = (choice: "next" | "retake") => {
          cleanup();
          resolve(choice);
        };

        reviewResolverRef.current = handleChoice;

        timer = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            handleChoice("next");
          } else {
            setReviewCountdown(secondsLeft);
          }
        }, 1000);
      });
    },
    []
  );

  const proceedFromReview = useCallback(() => {
    if (reviewResolverRef.current) {
      reviewResolverRef.current("next");
    }
  }, []);

  const retakeCurrentPhoto = useCallback(() => {
    if (reviewResolverRef.current) {
      reviewResolverRef.current("retake");
    }
  }, []);

  const runAutomatedCaptureSequence = useCallback(
    async (activeSession: SessionDetail) => {
      if (sequenceRunningRef.current) return;
      sequenceRunningRef.current = true;
      abortFlowRef.current = false;
      setCaptureError(null);
      setKioskStep("CAPTURING");

      const totalPhotos = activeSession.photos_required;
      let currentPose = activeSession.photos_taken + 1;
      const cdSeconds = selectedCountdownSeconds || COUNTDOWN_SECONDS;

      try {
        while (currentPose <= totalPhotos) {
          if (abortFlowRef.current) return;

          setPoliteMessage(
            `Bersiap untuk foto ke-${currentPose} dari ${totalPhotos}`
          );

          for (let sec = cdSeconds; sec >= 1; sec--) {
            if (abortFlowRef.current) {
              setCountdown(null);
              return;
            }
            setCountdown(sec);
            await sleep(1000);
          }

          if (abortFlowRef.current) {
            setCountdown(null);
            return;
          }

          setCountdown(0);
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 420);

          let capturedSuccessfully = false;
          try {
            setIsBusy(true);
            const webcamImageData = webcam.captureFrameDataUrl();
            await photoboothApi.capturePhoto(
              activeSession.session_id,
              webcamImageData
            );
            const updated = await photoboothApi.getCurrentSession();
            setCountdown(null);
            if (updated.session) {
              setSession(updated.session);
              setState(updated.session.status);
              setPoliteMessage(`Foto ke-${currentPose} berhasil disimpan`);
              capturedSuccessfully = true;
            }
          } catch (err: any) {
            setCountdown(null);
            const msg =
              err?.message ||
              "Kamera belum berhasil mengambil foto. Silakan coba lagi.";
            setCaptureError(msg);
            setAssertiveMessage(`Gagal memotret foto ke-${currentPose}: ${msg}`);
            setIsBusy(false);
            return;
          } finally {
            setIsBusy(false);
          }

          if (!capturedSuccessfully || abortFlowRef.current) return;

          // 5-second review intermission between captures
          const decision = await waitForReviewIntermission(5);
          if (abortFlowRef.current) return;

          if (decision === "retake") {
            try {
              setIsBusy(true);
              await photoboothApi.retakeLastPhoto(activeSession.session_id);
              const afterRetake = await photoboothApi.getCurrentSession();
              if (afterRetake.session) {
                setSession(afterRetake.session);
                setState(afterRetake.session.status);
              }
              setPoliteMessage(`Foto ke-${currentPose} siap diulang.`);
              // Loop will repeat currentPose
              continue;
            } catch (err: any) {
              const msg = err?.message || "Gagal mengulang foto.";
              setCaptureError(msg);
              return;
            } finally {
              setIsBusy(false);
            }
          }

          // User proceeded or 5s timed out
          if (currentPose >= totalPhotos) {
            setImageVersion((v) => v + 1);
            const cfg = loadOperatorConfig();
            if (cfg.enablePhotoSelectionStep) {
              setKioskStep("PHOTO_SELECTION");
            } else if (cfg.enableTemplateSelectionStep) {
              setKioskStep("TEMPLATE_SELECTION");
            } else {
              setKioskStep("PREVIEW");
            }
            return;
          }

          currentPose++;
          if (!abortFlowRef.current) {
            await sleep(CAPTURE_PAUSE_MS);
          }
        }
      } finally {
        sequenceRunningRef.current = false;
        setCountdown(null);
        setReviewCountdown(null);
      }
    },
    [selectedCountdownSeconds, webcam, waitForReviewIntermission]
  );

  useEffect(() => {
    runSequenceRef.current = runAutomatedCaptureSequence;
  }, [runAutomatedCaptureSequence]);

  const refreshSystemStatus = useCallback(async () => {
    try {
      const [cam, prn, curr, tplData] = await Promise.all([
        photoboothApi.getCameraStatus().catch(() => null),
        photoboothApi.getPrinterStatus().catch(() => null),
        photoboothApi.getCurrentSession().catch(() => null),
        photoboothApi.getTemplatesData().catch(() => null),
      ]);

      if (cam) setCameraStatus(cam);
      if (prn) setPrinterStatus(prn);
      if (tplData?.templates && tplData.templates.length > 0) {
        setTemplates(tplData.templates);
      }
      if (tplData?.frame_themes && tplData.frame_themes.length > 0) {
        setFrameThemes(tplData.frame_themes);
      }

      if (curr) {
        const nextState = curr.session
          ? curr.session.status
          : curr.state || "IDLE";
        setState(nextState);
        setSession(curr.session);

        if (
          curr.session &&
          (nextState === "STARTED" || nextState === "CAPTURING") &&
          !sequenceRunningRef.current
        ) {
          setKioskStep("CAPTURING");
          runSequenceRef.current(curr.session);
        } else if (curr.session && nextState === "PREVIEW") {
          setKioskStep((prev) =>
            prev === "PHOTO_SELECTION" || prev === "TEMPLATE_SELECTION"
              ? prev
              : "PREVIEW"
          );
        } else if (nextState === "IDLE") {
          setKioskStep((prev) =>
            prev === "PREPARATION" || prev === "COMPLETION" ? prev : "WELCOME"
          );
        }
      }
    } catch {
      // ignore initial offline error
    }
  }, []);

  useEffect(() => {
    refreshSystemStatus();
  }, [refreshSystemStatus]);

  // WebSocket live connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(getWsUrl());
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "INITIAL_STATE") {
              setState(msg.state || "IDLE");
              if (msg.session) setSession(msg.session);
            } else if (msg.type === "STATE_CHANGE") {
              if (sequenceRunningRef.current || customizingRef.current) return;
              setState(msg.data.to);
            }
          } catch {
            // ignore malformed message
          }
        };
      } catch {
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const openPreparationStep = useCallback(() => {
    setErrorBanner(null);
    setCaptureError(null);
    setCompletedSession(null);
    const cfg = loadOperatorConfig();
    setOperatorConfig(cfg);
    setKioskStep("PREPARATION");
  }, []);

  const backToWelcome = useCallback(() => {
    setErrorBanner(null);
    setCaptureError(null);
    setCompletedSession(null);
    setKioskStep("WELCOME");
  }, []);

  const startBoothSession = useCallback(
    async (customerName?: string) => {
      setErrorBanner(null);
      setCaptureError(null);
      setIsBusy(true);
      try {
        const started = await photoboothApi.startSession({
          customer_name: customerName || undefined,
          photos_required: selectedTemplate.photos_required,
          template_id: selectedTemplate.id,
          frame_color: selectedFrameColor,
        });
        setSession(started);
        setState(started.status);
        setIsBusy(false);
        await runAutomatedCaptureSequence(started);
      } catch (err: any) {
        const msg = err?.message || "Gagal memulai sesi photobooth.";
        setErrorBanner(msg);
        setAssertiveMessage(msg);
        setIsBusy(false);
      }
    },
    [selectedTemplate, selectedFrameColor, runAutomatedCaptureSequence]
  );

  const retryFailedCapture = useCallback(async () => {
    if (!session) return;
    setCaptureError(null);
    await runAutomatedCaptureSequence(session);
  }, [session, runAutomatedCaptureSequence]);

  const completePhotoSelectionStep = useCallback(() => {
    const cfg = loadOperatorConfig();
    if (cfg.enableTemplateSelectionStep) {
      setKioskStep("TEMPLATE_SELECTION");
    } else {
      setKioskStep("PREVIEW");
    }
  }, []);

  const customizePreview = useCallback(
    async (opts: {
      filterName?: string;
      frameColor?: string;
      templateId?: string;
      customText?: string;
    }) => {
      if (!session) return;
      customizingRef.current = true;
      setIsBusy(true);
      setErrorBanner(null);
      try {
        const updated = await photoboothApi.processSession({
          session_id: session.session_id,
          filter_name: opts.filterName ?? session.filter_name ?? "original",
          frame_color: opts.frameColor ?? session.frame_color ?? "pink",
          template_id: opts.templateId ?? session.template_id ?? undefined,
          custom_text: opts.customText,
        });
        setSession(updated);
        setState(updated.status);
        setImageVersion((v) => v + 1);
        setKioskStep("PREVIEW");
        setPoliteMessage("Desain frame berhasil diterapkan");
      } catch (err: any) {
        const msg = err?.message || "Gagal memproses komposisi foto.";
        setErrorBanner(msg);
        setAssertiveMessage(msg);
      } finally {
        customizingRef.current = false;
        setIsBusy(false);
      }
    },
    [session]
  );

  const printAndFinish = useCallback(
    async (copies: number = 1) => {
      if (!session) return;
      setIsBusy(true);
      setPrintCopies(copies);
      setErrorBanner(null);
      setState("PRINTING");
      setKioskStep("PRINTING");
      setPoliteMessage("Mengirim foto ke printer...");
      try {
        const snapshot = { ...session };
        const res = await photoboothApi.printSession(
          session.session_id,
          copies
        );
        // Brief visible confirmation on PrintingScreen before transitioning to CompletionScreen
        await sleep(1600);
        setCompletedSession(res.session || snapshot);
        setSession(null);
        setState("COMPLETED");
        setKioskStep("COMPLETION");
        setPoliteMessage("Pencetakan selesai. Terima kasih!");
      } catch (err: any) {
        const msg = err?.message || "Gagal mencetak foto. Printer mungkin offline.";
        setErrorBanner(msg);
        setAssertiveMessage(msg);
        setState("PREVIEW");
        setKioskStep("PREVIEW");
      } finally {
        setIsBusy(false);
      }
    },
    [session]
  );

  const finishWithoutPrint = useCallback(async () => {
    if (!session) {
      setKioskStep("WELCOME");
      return;
    }
    setIsBusy(true);
    setErrorBanner(null);
    try {
      const snapshot = { ...session };
      const res = await photoboothApi.completeSession(session.session_id);
      setCompletedSession(res.session || snapshot);
      setSession(null);
      setState("COMPLETED");
      setKioskStep("COMPLETION");
      setPoliteMessage("Sesi selesai disimpan.");
    } catch (err: any) {
      setErrorBanner(err?.message || "Gagal menyelesaikan sesi.");
    } finally {
      setIsBusy(false);
    }
  }, [session]);

  const resetToWelcomeFromCompletion = useCallback(async () => {
    setCompletedSession(null);
    setSession(null);
    setState("IDLE");
    setKioskStep("WELCOME");
    await refreshSystemStatus();
  }, [refreshSystemStatus]);

  const abortCurrentSession = useCallback(async () => {
    abortFlowRef.current = true;
    sequenceRunningRef.current = false;
    if (reviewResolverRef.current) {
      reviewResolverRef.current("next");
    }
    setReviewCountdown(null);
    setCountdown(null);
    setCaptureError(null);
    if (!session) {
      setState("IDLE");
      setKioskStep("WELCOME");
      return;
    }
    try {
      await photoboothApi.abortSession(session.session_id);
    } catch {
      await photoboothApi.resetSystem().catch(() => null);
    }
    setSession(null);
    setCompletedSession(null);
    setState("IDLE");
    setKioskStep("WELCOME");
    setErrorBanner(null);
    setPoliteMessage("Sesi dibatalkan.");
    await refreshSystemStatus();
  }, [session, refreshSystemStatus]);

  const emergencyReset = useCallback(async () => {
    abortFlowRef.current = true;
    sequenceRunningRef.current = false;
    if (reviewResolverRef.current) {
      reviewResolverRef.current("next");
    }
    setReviewCountdown(null);
    setCountdown(null);
    setCaptureError(null);
    await photoboothApi.resetSystem().catch(() => null);
    setSession(null);
    setCompletedSession(null);
    setState("IDLE");
    setKioskStep("WELCOME");
    setErrorBanner(null);
    setPoliteMessage("Sistem telah di-reset ke status siap.");
    await refreshSystemStatus();
  }, [refreshSystemStatus]);

  const enabledTemplates = templates.filter((t) =>
    operatorConfig.enabledTemplateIds.includes(t.id)
  );
  const visibleTemplates =
    enabledTemplates.length > 0 ? enabledTemplates : templates;

  return {
    state,
    kioskStep,
    setKioskStep,
    session,
    completedSession,
    cameraStatus,
    printerStatus,
    templates: visibleTemplates,
    allTemplates: templates,
    frameThemes,
    selectedTemplate,
    setSelectedTemplate: handleSelectTemplate,
    selectedFrameColor,
    setSelectedFrameColor,
    selectedCountdownSeconds,
    setSelectedCountdownSeconds,
    countdown,
    reviewCountdown,
    isFlashing,
    isBusy,
    wsConnected,
    errorBanner,
    setErrorBanner,
    captureError,
    printCopies,
    imageVersion,
    politeMessage,
    assertiveMessage,
    webcam,
    openPreparationStep,
    backToWelcome,
    startBoothSession,
    proceedFromReview,
    retakeCurrentPhoto,
    retryFailedCapture,
    completePhotoSelectionStep,
    customizePreview,
    printAndFinish,
    finishWithoutPrint,
    resetToWelcomeFromCompletion,
    abortCurrentSession,
    emergencyReset,
    refreshSystemStatus,
  };
}
