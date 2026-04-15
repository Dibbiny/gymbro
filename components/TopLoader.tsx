"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Start: animate to 80%
    bar.style.transition = "none";
    bar.style.width = "0%";
    bar.style.opacity = "1";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = "width 0.4s ease";
        bar.style.width = "80%";
      });
    });

    // Complete: finish to 100% then fade
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bar.style.transition = "width 0.2s ease";
      bar.style.width = "100%";
      setTimeout(() => {
        bar.style.transition = "opacity 0.3s ease";
        bar.style.opacity = "0";
      }, 200);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, searchParams]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        ref={barRef}
        style={{ width: "0%", opacity: 0 }}
        className="h-full bg-primary"
      />
    </div>
  );
}
