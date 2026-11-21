import { useEffect, useState, type RefObject } from "react";

/**
 * True once `ref` is near the viewport AND the page has had `afterMs` to settle
 * (then waits for an idle moment). Used for heavy WebGL pieces so their shader
 * compiles / model downloads never land on top of the loading animation.
 * Stays true once set.
 */
export function useDeferredMount(
  ref: RefObject<Element | null>,
  { rootMargin = "300px 0px", afterMs = 2600 }: { rootMargin?: string; afterMs?: number } = {},
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || mounted) return;

    let near = false;
    let settled = false;
    let idleId: number | undefined;
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;

    const tryMount = () => {
      if (near && settled && idleId === undefined) {
        idleId = ric(() => setMounted(true), { timeout: 800 }) as number;
      }
    };

    const timer = window.setTimeout(() => {
      settled = true;
      tryMount();
    }, afterMs);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          near = true;
          io.disconnect();
          tryMount();
        }
      },
      { rootMargin },
    );
    io.observe(el);

    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      if (idleId !== undefined) cic(idleId);
    };
  }, [ref, rootMargin, afterMs, mounted]);

  return mounted;
}
