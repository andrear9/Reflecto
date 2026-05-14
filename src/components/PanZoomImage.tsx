import type React from "react";
import { cn } from '../lib/utils';
import { memo, useRef, useCallback } from 'react';
import type { ImageTransform } from '../App';

export const PanZoomImage = memo(function PanZoomImage({
  src,
  alt,
  className,
  style,
  draggable = false,
  transform,
  setTransform,
  objectFitMode = 'cover',
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  transform: ImageTransform;
  setTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
  objectFitMode?: 'cover' | 'contain';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
      containerRef.current.style.cursor = 'grabbing';
    }
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, [setTransform]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setTransform(prev => {
      const newScale = Math.min(Math.max(0.1, prev.scale + delta), 10);
      return { ...prev, scale: newScale };
    });
  }, [setTransform]);

  const handleDoubleClick = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [setTransform]);

  const transformStyle: React.CSSProperties = {
    transform: `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
    transformOrigin: 'center center',
    transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
    cursor: isDragging.current ? 'grabbing' : 'grab',
    width: '100%',
    height: '100%',
    display: 'block'
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Pan and Zoom area for ${alt}`}
      className={cn("absolute inset-0 w-full h-full overflow-hidden pointer-events-auto")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
    >
            <img
        src={src}
        alt={alt}
        draggable={draggable}
        className={cn("block pointer-events-none absolute", className)}
        style={{
          ...style,
          ...transformStyle,
          top: '50%',
          left: '50%',
          width: 'auto',
          height: 'auto',
          minWidth: objectFitMode === 'cover' ? '100%' : undefined,
          minHeight: objectFitMode === 'cover' ? '100%' : undefined,
          maxWidth: objectFitMode === 'contain' ? '100%' : 'none',
          maxHeight: objectFitMode === 'contain' ? '100%' : 'none',
          objectFit: 'fill' // overrides any external object-fit classes that cause clipping
        }}
      />
    </div>
  );
});
