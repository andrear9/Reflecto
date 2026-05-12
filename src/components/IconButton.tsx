import type React from "react";
import { cn } from '../lib/utils';
import { memo } from 'react';

export const IconButton = memo(function IconButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all duration-300",
        active
          ? "bg-[var(--surface)] border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_2px_12px_rgba(99,102,241,0.12)] ring-1 ring-[var(--color-accent)]/20"
          : "bg-[var(--background)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      )}
    >
      <div aria-hidden="true" className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
});
