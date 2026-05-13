import type React from "react";
import { cn } from '../lib/utils';
import { memo, useRef, useState } from 'react';
import type { LabelPos } from '../App';

export const DraggableLabel = memo(function DraggableLabel({
  text,
  style,
  pos,
  onPosChange,
  className,
  opacity = 1,
  id,
}: {
  text: string;
  style: React.CSSProperties;
  pos: LabelPos;
  onPosChange: (pos: LabelPos) => void;
  className?: string;
  opacity?: number;
  id?: string;
}) {
  const [draggingStyle, setDraggingStyle] = useState<{ left: number; top: number } | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!labelRef.current) return;
    const parent = labelRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialRect = labelRef.current.getBoundingClientRect();

    const startOffsetX = initialRect.left - parentRect.left;
    const startOffsetY = initialRect.top - parentRect.top;

    const onPointerMove = (moveEvent: PointerEvent) => {
      setShowGrid(true);
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setDraggingStyle({
        left: startOffsetX + dx,
        top: startOffsetY + dy,
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setDraggingStyle(null);
      setShowGrid(false);

      const parentRectAfter = parent.getBoundingClientRect();
      const dropX = upEvent.clientX - parentRectAfter.left;
      const dropY = upEvent.clientY - parentRectAfter.top;

      let newX: LabelPos['x'] = 'center';
      if (dropX < parentRectAfter.width / 3) newX = 'left';
      else if (dropX > (parentRectAfter.width * 2) / 3) newX = 'right';

      let newY: LabelPos['y'] = 'center';
      if (dropY < parentRectAfter.height / 3) newY = 'top';
      else if (dropY > (parentRectAfter.height * 2) / 3) newY = 'bottom';

      onPosChange({ x: newX, y: newY });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const getPosStyle = () => {
    if (draggingStyle) {
      return {
        left: `${draggingStyle.left}px`,
        top: `${draggingStyle.top}px`,
        transform: 'none',
      };
    }

    const res: React.CSSProperties = {};
    const paddingVal = '24px';

    if (pos.x === 'left') { res.left = paddingVal; }
    else if (pos.x === 'right') { res.right = paddingVal; }
    else { res.left = '50%'; res.transform = 'translateX(-50%)'; }

    if (pos.y === 'top') { res.top = paddingVal; }
    else if (pos.y === 'bottom') { res.bottom = paddingVal; }
    else {
      res.top = '50%';
      res.transform = res.transform ? 'translate(-50%, -50%)' : 'translateY(-50%)';
    }

    return res;
  };

  return (
    <>
      <div
        id={id}
        ref={labelRef}
        role="button"
        tabIndex={0}
        aria-label={`Draggable label: ${text}`}
        onPointerDown={handlePointerDown}
        onKeyDown={(e) => {
        }}
        className={cn(
          "absolute cursor-grab active:cursor-grabbing hover:scale-105 pointer-events-auto z-40 text-center",
          draggingStyle ? "opacity-90 shadow-2xl scale-105 z-50 duration-0" : "transition-all duration-200",
          className
        )}
        style={{ ...getPosStyle(), opacity }}
      >
        <span style={style} className="inline-block shadow-md select-none pointer-events-none">
          {text}
        </span>
      </div>

      {showGrid && (
        <div className="absolute inset-0 pointer-events-none z-30 grid grid-cols-3 grid-rows-3 border-2 border-indigo-500/30">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-indigo-500/20 bg-indigo-500/5 transition-all"></div>
          ))}
        </div>
      )}
    </>
  );
});
