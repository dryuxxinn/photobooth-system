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
import { OperatorModal } from "@/components/OperatorModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertIcon, RefreshIcon, SpinnerIcon } from "@/components/icons";

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
    countdown,
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
    retryFailedCapture,
    completePhotoSelectionStep,
    customizePreview,
    printAndFinish,
    finishWithoutPrint,
    resetToWelcomeFromCompletion,
    abortCurrentSession,
    emergencyReset,
    refreshSystemStatus,
  } = usePhotoboothSession();

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);

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

      {/* Top Sweet Studio Header Bar */}
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
          templates={templates}
          frameThemes={frameThemes}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
          selectedFrameColor={selectedFrameColor}
          onSelectFrameColor={setSelectedFrameColor}
          cameraSource={webcam.cameraSource}
          onChangeCameraSource={webcam.setCameraSource}
          facingMode={webcam.facingMode}
          onToggleFacingMode={webcam.toggleFacingMode}
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
            countdown={countdown}
            isBusy={isBusy}
            captureError={captureError}
            cameraSource={webcam.cameraSource}
            facingMode={webcam.facingMode}
            streamReady={webcam.streamReady}
            webcamError={webcam.webcamError}
            deviceLabel={webcam.deviceLabel}
            attachVideoRef={webcam.attachVideoRef}
            onRetryCapture={retryFailedCapture}
            onAbort={abortCurrentSession}
          />
        )}

      {/* Interstitial Processing State */}
      {state === "PROCESSING" && (
        <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Card
            variant="surface"
            padding="lg"
            className="max-w-md w-full flex flex-col items-center space-y-4"
          >
            <div className="size-20 rounded-full bg-sweet-blush border-2 border-sweet-primary flex items-center justify-center">
              <SpinnerIcon className="size-10 text-sweet-primaryStrong" />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-sweet-text">
              Menyusun Strip Foto Manismu...
            </h2>
            <p className="text-sm text-sweet-muted">
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
            onContinue={() => completePhotoSelectionStep()}
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
