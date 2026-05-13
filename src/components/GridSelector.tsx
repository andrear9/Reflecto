import type React from "react";
import { cn } from '../lib/utils';
import { memo } from 'react';
import type { LabelPos } from '../App';

const cells: LabelPos[] = [
  { x: 'left', y: 'top' }, { x: 'center', y: 'top' }, { x: 'right', y: 'top' },
  { x: 'left', y: 'center' }, { x: 'center', y: 'center' }, { x: 'right', y: 'center' },
  { x: 'left', y: 'bottom' }, { x: 'center', y: 'bottom' }, { x: 'right', y: 'bottom' }
];

export const GridSelector = memo(function GridSelector({ value, onChange }: { value: LabelPos, onChange: (v: LabelPos) => void }) {
  return (
    <div
      role="group"
      aria-label="Grid Position Selector"
      className="grid grid-cols-3 gap-[2px] w-full aspect-square max-w-[80px] bg-[var(--surface)] border border-[var(--border)] p-[3px] rounded-md shadow-sm"
    >
      {cells.map((c, i) => {
        const isSelected = value.x === c.x && value.y === c.y;
        return (
          <button
            key={i}
            onClick={() => onChange(c)}
            title={`${c.y} ${c.x}`}
            aria-label={`${c.y} ${c.x}`}
            aria-pressed={isSelected}
            className={cn(
              "w-full h-full rounded-[3px] transition-colors",
              isSelected ? "bg-[var(--color-accent)]" : "bg-black/5 dark:bg-white/5 hover:bg-[var(--border)]"
            )}
          />
        );
      })}
    </div>
  )
});
