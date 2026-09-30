"use client";

import { X } from "@phosphor-icons/react";
import { useEffect } from "react";

// A bottom sheet on paper. Tap outside, the close button or Escape dismisses.
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a1b14]/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="rise w-full max-w-lg rounded-t-[28px] bg-paper px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-sand" aria-hidden />
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
