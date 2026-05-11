import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useCallback } from 'react';
import { 
  Sun, Moon, Upload, Image as ImageIcon, Settings, Type, Download, 
  Copy, Trash2, LayoutTemplate, Layers, SplitSquareHorizontal, 
  Maximize, MoreHorizontal, SlidersHorizontal, ImageOff, FlipHorizontal,
  ZoomIn, ZoomOut, Monitor, ArrowLeftRight, Video, Loader2
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from './lib/utils';

import { exportVideoTask } from './lib/videoExport';
import { exportGifTask } from './lib/gifExport';

type ViewMode = 'slider' | 'side-by-side' | 'split' | 'vertical' | 'fade';

type LabelPosX = 'left' | 'center' | 'right';
type LabelPosY = 'top' | 'center' | 'bottom';
export type LabelPos = { x: LabelPosX; y: LabelPosY };

export type ImageTransform = { x: number; y: number; scale: number };

export default function App() {
  const [beforeTransform, setBeforeTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [afterTransform, setAfterTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  
  // View Modes
  const [mode, setMode] = useState<ViewMode>('slider');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [splitAngle, setSplitAngle] = useState<number>(0);
  const [fadeOpacity, setFadeOpacity] = useState<number>(50);

  // Labels
  const [showLabels, setShowLabels] = useState(true);
  const [beforeLabel, setBeforeLabel] = useState(() => localStorage.getItem('reflecto_beforeLabel') || 'Before');
  const [afterLabel, setAfterLabel] = useState(() => localStorage.getItem('reflecto_afterLabel') || 'After');
  const [beforeLabelPos, setBeforeLabelPos] = useState<LabelPos>({ x: 'left', y: 'top' });
  const [afterLabelPos, setAfterLabelPos] = useState<LabelPos>({ x: 'right', y: 'top' });
  const [labelSize, setLabelSize] = useState(24);
  const [labelRadius, setLabelRadius] = useState(8);
  const [labelFont, setLabelFont] = useState('Inter');
  const [labelBgColor, setLabelBgColor] = useState('rgba(0, 0, 0, 0.7)');
  const [labelTextColor, setLabelTextColor] = useState('#ffffff');

  // Logo
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(80);
  const [logoOpacity, setLogoOpacity] = useState(80);
  const [logoPaddingH, setLogoPaddingH] = useState(24);
  const [logoPaddingV, setLogoPaddingV] = useState(24);

  // Canvas settings
  const [canvasWidth, setCanvasWidth] = useState<number>(1200);
  const [aspectRatio, setAspectRatio] = useState<string>('auto');
  const [canvasBgColor, setCanvasBgColor] = useState('#0f0f0f');
  const [padding, setPadding] = useState(0);
  const [innerSpacing, setInnerSpacing] = useState(0);
  const [imageRadius, setImageRadius] = useState(0);
  const [jpegQuality, setJpegQuality] = useState(90);
  const [detectedRatio, setDetectedRatio] = useState<number | null>(null);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain'>('cover');

  // Filters
  const [beforeFilters, setBeforeFilters] = useState({ brightness: 100, contrast: 100, saturate: 100 });
  const [afterFilters, setAfterFilters] = useState({ brightness: 100, contrast: 100, saturate: 100 });
  const [showFilters, setShowFilters] = useState(false);

  const getFilterString = (f: { brightness: number, contrast: number, saturate: number }) => 
    `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%)`;
  const beforeFilterStyle = { filter: getFilterString(beforeFilters) };
  const afterFilterStyle = { filter: getFilterString(afterFilters) };

  // Theme
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reflecto-theme');
      if (saved !== null) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    isDark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
    localStorage.setItem('reflecto-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Zoom
  const [zoomLevel, setZoomLevel] = useState<number | 'auto'>('auto');
  const [actualScale, setActualScale] = useState(1);
  const [canvasHeight, setCanvasHeight] = useState(400);

  // Setup State
  const [activeTab, setActiveTab] = useState<'media' | 'layout' | 'export'>('media');
  const [isCopied, setIsCopied] = useState(false);

  // Video/GIF Export State
  const [isVideoExporting, setIsVideoExporting] = useState(false);
  const [videoExportProgress, setVideoExportProgress] = useState(0);
  const [isGifExporting, setIsGifExporting] = useState(false);
  const [gifExportProgress, setGifExportProgress] = useState(0);
  const [gifQuality, setGifQuality] = useState<'low'|'medium'|'high'>('medium');
  const [videoDuration, setVideoDuration] = useState(4);
  const [transitionDuration, setTransitionDuration] = useState(1);

  // Auto Zoom logic
  useEffect(() => {
    const updateScale = () => {
      if (!previewContainerRef.current || !canvasRef.current) return;
      
      const elWidth = canvasRef.current.offsetWidth || canvasWidth;
      const elHeight = canvasRef.current.offsetHeight || 300;
      
      if (elWidth === 0 || elHeight === 0) return;
      
      setCanvasHeight(prev => prev !== elHeight ? elHeight : prev);

      if (zoomLevel === 'auto') {
        const containerW = previewContainerRef.current.clientWidth;
        const containerH = previewContainerRef.current.clientHeight;
        
        const style = getComputedStyle(previewContainerRef.current);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

        const availableW = Math.max(10, containerW - paddingX);
        const availableH = Math.max(10, containerH - paddingY);
        
        const scaleX = availableW / elWidth;
        const scaleY = availableH / elHeight;
        const newScale = Math.max(0.01, Math.min(scaleX, scaleY)); // Accurate scale-to-fit
        
        setActualScale(prev => {
           // Prevent micro-adjustments
           if (Math.abs(prev - newScale) < 0.001) return prev;
           return newScale;
        });
      } else {
         setActualScale(zoomLevel / 100);
      }
    };

    updateScale();
    
    // Use an animation frame to avoid resize observer loops during transitions
    let frameId: number;
    const observer = new ResizeObserver(() => {
       cancelAnimationFrame(frameId);
       frameId = requestAnimationFrame(updateScale);
    });
    
    if (previewContainerRef.current) observer.observe(previewContainerRef.current);
    if (canvasRef.current) observer.observe(canvasRef.current);
    
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [zoomLevel, canvasWidth, aspectRatio, beforeImage, afterImage, padding, showLabels]);

  // Helpers for Interaction (Slider draggable)
  const isDragging = useRef(false);

  useEffect(() => {
    localStorage.setItem('reflecto_beforeLabel', beforeLabel);
  }, [beforeLabel]);

  useEffect(() => {
    localStorage.setItem('reflecto_afterLabel', afterLabel);
  }, [afterLabel]);

  const handleDragStart = useCallback((e: ReactMouseEvent | ReactTouchEvent | MouseEvent | TouchEvent) => {
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
  }, []);

  const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !canvasRef.current) return;
    if (e.cancelable) e.preventDefault();
    
    // Calculate relative position inside the canvas area based on pointer
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(percent, 100)); // Clamp between 0 and 100
    setSliderPos(Math.round(percent * 100) / 100);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleDrag, { passive: false });
    return () => {
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchmove', handleDrag);
    };
  }, [handleDrag, handleDragEnd]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;

      if (e.key === 's' || e.key === 'S') {
        const tempImg = beforeImage;
        const tempLbl = beforeLabel;
        const tempPos = beforeLabelPos;
        setBeforeImage(afterImage);
        setAfterImage(tempImg);
        setBeforeLabel(afterLabel);
        setAfterLabel(tempLbl);
        setBeforeLabelPos(afterLabelPos);
        setAfterLabelPos(tempPos);
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel(z => z === 'auto' ? Math.max(10, Math.round(actualScale * 100) - 10) : Math.max(10, (z as number) - 10));
      } else if (e.key === '=' || e.key === '+') {
        setZoomLevel(z => z === 'auto' ? Math.min(200, Math.round(actualScale * 100) + 10) : Math.min(200, (z as number) + 10));
      } else if (e.key === '0') {
        setZoomLevel('auto');
      } else if (e.key === 'ArrowLeft' && mode === 'slider') {
        setSliderPos(p => Math.round(Math.max(0, p - 5) * 100) / 100);
      } else if (e.key === 'ArrowRight' && mode === 'slider') {
        setSliderPos(p => Math.round(Math.min(100, p + 5) * 100) / 100);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, actualScale, beforeImage, afterImage, beforeLabel, afterLabel, beforeLabelPos, afterLabelPos]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before'|'after'|'logo') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      
      if (type === 'before' || type === 'after') {
        const img = new Image();
        img.onload = () => {
          const rt = img.width / img.height;
          setDetectedRatio(rt);
          if (!beforeImage && !afterImage) {
             if (rt > 1.2) setMode('vertical'); 
             else if (rt < 0.8) setMode('side-by-side');
             else setMode('slider');
          }
        };
        img.src = url;
      }

      if (type === 'before') setBeforeImage(url);
      if (type === 'after') setAfterImage(url);
      if (type === 'logo') setLogoImage(url);
    }
  };

  const exportImage = async (format: 'png' | 'jpeg', quality = 1) => {
    if (!canvasRef.current) return;
    try {
      const options = {
        backgroundColor: canvasBgColor, // applies the picked bg
        pixelRatio: 2, // High resolution
        quality,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      };

      let dataUrl;
      if (format === 'png') {
        dataUrl = await htmlToImage.toPng(canvasRef.current, options);
      } else {
        dataUrl = await htmlToImage.toJpeg(canvasRef.current, options);
      }

      const link = document.createElement('a');
      link.rel = 'noopener noreferrer';
      link.download = `before-after-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const exportVideo = async () => {
    if (!canvasRef.current || (mode !== 'slider' && mode !== 'fade')) return;
    setIsVideoExporting(true);
    setVideoExportProgress(0);

    try {
      const buffer = await exportVideoTask(
        canvasRef.current as HTMLDivElement,
        mode,
        { sliderPos, fadeOpacity },
        canvasBgColor,
        { duration: videoDuration, transition: transitionDuration },
        (p) => setVideoExportProgress(p)
      );

      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.rel = 'noopener noreferrer';
      link.download = `reflecto_export_${Date.now()}.mp4`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('Video export failed: ' + e.message);
    } finally {
      setIsVideoExporting(false);
      setVideoExportProgress(0);
    }
  };

  const exportGif = async () => {
    if (!canvasRef.current || (mode !== 'slider' && mode !== 'fade')) return;
    setIsGifExporting(true);
    setGifExportProgress(0);

    try {
      const buffer = await exportGifTask(
        canvasRef.current as HTMLDivElement,
        mode,
        { sliderPos, fadeOpacity },
        canvasBgColor,
        { duration: videoDuration, transition: transitionDuration, gifQuality },
        (p) => setGifExportProgress(p)
      );

      const blob = new Blob([buffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.rel = 'noopener noreferrer';
      link.download = `reflecto_export_${Date.now()}.gif`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('GIF export failed: ' + e.message);
    } finally {
      setIsGifExporting(false);
      setGifExportProgress(0);
    }
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await htmlToImage.toBlob(canvasRef.current, {
        backgroundColor: canvasBgColor,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      if (!blob) return;
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard.', err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uiScale = Math.max(0.1, canvasWidth / 1000);

  // Label style rendering utility
  const labelStyle = {
    fontFamily: labelFont,
    fontSize: `${labelSize * uiScale}px`,
    backgroundColor: labelBgColor,
    color: labelTextColor,
    borderRadius: `${labelRadius * uiScale}px`,
    padding: `${Math.max(4, labelSize * 0.2) * uiScale}px ${Math.max(8, labelSize * 0.5) * uiScale}px`,
  };

  let computedAspectRatio = aspectRatio;
  if (aspectRatio === 'auto' && detectedRatio) {
     if (mode === 'side-by-side') {
        computedAspectRatio = `${detectedRatio * 2}`;
     } else if (mode === 'vertical') {
        computedAspectRatio = `${detectedRatio / 2}`;
     } else {
        computedAspectRatio = `${detectedRatio}`;
     }
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row transition-colors duration-300 font-body bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between shrink-0 z-20 order-1 relative shadow-sm">
        <div className="flex flex-col">
          <h1 className="font-logo font-black tracking-[-0.04em] text-2xl text-[var(--foreground)] leading-none">
            reflecto<span className="text-[var(--color-accent)]">.</span>
          </h1>
          <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-[0.2em] mt-1.5 ml-0.5">Comparison Studio</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setZoomLevel('auto')}
             className={cn("w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center transition-colors shadow-sm", zoomLevel === 'auto' ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]")}
             title="Auto Fit (0)"
           >
             <Monitor className="w-4 h-4" />
           </button>
           <button 
             onClick={() => setIsDark(!isDark)}
             className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] hover:bg-[var(--border)] cursor-pointer transition-colors text-[var(--foreground)] shadow-sm"
           >
             {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
           </button>
        </div>
      </div>

      {/* Sidebar Panel */}
      <aside className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-r border-[var(--border)] bg-[var(--surface)] flex flex-col flex-1 md:flex-none md:h-screen order-3 md:order-1 relative z-20 overflow-hidden md:shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="hidden md:flex p-6 border-b border-[var(--border)] items-center justify-between z-10 shrink-0 relative bg-[var(--surface)]">
          <div className="flex flex-col">
            <h1 className="font-logo font-black tracking-[-0.04em] text-3xl text-[var(--foreground)] leading-none">
              reflecto<span className="text-[var(--color-accent)]">.</span>
            </h1>
            <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-[0.2em] leading-none mt-2 ml-1">Comparison Studio</p>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--border)] shadow-sm cursor-pointer transition-all active:scale-95 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex border-b border-[var(--border)] bg-transparent z-10 p-3 gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('media')} 
            className={cn("flex-1 py-2 px-3 text-[12px] font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ring-offset-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", activeTab === 'media' ? "bg-[var(--foreground)] text-[var(--background)] shadow-md" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50")}
          >
            <ImageIcon className="w-4 h-4" /> Media
          </button>
          <button 
            onClick={() => setActiveTab('layout')} 
            className={cn("flex-1 py-2 px-3 text-[12px] font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ring-offset-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", activeTab === 'layout' ? "bg-[var(--foreground)] text-[var(--background)] shadow-md" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50")}
          >
            <LayoutTemplate className="w-4 h-4" /> Layout
          </button>
          <button 
            onClick={() => setActiveTab('export')} 
            className={cn("flex-1 py-2 px-3 text-[12px] font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ring-offset-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", activeTab === 'export' ? "bg-[var(--foreground)] text-[var(--background)] shadow-md" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50")}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
          
          <div className={activeTab === 'media' ? 'block' : 'hidden'}>
            {/* Images Section */}
            <section className="p-5 border-b border-[var(--border)] relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Media Assets</span>
                <button 
                  onClick={() => {
                    setBeforeImage(afterImage);
                    setAfterImage(beforeImage);
                    setBeforeLabel(afterLabel);
                    setAfterLabel(beforeLabel);
                  }}
                  disabled={!beforeImage && !afterImage}
                  className="text-xs flex items-center gap-1.5 text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] px-2.5 py-1 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  title="Swap Before and After (Press 'S')"
                >
                  <ArrowLeftRight className="w-3 h-3 text-[var(--color-accent)]" /> Swap
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <UploadZone 
                  label="Before" 
                  image={beforeImage} 
                  onChange={(e) => handleFileUpload(e, 'before')} 
                  onRemove={() => setBeforeImage(null)} 
                  height="h-32"
                />
                <UploadZone 
                  label="After" 
                  image={afterImage} 
                  onChange={(e) => handleFileUpload(e, 'after')} 
                  onRemove={() => setAfterImage(null)} 
                  height="h-32"
                />
              </div>
            </section>

            {/* Image Adjustments Section */}
            {true && (
              <section className="p-5 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Image Adjustments</span>
                  <Toggle checked={showFilters} onChange={setShowFilters} />
                </div>
                {showFilters && (
                   <div className="space-y-4 mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--foreground)]">Before Image</span>
                          <button onClick={() => setBeforeFilters({brightness:100,contrast:100,saturate:100})} className="text-[10px] text-[var(--muted)] hover:text-[var(--color-accent)] uppercase font-bold tracking-wider transition-colors">Reset</button>
                        </div>
                        <div className="space-y-4">
                          <SliderControl label="Brightness" value={beforeFilters.brightness} min={0} max={200} onChange={v => setBeforeFilters(prev => ({...prev, brightness: v}))} unit="%" />
                          <SliderControl label="Contrast" value={beforeFilters.contrast} min={0} max={200} onChange={v => setBeforeFilters(prev => ({...prev, contrast: v}))} unit="%" />
                          <SliderControl label="Saturation" value={beforeFilters.saturate} min={0} max={200} onChange={v => setBeforeFilters(prev => ({...prev, saturate: v}))} unit="%" />
                        </div>
                      </div>

                      <div className="space-y-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                         <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--foreground)]">After Image</span>
                          <button onClick={() => setAfterFilters({brightness:100,contrast:100,saturate:100})} className="text-[10px] text-[var(--muted)] hover:text-[var(--color-accent)] uppercase font-bold tracking-wider transition-colors">Reset</button>
                        </div>
                        <div className="space-y-4">
                          <SliderControl label="Brightness" value={afterFilters.brightness} min={0} max={200} onChange={v => setAfterFilters(prev => ({...prev, brightness: v}))} unit="%" />
                          <SliderControl label="Contrast" value={afterFilters.contrast} min={0} max={200} onChange={v => setAfterFilters(prev => ({...prev, contrast: v}))} unit="%" />
                          <SliderControl label="Saturation" value={afterFilters.saturate} min={0} max={200} onChange={v => setAfterFilters(prev => ({...prev, saturate: v}))} unit="%" />
                        </div>
                      </div>
                   </div>
                )}
              </section>
            )}

            {/* Logo Section */}
            <section className="p-5 border-b border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--foreground)] mb-4 block tracking-wide uppercase">Watermark / Logo</span>
              <UploadZone label="Upload Logo (Optional)" image={logoImage} onChange={(e) => handleFileUpload(e, 'logo')} onRemove={() => setLogoImage(null)} height="h-20" />
              
              {logoImage && (
                <div className="space-y-5 mt-5 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <SliderControl label="Scale" value={logoSize} min={40} max={300} onChange={setLogoSize} unit="px" />
                  <SliderControl label="Opacity" value={logoOpacity} min={0} max={100} onChange={setLogoOpacity} unit="%" />
                  <SliderControl label="Padding Right" value={logoPaddingH} min={0} max={120} onChange={setLogoPaddingH} unit="px" />
                  <SliderControl label="Padding Bottom" value={logoPaddingV} min={0} max={120} onChange={setLogoPaddingV} unit="px" />
                </div>
              )}
            </section>
          </div>

          {/* LAYOUT TAB */}
          <div className={activeTab === 'layout' ? 'block' : 'hidden'}>
          {/* Mode Selection */}
          <section className="p-5 border-b border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--foreground)] mb-4 block tracking-wide uppercase">Layout Mode</span>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <ModeButton icon={<SlidersHorizontal/>} label="Slider" active={mode === 'slider'} onClick={() => setMode('slider')} />
              <ModeButton icon={<Layers/>} label="Side by Side" active={mode === 'side-by-side'} onClick={() => setMode('side-by-side')} />
              <ModeButton icon={<LayoutTemplate/>} label="Split View" active={mode === 'split'} onClick={() => setMode('split')} />
              <ModeButton icon={<SplitSquareHorizontal/>} label="Vertical Stack" active={mode === 'vertical'} onClick={() => setMode('vertical')} />
              <ModeButton icon={<MoreHorizontal/>} label="Fade Blend" active={mode === 'fade'} onClick={() => setMode('fade')} />
            </div>

            {/* Mode-specific controls */}
            {mode === 'slider' && (
              <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <SliderControl label="Divider Position" value={sliderPos} min={0} max={100} step={0.01} onChange={setSliderPos} unit="%" />
              </div>
            )}
            {mode === 'split' && (
              <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <SliderControl label="Cut Angle" value={splitAngle} min={-45} max={45} onChange={setSplitAngle} unit="°" />
              </div>
            )}
            {mode === 'fade' && (
              <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <SliderControl label="Blend (Before -> After)" value={fadeOpacity} min={0} max={100} onChange={setFadeOpacity} unit="%" />
              </div>
            )}
          </section>

          {/* Labels Section */}
          <section className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Label Designer</span>
              <Toggle checked={showLabels} onChange={setShowLabels} />
            </div>

            {showLabels && (
              <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                      <input type="text" value={beforeLabel} onChange={e => setBeforeLabel(e.target.value)}
                        className="input-dark w-full text-center font-medium" placeholder="Before" title="Saved as default automatically" />
                      <div className="flex flex-col items-center gap-2">
                        <GridSelector value={beforeLabelPos} onChange={setBeforeLabelPos} />
                        <span className="text-[10px] text-center text-[var(--muted)] leading-tight">Drag label in preview, or click grid to position</span>
                      </div>
                    </div>
                    <div className="space-y-3 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                      <input type="text" value={afterLabel} onChange={e => setAfterLabel(e.target.value)}
                        className="input-dark w-full text-center font-medium" placeholder="After" title="Saved as default automatically" />
                      <div className="flex flex-col items-center gap-2">
                        <GridSelector value={afterLabelPos} onChange={setAfterLabelPos} />
                        <span className="text-[10px] text-center text-[var(--muted)] leading-tight">Drag label in preview, or click grid to position</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                  <SliderControl label="Font Size" value={labelSize} min={10} max={48} onChange={setLabelSize} unit="px" />
                  
                  <div className="grid grid-cols-2 gap-4">
                     <SliderControl label="Radius" value={labelRadius} min={0} max={32} onChange={setLabelRadius} unit="px" />
                     <div className="flex flex-col gap-1.5 pt-1">
                        <label className="text-xs font-medium text-[var(--foreground)]">Text Color</label>
                        <div className="flex relative items-center gap-2">
                          <input type="color" value={labelTextColor} onChange={e => setLabelTextColor(e.target.value)}
                            className="w-[30px] h-[30px] rounded-md cursor-pointer border shadow-sm p-0 bg-[var(--surface)] shrink-0" />
                          <span className="text-xs font-mono uppercase text-[var(--muted)]">{labelTextColor}</span>
                        </div>
                     </div>
                     <div className="col-span-2 flex flex-col gap-2 border-t border-[var(--border)] pt-4 mt-1">
                        <label className="text-xs font-medium text-[var(--foreground)]">Background Color</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={labelBgColor.startsWith('#') ? labelBgColor.slice(0, 7) : '#000000'} onChange={e => setLabelBgColor(e.target.value)}
                             className="w-[34px] h-[34px] rounded-lg shrink-0 cursor-pointer border border-[var(--border)] shadow-sm p-0.5 bg-[var(--surface)]" />
                          <input type="text" value={labelBgColor} onChange={e => setLabelBgColor(e.target.value)}
                             className="input-dark flex-1" />
                        </div>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.8)', 'rgba(255, 255, 255, 0.5)', '#000000', '#ffffff', '#18181b', '#374151', '#6366f1'].map(color => (
                            <button key={color} onClick={() => setLabelBgColor(color)} className={cn("w-6 h-6 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-110 shadow-sm", labelBgColor === color && "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--surface)]")} style={{ backgroundColor: color }} title={color} />
                          ))}
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border)]">
                    <label className="text-xs font-medium text-[var(--foreground)]">Font Family</label>
                    <select value={labelFont} onChange={(e) => setLabelFont(e.target.value)}
                      className="input-dark w-full font-medium">
                      <option value="Inter">Inter</option>
                      <option value="Syne">Syne</option>
                      <option value="DM Sans">DM Sans</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Space Mono">Space Mono</option>
                      <option value="Raleway">Raleway</option>
                      <option value="Oswald">Oswald</option>
                      <option value="Lora">Lora</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Canvas Settings */}
          <section className="p-5">
            <span className="text-xs font-bold text-[var(--foreground)] mb-4 block tracking-wide uppercase">Canvas Settings</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--foreground)]">Width Preset</label>
                <select value={canvasWidth} onChange={(e) => setCanvasWidth(Number(e.target.value))}
                  className="input-dark font-medium">
                  <option value={800}>800px</option>
                  <option value={1000}>1000px</option>
                  <option value={1200}>1200px</option>
                  <option value={1600}>1600px</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--foreground)]">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
                  className="input-dark font-medium">
                  <option value="auto">Auto</option>
                  <option value="1/1">1:1 Square</option>
                  <option value="16/9">16:9 Landscape</option>
                  <option value="4/3">4:3 Standard</option>
                  <option value="9/16">9:16 Portrait</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm mt-5">
              <SliderControl label="Outer Padding" value={padding} min={0} max={120} onChange={setPadding} unit="px" />
              <SliderControl label="Inner Spacing" value={innerSpacing} min={0} max={120} onChange={setInnerSpacing} unit="px" />
              <div className="border-t border-[var(--border)] pt-4 mt-2 mb-2"></div>
              <SliderControl label="Corner Radius" value={imageRadius} min={0} max={64} onChange={setImageRadius} unit="px" />
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[11px] font-semibold text-[var(--foreground)] tracking-wide uppercase">Image Fit</label>
                <select value={objectFit} onChange={(e) => setObjectFit(e.target.value as 'cover' | 'contain')}
                  className="input-dark text-sm">
                  <option value="cover">Fill (Cover)</option>
                  <option value="contain">Fit (Contain)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <label className="text-[11px] font-semibold text-[var(--foreground)] tracking-wide uppercase">Canvas Background</label>
              <div className="flex gap-3 items-center bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                <input type="color" value={canvasBgColor} onChange={e => setCanvasBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg shrink-0 cursor-pointer border border-[var(--border)] p-0.5 bg-[var(--surface)] shadow-sm" />
                <input type="text" value={canvasBgColor} onChange={e => setCanvasBgColor(e.target.value)}
                  className="input-dark flex-1 font-mono uppercase text-xs" />
              </div>
              <div className="flex gap-2.5 mt-1 px-1">
                {['#000000', '#0f0f0f', '#18181b', '#374151', '#ffffff', '#f8fafc', '#6366f1'].map(color => (
                  <button key={color} onClick={() => setCanvasBgColor(color)} className={cn("w-6 h-6 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-110 shadow-sm", canvasBgColor === color && "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--background)]")} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </section>
          </div>

          {/* EXPORT TAB */}
          <div className={activeTab === 'export' ? 'block p-4 md:p-6 space-y-4' : 'hidden'}>
            
            <div className="space-y-3 bg-[var(--background)] p-4 rounded-xl border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--foreground)] mb-1 block uppercase tracking-wider">Image Export</span>
              <button 
                onClick={() => exportImage('png')} 
                disabled={!beforeImage && !afterImage || isVideoExporting || isGifExporting}
                className="w-full btn-accent py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Export High-Res PNG
              </button>

              <div className="flex gap-2.5">
                <div className="flex flex-1 flex-col relative group">
                  <button 
                    onClick={() => exportImage('jpeg', jpegQuality / 100)} 
                    disabled={!beforeImage && !afterImage || isVideoExporting || isGifExporting}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-[var(--foreground)] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" /> JPG
                  </button>
                  {/* Quality popover on hover */}
                   <div className="absolute bottom-full left-0 hidden group-hover:block focus-within:block w-40 pb-2 origin-bottom animate-in zoom-in-95 duration-200 z-50">
                     <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-xl flex flex-col">
                       <label className="text-xs text-[var(--foreground)] font-semibold flex justify-between items-center mb-3">
                         Quality <span className="text-[var(--muted)]">{jpegQuality}%</span>
                       </label>
                       <input type="range" min="60" max="100" value={jpegQuality} onChange={e => setJpegQuality(Number(e.target.value))} className="range-slider w-full cursor-pointer" />
                     </div>
                   </div>
                </div>
                <button 
                  onClick={copyToClipboard} 
                  disabled={!beforeImage && !afterImage || isVideoExporting || isGifExporting || isCopied}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-[var(--foreground)] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCopied ? <span className="text-green-500 flex items-center gap-2 mx-auto"><Download className="w-4 h-4 hidden" />Copied!</span> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>

            {(mode === 'slider' || mode === 'fade') && (
              <div className="space-y-5 bg-[var(--background)] p-5 rounded-xl border border-[var(--border)] relative overflow-hidden group/video">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover/video:scale-110 transition-transform duration-500">
                  <Video className="w-16 h-16" />
                </div>
                <span className="text-xs font-bold text-[var(--foreground)] mb-1 block uppercase tracking-wide">Video & GIF Export</span>
                
                <div className="space-y-5 relative z-10">
                  <SliderControl label="Total Length" value={videoDuration} min={1} max={30} step={1} onChange={setVideoDuration} unit="s" />
                  <SliderControl label="Sweep Time (Speed)" value={transitionDuration} min={0.2} max={10} step={0.1} onChange={setTransitionDuration} unit="s" />
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-[var(--foreground)] uppercase tracking-wider">GIF Quality</label>
                    <div className="flex gap-1.5 bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--border)] shadow-inner">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <button key={q} onClick={() => setGifQuality(q)} className={cn("flex-1 py-1.5 text-xs font-bold capitalize rounded-md transition-all duration-300", gifQuality === q ? "bg-[var(--background)] shadow-sm text-[var(--foreground)] ring-1 ring-[var(--border)]" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50")}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-[var(--border)] relative z-10 w-full">
                  <button 
                    onClick={exportVideo} 
                    disabled={!beforeImage && !afterImage || isVideoExporting || isGifExporting}
                    className="w-full relative overflow-hidden group/btn bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)]"
                  >
                    {isVideoExporting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Rendering MP4... {videoExportProgress.toFixed(0)}%</>
                    ) : (
                      <><Video className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Export MP4</>
                    )}
                  </button>

                  <button 
                    onClick={exportGif} 
                    disabled={!beforeImage && !afterImage || isVideoExporting || isGifExporting}
                    className="w-full bg-[var(--surface)] border-2 border-pink-500/30 hover:border-pink-500 hover:text-pink-600 dark:hover:text-pink-400 text-[var(--foreground)] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-[0_4px_16px_rgba(236,72,153,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  >
                    {isGifExporting ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-pink-500" /> Rendering GIF... {gifExportProgress.toFixed(0)}%</>
                    ) : (
                      <><ImageIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform text-pink-500" /> Export GIF</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="w-full h-[50dvh] md:h-auto md:flex-1 flex flex-col relative overflow-hidden bg-[var(--background)] canvas-preview text-sm order-2 md:order-2 shrink-0 border-b md:border-b-0 border-[var(--border)] min-h-0 min-w-0 shadow-inner">
        <header className="h-16 border-b border-[var(--border)] flex items-center justify-between px-8 bg-[var(--surface)]/90 backdrop-blur-xl absolute top-0 left-0 right-0 z-20 hidden md:flex shadow-sm">
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] bg-[var(--background)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
              <Maximize className="w-3.5 h-3.5" /> <span className="text-[var(--foreground)]">{canvasWidth}px</span> Output
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <Layers className="w-3.5 h-3.5" /> Canvas Preview
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-lg p-1 shadow-sm">
             <button onClick={() => setZoomLevel(z => z === 'auto' ? Math.max(10, Math.round(actualScale * 100) - 10) : Math.max(10, (z as number) - 10))} className="p-1.5 hover:bg-[var(--surface)] hover:shadow-sm rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-all active:scale-95" title="Zoom Out (-)"><ZoomOut className="w-4 h-4" /></button>
             <button onClick={() => setZoomLevel('auto')} className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-all active:scale-95 flex items-center gap-1.5", zoomLevel === 'auto' ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm border border-[var(--border)]" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]")} title="Auto Fit (0)">
               <Monitor className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Fit</span>
             </button>
             <span className="text-xs font-mono font-medium w-14 text-center text-[var(--foreground)] select-none bg-[var(--surface)] py-1 rounded-md border border-[var(--border)] shadow-inner mx-1">{Math.round(actualScale * 100)}%</span>
             <button onClick={() => setZoomLevel(z => z === 'auto' ? Math.min(200, Math.round(actualScale * 100) + 10) : Math.min(200, (z as number) + 10))} className="p-1.5 hover:bg-[var(--surface)] hover:shadow-sm rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-all active:scale-95" title="Zoom In (+)"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </header>
        
        <div ref={previewContainerRef} className={cn("flex-1 flex items-center justify-center relative w-full h-full min-w-0 min-h-0", zoomLevel === 'auto' ? "overflow-hidden p-2 md:p-4 md:pt-[72px]" : "overflow-auto p-4 md:p-12 md:pt-28")}>
          
          {(!beforeImage && !afterImage) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
               <ImageOff className="w-16 h-16 mb-4 opacity-30 dark:opacity-20 text-[var(--muted)]" />
               <h3 className="font-heading font-extrabold tracking-tight text-2xl text-[var(--foreground)] mb-2">Ready to Compare</h3>
               <p className="text-sm font-body text-[var(--muted)] opacity-80 max-w-xs text-center">Upload two images from the left panel to start creating your stunning before/after comparison.</p>
            </div>
          )}

          {/* Canvas Wrapper - only hidden if no images */}
          <div 
            className={cn("relative mx-auto my-auto z-10", zoomLevel !== 'auto' && "transition-all duration-200 ease-out")}
            style={{ 
              width: canvasWidth * actualScale, 
              height: canvasHeight * actualScale 
            }}
          >
            <div 
               ref={canvasRef}
               className={cn("absolute top-0 left-0 shadow-2xl flex ring-1 ring-[var(--border)]", zoomLevel !== 'auto' && "transition-transform duration-300 ease-out", (!beforeImage && !afterImage) ? "opacity-0" : "opacity-100")}
               style={{
                 width: `${canvasWidth}px`,
                 transform: `scale(${actualScale})`,
                 transformOrigin: 'top left',
                 backgroundColor: canvasBgColor,
                 padding: `${padding}px`,
               }}
            >
               <div  
                 className="relative w-full h-full" style={{ aspectRatio: computedAspectRatio !== 'auto' ? computedAspectRatio : undefined, minHeight: computedAspectRatio === 'auto' ? '300px' : undefined }}
                 id="export-canvas"
               >
                {/* Mode Layouts */}
                <div className="relative w-full h-full flex items-stretch min-h-[400px]">
                  
                  {/* --- SLIDER MODE --- */}
                  {mode === 'slider' && (
                    <div className="relative w-full select-none flex items-stretch overflow-hidden bg-[var(--surface)]" style={{ borderRadius: `${imageRadius}px` }}>
                      {/* Base Image (After) */}
                      <div className="absolute inset-0 w-full h-full bg-[var(--background)]">
                        {afterImage && <PanZoomImage src={afterImage} alt="After" className={cn("w-full h-full block", objectFit === 'contain' ? "object-contain" : "object-cover")} draggable={false} style={afterFilterStyle} transform={afterTransform} setTransform={setAfterTransform} />}
                        {showLabels && afterImage && (
                          <DraggableLabel text={afterLabel} style={labelStyle} pos={afterLabelPos} onPosChange={setAfterLabelPos} opacity={sliderPos < 85 ? 1 : 0} />
                        )}
                      </div>
                      
                      {/* Better clipping via clip-path */}
                      <div id="capture-clip-path" className="absolute inset-0 pointer-events-none w-full h-full bg-[var(--background)]" style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}>
                         {beforeImage && <PanZoomImage src={beforeImage} alt="Before" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} draggable={false} style={beforeFilterStyle} transform={beforeTransform} setTransform={setBeforeTransform} />}
                         {showLabels && beforeImage && (
                           <DraggableLabel id="capture-before-label" text={beforeLabel} style={labelStyle} pos={beforeLabelPos} onPosChange={setBeforeLabelPos} opacity={sliderPos > 15 ? 1 : 0} />
                         )}
                      </div>

                      {/* Slider Handle */}
                      <div 
                        id="capture-slider-handle"
                        className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="bg-white" style={{ width: `${Math.max(2, 2 * uiScale)}px`, height: '100%', boxShadow: `0 0 ${8 * uiScale}px rgba(0,0,0,0.5)` }}></div>
                        <div className="absolute bg-white rounded-full flex items-center justify-center text-gray-800 pointer-events-auto cursor-ew-resize hover:scale-110 transition-transform" 
                             style={{ 
                               width: `${Math.max(32, 40 * uiScale)}px`, 
                               height: `${Math.max(32, 40 * uiScale)}px`, 
                               boxShadow: `0 0 ${12 * uiScale}px rgba(0,0,0,0.4)` 
                             }} 
                             onMouseDown={handleDragStart} 
                             onTouchStart={handleDragStart}>
                          <svg width={`${Math.max(16, 20 * uiScale)}`} height={`${Math.max(16, 20 * uiScale)}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18-6-6 6-6"/><path d="m15 6 6 6-6 6"/></svg>
                        </div>
                      </div>

                      {/* Labels */}
                    </div>
                  )}

                  {/* --- SIDE BY SIDE MODE --- */}
                  {mode === 'side-by-side' && (
                    <div className="flex w-full h-full min-h-[400px]" style={{ gap: `${innerSpacing}px` }}>
                      <div className="w-1/2 relative bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                         {beforeImage && <PanZoomImage src={beforeImage} alt="Before" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={beforeFilterStyle} transform={beforeTransform} setTransform={setBeforeTransform} />}
                         {showLabels && beforeImage && (
                           <DraggableLabel text={beforeLabel} style={labelStyle} pos={beforeLabelPos} onPosChange={setBeforeLabelPos} />
                         )}
                      </div>
                      <div className="w-1/2 relative bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                         {afterImage && <PanZoomImage src={afterImage} alt="After" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={afterFilterStyle} transform={afterTransform} setTransform={setAfterTransform} />}
                         {showLabels && afterImage && (
                           <DraggableLabel text={afterLabel} style={labelStyle} pos={afterLabelPos} onPosChange={setAfterLabelPos} />
                         )}
                      </div>
                    </div>
                  )}

                  {/* --- VERTICAL STACK MODE --- */}
                  {mode === 'vertical' && (
                    <div className="flex flex-col w-full min-h-[600px]" style={{ gap: `${innerSpacing}px` }}>
                      <div className="h-1/2 relative bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                         {beforeImage && <PanZoomImage src={beforeImage} alt="Before" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={beforeFilterStyle} transform={beforeTransform} setTransform={setBeforeTransform} />}
                         {showLabels && beforeImage && (
                           <DraggableLabel text={beforeLabel} style={labelStyle} pos={beforeLabelPos} onPosChange={setBeforeLabelPos} />
                         )}
                      </div>
                      <div className="h-1/2 relative bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                         {afterImage && <PanZoomImage src={afterImage} alt="After" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={afterFilterStyle} transform={afterTransform} setTransform={setAfterTransform} />}
                         {showLabels && afterImage && (
                           <DraggableLabel text={afterLabel} style={labelStyle} pos={afterLabelPos} onPosChange={setAfterLabelPos} />
                         )}
                      </div>
                    </div>
                  )}

                  {/* --- SPLIT DIAGONAL MODE --- */}
                  {mode === 'split' && (
                     <div className="relative w-full h-full select-none bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                        <div className="absolute inset-0 w-full h-full">
                          {afterImage && <PanZoomImage src={afterImage} alt="After" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={afterFilterStyle} transform={afterTransform} setTransform={setAfterTransform} />}
                        </div>
                        <div className="absolute inset-0 w-full h-full bg-[var(--surface)] pointer-events-none" style={{ 
                           clipPath: `polygon(0 0, ${50 + splitAngle}% 0, ${50 - splitAngle}% 100%, 0 100%)`
                        }}>
                          {beforeImage && <PanZoomImage src={beforeImage} alt="Before" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={beforeFilterStyle} transform={beforeTransform} setTransform={setBeforeTransform} />}
                        </div>
                        {/* Divider Line */}
                        <div className="absolute inset-0 pointer-events-none w-full h-full" style={{ overflow: 'hidden' }}>
                           <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <line x1={`${50 + splitAngle}`} y1="0" x2={`${50 - splitAngle}`} y2="100" stroke="white" strokeWidth="0.5" />
                           </svg>
                        </div>
                        {showLabels && afterImage && (
                          <DraggableLabel text={afterLabel} style={labelStyle} pos={afterLabelPos} onPosChange={setAfterLabelPos} />
                        )}
                        {showLabels && beforeImage && (
                           <DraggableLabel text={beforeLabel} style={labelStyle} pos={beforeLabelPos} onPosChange={setBeforeLabelPos} />
                        )}
                     </div>
                  )}

                  {/* --- FADE BLEND MODE --- */}
                  {mode === 'fade' && (
                    <div className="relative w-full h-full bg-[var(--surface)] overflow-hidden" style={{ borderRadius: `${imageRadius}px` }}>
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                         {beforeImage && <PanZoomImage src={beforeImage} alt="Before" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={beforeFilterStyle} transform={beforeTransform} setTransform={setBeforeTransform} />}
                      </div>
                      <div id="capture-fade" className="absolute inset-0 w-full h-full transition-opacity duration-75 pointer-events-none" style={{ opacity: fadeOpacity / 100 }}>
                         {afterImage && <PanZoomImage src={afterImage} alt="After" className={cn("w-full h-full block pointer-events-auto", objectFit === 'contain' ? "object-contain" : "object-cover")} style={afterFilterStyle} transform={afterTransform} setTransform={setAfterTransform} />}
                      </div>
                      {showLabels && beforeImage && (
                         <DraggableLabel id="capture-before-label" text={beforeLabel} style={labelStyle} pos={beforeLabelPos} onPosChange={setBeforeLabelPos} opacity={1 - fadeOpacity/100} />
                      )}
                      {showLabels && afterImage && (
                         <DraggableLabel id="capture-after-label" text={afterLabel} style={labelStyle} pos={afterLabelPos} onPosChange={setAfterLabelPos} opacity={fadeOpacity/100} />
                      )}
                    </div>
                  )}

                </div>

                {/* Optional Watermark Logo */}
                {logoImage && (
                  <div 
                    className="absolute z-30 pointer-events-none" 
                    style={{ 
                      bottom: `${logoPaddingV}px`, 
                      right: `${logoPaddingH}px`,
                      opacity: logoOpacity / 100,
                      width: `${logoSize}px`,
                    }}
                  >
                    <img src={logoImage} alt="Logo" className="w-full h-auto drop-shadow-md" />
                  </div>
                )}
                
             </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Subcomponents for minimal UI styling

function UploadZone({ label, image, onChange, onRemove, onResetPos, height = "h-32" }: { label: string, image: string | null, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void, onResetPos?: () => void, height?: string }) {
  return (
    <div className="flex flex-col w-full">
      <span className="text-xs font-semibold text-[var(--foreground)] mb-2 flex items-center justify-between">
        {label}
        {image && onResetPos && (
          <button onClick={onResetPos} className="text-[10px] text-[var(--muted)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1" title="Reset Image Position">
            <Maximize className="w-3 h-3" /> Reset Pos
          </button>
        )}
      </span>
      <div className={cn("relative group w-full border border-dashed border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--color-accent)] transition-all duration-300 bg-[var(--background)]", height)}>
        {image ? (
          <>
            <img src={image} alt={label} className="w-full h-full object-cover scale-[1.01] transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <label className="w-10 h-10 bg-white/90 hover:bg-white text-black rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-105 shadow-xl">
                <ImageIcon className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onChange} />
              </label>
              <button onClick={onRemove} className="w-10 h-10 bg-red-500/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-xl">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-[var(--muted)] hover:text-[var(--color-accent)] transition-all duration-300 hover:bg-[var(--surface)] hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center justify-center mb-3 group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:border-transparent transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Upload Image</span>
            <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/gif" onChange={onChange} />
          </label>
        )}
      </div>
    </div>
  );
}

function ModeButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all duration-300",
        active 
          ? "bg-[var(--surface)] border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_2px_12px_rgba(99,102,241,0.12)] ring-1 ring-[var(--color-accent)]/20" 
          : "bg-[var(--background)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      )}
    >
      <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function SliderControl({ label, value, min, max, step, onChange, unit = "" }: { label: string, value: number, min: number, max: number, step?: number, onChange: (v: number) => void, unit?: string }) {
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
        onChange={(e) => onChange(Number(e.target.value))} 
        className="range-slider"
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
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
}

function GridSelector({ value, onChange }: { value: { x: string, y: string }, onChange: (v: any) => void }) {
  const cells = [
    { x: 'left', y: 'top' }, { x: 'center', y: 'top' }, { x: 'right', y: 'top' },
    { x: 'left', y: 'center' }, { x: 'center', y: 'center' }, { x: 'right', y: 'center' },
    { x: 'left', y: 'bottom' }, { x: 'center', y: 'bottom' }, { x: 'right', y: 'bottom' }
  ];
  return (
    <div className="grid grid-cols-3 gap-[2px] w-full aspect-square max-w-[80px] bg-[var(--surface)] border border-[var(--border)] p-[3px] rounded-md shadow-sm">
      {cells.map((c, i) => (
        <button 
          key={i} 
          onClick={() => onChange(c)}
          title={`${c.y} ${c.x}`}
          className={cn(
            "w-full h-full rounded-[3px] transition-colors", 
            value.x === c.x && value.y === c.y ? "bg-[var(--color-accent)]" : "bg-black/5 dark:bg-white/5 hover:bg-[var(--border)]"
          )}
        />
      ))}
    </div>
  )
}

function DraggableLabel({
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
  pos: { x: string; y: string };
  onPosChange: (pos: any) => void;
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

      let newX = 'center';
      if (dropX < parentRectAfter.width / 3) newX = 'left';
      else if (dropX > (parentRectAfter.width * 2) / 3) newX = 'right';

      let newY = 'center';
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
        onPointerDown={handlePointerDown}
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
}

function PanZoomImage({
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
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
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
}
