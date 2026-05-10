import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import * as htmlToImage from 'html-to-image';

// Easing function (in-out sine)
function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export async function exportGifTask(
  container: HTMLDivElement,
  mode: string,
  initialPcts: { sliderPos: number, fadeOpacity: number },
  bgColor: string,
  timing: { duration: number, transition: number, gifQuality?: 'low' | 'medium' | 'high' },
  onProgress: (progress: number) => void
) {
  let width = Math.floor(container.offsetWidth / 2) * 2;
  let height = Math.floor(container.offsetHeight / 2) * 2;

  let maxAllowed = 1000;
  let fps = 15;
  let maxColors = 256;

  if (timing.gifQuality === 'low') {
    maxAllowed = 600;
    fps = 10;
    maxColors = 128;
  } else if (timing.gifQuality === 'high') {
    maxAllowed = 1400;
    fps = 20;
  }

  let scale = 1;
  const maxDim = Math.max(width, height);
  if (maxDim > maxAllowed) {
    scale = maxAllowed / maxDim;
    width = Math.floor((width * scale) / 2) * 2;
    height = Math.floor((height * scale) / 2) * 2;
  }

  const duration = Math.max(1, timing.duration || 4);
  const totalFrames = fps * duration;
  
  const sweepTime = Math.max(0.1, timing.transition || 1);
  const cycleTime = sweepTime * 2;

  // Calculate position p (0 to 1) based on frame index
  const getPositionForFrame = (i: number) => {
    const t = i / fps;
    const tInCycle = t % cycleTime;
    
    let linearP;
    if (tInCycle < sweepTime) {
      linearP = tInCycle / sweepTime;
    } else {
      linearP = 1 - ((tInCycle - sweepTime) / sweepTime);
    }
    return easeInOutSine(linearP);
  };

  const applyDOMStateFade = (p: number) => {
      const fade = container.querySelector('#capture-fade') as HTMLElement;
      if (fade) {
        fade.style.transition = 'none';
        fade.style.opacity = (p).toString();
      }

      const beforeLabel = container.querySelector('#capture-before-label') as HTMLElement;
      const afterLabel = container.querySelector('#capture-after-label') as HTMLElement;
      if (beforeLabel) {
        beforeLabel.style.transition = 'none';
        beforeLabel.style.opacity = (1 - p).toString();
      }
      if (afterLabel) {
        afterLabel.style.transition = 'none';
        afterLabel.style.opacity = (p).toString();
      }
  }
  const applyDOMStateSlider = (p: number) => {
      const pct = p * 100;
      const clip = container.querySelector('#capture-clip-path') as HTMLElement;
      if (clip) {
        clip.style.transition = 'none';
        clip.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      }
      
      const beforeLabel = container.querySelector('#capture-before-label') as HTMLElement;
      const afterLabel = container.querySelector('#capture-after-label') as HTMLElement;
      if (beforeLabel) {
        beforeLabel.style.transition = 'none';
        beforeLabel.style.opacity = p > 0.15 ? '1' : '0';
      }
      if (afterLabel) {
        afterLabel.style.transition = 'none';
        afterLabel.style.opacity = p < 0.85 ? '1' : '0';
      }
  }

  // Pre-render Before and After frames using htmlToImage ONCE
  let beforeCanvas: HTMLCanvasElement;
  let afterCanvas: HTMLCanvasElement;

  const captureOpts = {
    pixelRatio: scale,
    backgroundColor: bgColor,
    style: { transform: 'scale(1)', transformOrigin: 'top left' },
    filter: (node: HTMLElement) => {
      if (node.id === 'capture-slider-handle') return false;
      return true;
    }
  };

  if (mode === 'slider') {
    applyDOMStateSlider(1); // 100% (Before fully visible)
    await new Promise(r => requestAnimationFrame(r));
    beforeCanvas = await htmlToImage.toCanvas(container, captureOpts);

    applyDOMStateSlider(0); // 0% (After fully visible)
    await new Promise(r => requestAnimationFrame(r));
    afterCanvas = await htmlToImage.toCanvas(container, captureOpts);
  } else if (mode === 'fade') {
    applyDOMStateFade(0); // Before fully visible
    await new Promise(r => requestAnimationFrame(r));
    beforeCanvas = await htmlToImage.toCanvas(container, captureOpts);

    applyDOMStateFade(1); // After fully visible
    await new Promise(r => requestAnimationFrame(r));
    afterCanvas = await htmlToImage.toCanvas(container, captureOpts);
  } else {
    throw new Error('Unsupported mode for GIF export');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context creation failed");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const format = "rgb565"; 
  const gif = GIFEncoder();

  // Pre-calculate slider UI dimensions
  const uiScale = width / 1000;
  const handleThickness = Math.max(2, 2 * uiScale);
  const radius = Math.max(16, 20 * uiScale);
  const shadowBlur = 8 * uiScale;
  const shadowOffsetY = 2 * uiScale;
  const arrowSize = radius * 0.4;

  for (let i = 0; i < totalFrames; i++) {
    const p = getPositionForFrame(i);
    
    ctx.clearRect(0, 0, width, height);

    if (mode === 'slider') {
      ctx.drawImage(afterCanvas, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * p, height);
      ctx.clip();
      ctx.drawImage(beforeCanvas, 0, 0, width, height);
      ctx.restore();

      if (p > 0 && p < 1) {
        const handleX = width * p;
        ctx.fillStyle = 'white';
        ctx.fillRect(handleX - handleThickness / 2, 0, handleThickness, height);
        
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.beginPath();
        ctx.arc(handleX, height / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.shadowColor = 'transparent'; 
        
        ctx.fillStyle = '#4a5568';
        ctx.beginPath();
        ctx.moveTo(handleX - arrowSize, height / 2);
        ctx.lineTo(handleX - arrowSize / 3, height / 2 - arrowSize / 1.5);
        ctx.lineTo(handleX - arrowSize / 3, height / 2 + arrowSize / 1.5);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(handleX + arrowSize, height / 2);
        ctx.lineTo(handleX + arrowSize / 3, height / 2 - arrowSize / 1.5);
        ctx.lineTo(handleX + arrowSize / 3, height / 2 + arrowSize / 1.5);
        ctx.fill();
      }
    } else if (mode === 'fade') {
       ctx.drawImage(beforeCanvas, 0, 0, width, height);
       if (p > 0) {
         ctx.globalAlpha = p;
         ctx.drawImage(afterCanvas, 0, 0, width, height);
         ctx.globalAlpha = 1; 
       }
    }

    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Create palette per frame (can be optimized but better quality)
    const palette = quantize(data, maxColors, { format });
    const index = applyPalette(data, palette, format);

    gif.writeFrame(index, width, height, { palette, delay: 1000 / fps });

    onProgress((i / totalFrames) * 100);
  }

  gif.finish();
  const buffer = gif.bytesView();

  // Reset original DOM state safely
  if (mode === 'slider') {
    const clip = container.querySelector('#capture-clip-path') as HTMLElement;
    if (clip) clip.style.transition = '';
    
    applyDOMStateSlider(initialPcts.sliderPos / 100);
    const handle = container.querySelector('#capture-slider-handle') as HTMLElement;
    if (handle) handle.style.left = `${initialPcts.sliderPos}%`;
  } else if (mode === 'fade') {
    const fade = container.querySelector('#capture-fade') as HTMLElement;
    if (fade) fade.style.transition = '';
    
    applyDOMStateFade(initialPcts.fadeOpacity / 100);
  }
  
  const beforeLabel = container.querySelector('#capture-before-label') as HTMLElement;
  const afterLabel = container.querySelector('#capture-after-label') as HTMLElement;
  if (beforeLabel) beforeLabel.style.transition = '';
  if (afterLabel) afterLabel.style.transition = '';

  return buffer;
}
