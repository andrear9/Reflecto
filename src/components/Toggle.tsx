import type React from "react";
import { cn } from '../lib/utils';
import { memo } from 'react';

export const Toggle = memo(function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean,
  onChange: (v: boolean) => void,
  label?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label || "Toggle"}
      className={cn(
        "w-9 h-5 rounded-full relative transition-colors duration-300 outline-none flex items-center px-0.5 shadow-inner",
        checked ? "bg-[var(--color-accent)] text-white shadow-indigo-500/20" : "bg-[var(--border)] shadow-black/5"
      )}
      onClick={() => onChange(!checked)}
    >
      <div className={cn(
        "w-4 h-4 bg-white rounded-full transition-all duration-300 shadow",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
});
