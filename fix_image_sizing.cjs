const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The issue was we were replacing too broad of a regex, let's fix it by completely replacing the PanZoomImage function definition explicitly.
const startStr = "function PanZoomImage({";
const endStr = "  );\n}";
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

const currentFunc = content.slice(startIndex, endIndex);

const newPanZoomComponent = `function PanZoomImage({
  src,
  alt,
  className,
  style,
  draggable = false,
  transform,
  setTransform,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  transform: ImageTransform;
  setTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
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
    transform: \`translate3d(\${transform.x}px, \${transform.y}px, 0) scale(\${transform.scale})\`,
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
        className={cn("w-full h-full block pointer-events-none", className)}
        style={{ ...style, ...transformStyle }}
      />
    </div>
  );
}`;

content = content.replace(currentFunc, newPanZoomComponent);

fs.writeFileSync('src/App.tsx', content);
