"use client";

import React, { useState } from "react";
import { usePhotoboothSession } from "@/hooks/usePhotoboothSession";
import { TopBar } from "@/components/TopBar";
import { WelcomeScreen } from "@/components/kiosk/WelcomeScreen";
import { PreparationScreen } from "@/components/kiosk/PreparationScreen";
import { CountdownOverlay } from "@/components/kiosk/CountdownOverlay";
import { PhotoSelection } from "@/components/kiosk/PhotoSelection";
import { TemplateSelector } from "@/components/kiosk/TemplateSelector";
import { PhotoPreview } from "@/components/kiosk/PhotoPreview";
import { PrintingScreen } from "@/components/kiosk/PrintingScreen";
import { CompletionScreen } from "@/components/kiosk/CompletionScreen";
import { PaymentModal } from "@/components/kiosk/PaymentModal";
import { OperatorModal } from "@/components/OperatorModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertIcon, RefreshIcon, SpinnerIcon } from "@/components/icons";
import { getFilterCss } from "@/lib/defaults";

const STEP_ORDER: Record<string, number> = {
  WELCOME: 0,
  PREPARATION: 1,
  CAPTURING: 2,
  PHOTO_SELECTION: 3,
  TEMPLATE_SELECTION: 4,
  PREVIEW: 5,
  PRINTING: 6,
  COMPLETION: 7,
};

export default function KioskHomePage() {
  const {
    state,
    kioskStep,
    setKioskStep,
    session,
    completedSession,
    cameraStatus,
    printerStatus,
    templates,
    frameThemes,
    selectedTemplate,
    setSelectedTemplate,
    selectedFrameColor,
    setSelectedFrameColor,
    selectedFilter,
    setSelectedFilter,
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
    operatorConfig,
    paymentModalOpen,
    setPaymentModalOpen,
    confirmPaymentAndProceed,
    openPreparationStep,
    backToWelcome,
    startBoothSession,
    triggerCaptureNow,
    proceedFromReview,
    retakeCurrentPhoto,
    retryFailedCapture,
    completePhotoSelectionStep,
    backToPhotoSelection,
    customizePreview,
    printAndFinish,
    finishWithoutPrint,
    resetToWelcomeFromCompletion,
    abortCurrentSession,
    emergencyReset,
    refreshSystemStatus,
  } = usePhotoboothSession();

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const prevStepRef = React.useRef(kioskStep);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  React.useEffect(() => {
    if (prevStepRef.current !== kioskStep) {
      const prevIdx = STEP_ORDER[prevStepRef.current] ?? 0;
      const currIdx = STEP_ORDER[kioskStep] ?? 0;
      const nextDir = currIdx >= prevIdx ? "forward" : "backward";
      setDirection(nextDir);

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        try {
          (document as any).startViewTransition({
            types: [nextDir],
          });
        } catch {
          // Graceful fallback
        }
      }
      prevStepRef.current = kioskStep;
    }
  }, [kioskStep]);

  return (
    <main className="h-dvh flex flex-col relative overflow-hidden sweet-bg">
      {/* Centralized ARIA Live Regions for assistive tech announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>

      {/* Single gentle camera shutter flash overlay */}
      {isFlashing && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-white pointer-events-none z-50 shutter-flash-overlay"
        />
      )}

      {/* Minimal Floating Bottom-Right Status Pill */}
      <TopBar
        kioskStep={kioskStep}
        cameraStatus={cameraStatus}
        printerStatus={printerStatus}
        onOpenOperator={() => setOperatorModalOpen(true)}
      />

      {/* Dismissible Error Alert Banner */}
      {errorBanner && (
        <div
          role="alert"
          className="mx-6 mt-3 px-5 py-3.5 rounded-3xl bg-[#FCECEE] border-2 border-[#EABAC0] text-sweet-text flex flex-wrap items-center justify-between gap-3 shadow-sweet z-20"
        >
          <div className="flex items-center gap-2.5 text-sm font-heading font-bold text-sweet-error">
            <AlertIcon className="size-5 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="danger" size="md" onClick={emergencyReset}>
              Mulai Ulang (Reset)
            </Button>
            <Button
              variant="surface"
              size="md"
              onClick={() => setErrorBanner(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      )}

      {/* Sliding Scene Container (Geser Halus antar scene) */}
      <div
        key={kioskStep}
        className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
          direction === "forward"
            ? "animate-slide-in-right"
            : "animate-slide-in-left"
        }`}
      >
        {/* 1. Welcome Screen (Section 3.A) */}
        {kioskStep === "WELCOME" && state === "IDLE" && (
          <WelcomeScreen
            templates={templates}
            frameThemes={frameThemes}
            selectedTemplate={selectedTemplate}
            selectedFrameColor={selectedFrameColor}
            cameraConnected={cameraStatus?.connected ?? true}
            onStartTapped={openPreparationStep}
          />
        )}

        {/* 2. Preparation & Package Selection Screen (Section 3.B & 3.C) */}
        {kioskStep === "PREPARATION" && state === "IDLE" && (
          <PreparationScreen
            cameraStatus={cameraStatus}
            printerStatus={printerStatus}
            templates={templates}
            frameThemes={frameThemes}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            selectedFrameColor={selectedFrameColor}
            onSelectFrameColor={setSelectedFrameColor}
            selectedCountdownSeconds={selectedCountdownSeconds}
            onSelectCountdownSeconds={setSelectedCountdownSeconds}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            cameraSource={webcam.cameraSource}
            onChangeCameraSource={webcam.setCameraSource}
            facingMode={webcam.facingMode}
            onToggleFacingMode={webcam.toggleFacingMode}
            devices={webcam.devices}
            selectedDeviceId={webcam.selectedDeviceId}
            onSelectDeviceId={webcam.setSelectedDeviceId}
            isMirrored={webcam.isMirrored}
            onToggleMirror={webcam.toggleMirror}
            streamReady={webcam.streamReady}
            webcamError={webcam.webcamError}
            deviceLabel={webcam.deviceLabel}
            attachVideoRef={webcam.attachVideoRef}
            onRetryWebcam={webcam.retryWebcam}
            isBusy={isBusy}
            onBack={backToWelcome}
            onStartCapture={startBoothSession}
          />
        )}

        {/* 3. Countdown & Capture Screen (Section 3.D) */}
        {(kioskStep === "CAPTURING" ||
          state === "STARTED" ||
          state === "CAPTURING") &&
          session && (
            <CountdownOverlay
              session={session}
              cameraStatus={cameraStatus}
              countdown={countdown}
              reviewCountdown={reviewCountdown}
              onCaptureNow={triggerCaptureNow}
              onProceedNext={proceedFromReview}
              onRetakeCurrent={retakeCurrentPhoto}
              isBusy={isBusy}
              captureError={captureError}
              cameraSource={webcam.cameraSource}
              facingMode={webcam.facingMode}
              isMirrored={webcam.isMirrored}
              streamReady={webcam.streamReady}
              webcamError={webcam.webcamError}
              deviceLabel={webcam.deviceLabel}
              attachVideoRef={webcam.attachVideoRef}
              onRetryWebcam={webcam.retryWebcam}
              onRetryCapture={retryFailedCapture}
              onAbort={abortCurrentSession}
              filterCss={getFilterCss(selectedFilter)}
            />
          )}

        {/* Interstitial Processing State */}
        {state === "PROCESSING" && (
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Card
              variant="glass"
              padding="lg"
              className="max-w-md w-full flex flex-col items-center space-y-4"
            >
              <div className="size-20 rounded-full bg-gradient-to-tr from-[#FBCFE8] to-[#F472B6] flex items-center justify-center shadow-sweet animate-bounce">
                <SpinnerIcon className="size-10 text-white" />
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-[#3F3D56]">
                Menyusun Strip Foto Manismu...
              </h2>
              <p className="text-sm font-heading font-semibold text-sweet-muted">
                Menggabungkan foto ke dalam frame dengan kualitas cetak tinggi ✨
              </p>
            </Card>
          </section>
        )}

        {/* 4. Photo Selection Screen (Section 3.E) */}
        {kioskStep === "PHOTO_SELECTION" &&
          state === "PREVIEW" &&
          session && (
            <PhotoSelection
              session={session}
              template={selectedTemplate}
              onContinue={(selectedIds) => completePhotoSelectionStep(selectedIds)}
            />
          )}

        {/* 5. Template Selection Screen (Section 3.F) */}
        {kioskStep === "TEMPLATE_SELECTION" &&
          state === "PREVIEW" &&
          session && (
            <TemplateSelector
              session={session}
              templates={templates}
              frameThemes={frameThemes}
              isBusy={isBusy}
              onApplyAndContinue={customizePreview}
            />
          )}

        {/* 6. Final Preview Screen (Section 3.G) */}
        {kioskStep === "PREVIEW" && state === "PREVIEW" && session && (
          <PhotoPreview
            session={session}
            templates={templates}
            frameThemes={frameThemes}
            isBusy={isBusy}
            imageVersion={imageVersion}
            onOpenChangeFrame={() => setKioskStep("TEMPLATE_SELECTION")}
            onBackToPhotoSelection={backToPhotoSelection}
            onQuickCustomize={customizePreview}
            onPrint={printAndFinish}
            onFinishWithoutPrint={finishWithoutPrint}
          />
        )}

        {/* 7. Printing Screen (Section 3.H) */}
        {(kioskStep === "PRINTING" || state === "PRINTING") && (
          <PrintingScreen
            printerStatus={printerStatus}
            copies={printCopies}
          />
        )}

        {/* 8. Completion Screen (Section 3.I) */}
        {kioskStep === "COMPLETION" && (
          <CompletionScreen
            completedSession={completedSession}
            onStartAgain={resetToWelcomeFromCompletion}
          />
        )}
      </div>

      {/* Exception Recovery Screen if session is in ERROR outside capture loop */}
      {state === "ERROR" && !captureError && (
        <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Card
            variant="surface"
            padding="lg"
            className="max-w-md w-full flex flex-col items-center space-y-4 border-sweet-error"
          >
            <div className="size-16 rounded-full bg-[#FCECEE] text-sweet-error flex items-center justify-center">
              <AlertIcon className="size-8" />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-sweet-text">
              Ups, Terjadi Kendala Teknis
            </h2>
            <p className="text-sm text-sweet-muted">
              {errorBanner ||
                session?.error_message ||
                "Perangkat kamera atau pemrosesan mengalami gangguan sementara."}
            </p>
            <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
              {session && session.photos_taken < session.photos_required && (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<RefreshIcon className="size-5" />}
                  onClick={retryFailedCapture}
                  className="flex-1"
                >
                  Coba Ambil Ulang
                </Button>
              )}
              <Button
                variant="surface"
                size="lg"
                onClick={emergencyReset}
                className="flex-1"
              >
                Kembali ke Awal
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Payment Gate Modal (QRIS & Voucher) when enabled by Operator */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        amountIdr={operatorConfig.sessionPriceIdr ?? 35000}
        validVoucherCodes={operatorConfig.voucherCodes}
        onPaymentSuccess={confirmPaymentAndProceed}
      />

      {/* Hidden Operator Diagnostics Modal */}
      <OperatorModal
        isOpen={operatorModalOpen}
        onClose={() => setOperatorModalOpen(false)}
        state={state}
        wsConnected={wsConnected}
        cameraStatus={cameraStatus}
        printerStatus={printerStatus}
        onRefreshStatus={refreshSystemStatus}
        onEmergencyReset={emergencyReset}
      />
    </main>
  );
}
