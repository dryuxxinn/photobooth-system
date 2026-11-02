"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseIdleCountdownOptions {
  enabled: boolean;
  totalSeconds: number;
  onExpire: () => void;
}

export function useIdleCountdown({
  enabled,
  totalSeconds,
  onExpire,
}: UseIdleCountdownOptions) {
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const resetTimer = useCallback(() => {
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(totalSeconds);
      return;
    }

    setSecondsLeft(totalSeconds);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleActivity = () => {
      setSecondsLeft(totalSeconds);
    };

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [enabled, totalSeconds]);

  return { secondsLeft, resetTimer };
}
