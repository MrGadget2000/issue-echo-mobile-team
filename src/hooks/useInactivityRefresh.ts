import { useEffect, useRef } from 'react';

/**
 * Reloads the page after `timeoutMs` of user inactivity.
 * Activity = mousemove, mousedown, keydown, scroll, touchstart, visibilitychange.
 */
export function useInactivityRefresh(timeoutMs: number = 300_000) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        window.location.reload();
      }, timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener('visibilitychange', reset);

    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener('visibilitychange', reset);
    };
  }, [timeoutMs]);
}
