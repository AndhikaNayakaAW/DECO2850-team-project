"use client";

import { useEffect, useRef } from "react";

/** A panel that slides up over the calendar. Escape or a tap outside closes it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    // Once per opening: the calendar re-renders on every sync, and focus must stay where the worker put it.
    const opener = document.activeElement as HTMLElement | null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close.current();
    }
    window.addEventListener("keydown", onKey);
    // The first field to type in, else the first control.
    (box.current?.querySelector<HTMLElement>("input, select, textarea") ?? box.current?.querySelector<HTMLElement>("button:not(.x)"))?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <i className="grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
