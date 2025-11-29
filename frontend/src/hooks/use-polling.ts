import { useEffect, useRef, useCallback } from "react";

interface UsePollingOptions {
  interval: number;
  enabled: boolean;
  onPoll: () => Promise<boolean>; // Return true to stop polling
}

export function usePolling({ interval, enabled, onPoll }: UsePollingOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return;

    try {
      const shouldStop = await onPoll();
      if (shouldStop || !isMountedRef.current) return;

      timeoutRef.current = setTimeout(poll, interval);
    } catch {
      // On error, continue polling
      if (isMountedRef.current && enabled) {
        timeoutRef.current = setTimeout(poll, interval);
      }
    }
  }, [enabled, interval, onPoll]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      poll();
    }

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, poll]);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { stopPolling };
}
