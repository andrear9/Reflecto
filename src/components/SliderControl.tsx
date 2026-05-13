import type React from "react";
import { memo } from 'react';

export const SliderControl = memo(function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = ""
}: {
  label: string,
  value: number,
  min: number,
  max: number,
  step?: number,
  onChange: (v: number) => void,
  unit?: string
}) {
  return (
    <div className="flex flex-col gap-2.5 group">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-[var(--foreground)]">{label}</label>
        <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--border)] shadow-sm transition-colors group-hover:border-[var(--muted)]">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider"
      />
    </div>
  );
});
