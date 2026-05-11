import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import * as htmlToImage from 'html-to-image';
import { easeInOutSine, getPositionForFrame, applyDOMStateFade, applyDOMStateSlider } from './utils';

export async function exportVideoTask(
  container: HTMLDivElement,
  mode: string,
  initialPcts: { sliderPos: number, fadeOpacity: number },
  bgColor: string,
  timing: { duration: number, transition: number },
  onProgress: (progress: number) => void
) {
  if (!('VideoEncoder' in window)) {
    throw new Error('Your browser does not support Video Encoding (WebCodecs API). Please try a modern browser like Chrome or Edge.');
  }

  let width = Math.floor(container.offsetWidth / 2) * 2;
  let height = Math.floor(container.offsetHeight / 2) * 2;

  let scale = 1;
  const maxDim = Math.max(width, height);
  if (maxDim > 1920) {
    scale = 1920 / maxDim;
    width = Math.floor((width * scale) / 2) * 2;
    height = Math.floor((height * scale) / 2) * 2;
  }

  const fps = 30;
  const duration = Math.max(1, timing.duration || 4);
  const totalFrames = fps * duration;
  
  const sweepTime = Math.max(0.1, timing.transition || 1);
  const cycleTime = sweepTime * 2;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory'
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { 
      console.error(e);
      encoderError = e;
    }
  });

  encoder.configure({
    codec: 'avc1.4d0033', // Main profile, Level 5.1
    width,
    height,
    bitrate: 4_000_000, // 4Mbps
    framerate: fps
  });




  // Optimize: Pre-render Before and After frames using htmlToImage ONCE
  let beforeCanvas: HTMLCanvasElement;
  let afterCanvas: HTMLCanvasElement;

  const captureOpts = {
    pixelRatio: scale,
    backgroundColor: bgColor,
    style: { transform: 'scale(1)', transformOrigin: 'top left' },
    filter: (node: HTMLElement) => {
      // Exclude the slider handle so we can draw it sharply with HD canvas
      if (node.id === 'capture-slider-handle') return false;
      return true;
    }
  };

  if (mode === 'slider') {
    applyDOMStateSlider(container, 1); // 100% (Before fully visible)
    await new Promise(r => requestAnimationFrame(r));
    beforeCanvas = await htmlToImage.toCanvas(container, captureOpts);

    applyDOMStateSlider(container, 0); // 0% (After fully visible)
    await new Promise(r => requestAnimationFrame(r));
    afterCanvas = await htmlToImage.toCanvas(container, captureOpts);
  } else if (mode === 'fade') {
    applyDOMStateFade(container, 0); // Before fully visible
    await new Promise(r => requestAnimationFrame(r));
    beforeCanvas = await htmlToImage.toCanvas(container, captureOpts);

    applyDOMStateFade(container, 1); // After fully visible
    await new Promise(r => requestAnimationFrame(r));
    afterCanvas = await htmlToImage.toCanvas(container, captureOpts);
  } else {
    throw new Error('Unsupported mode for video export');
  }

  // Create a working canvas for compositing the video frames manually. 
  // This is ~100x faster than calling htmlToImage for every frame.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context creation failed");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Pre-calculate slider UI dimensions
  const uiScale = width / 1000;
  const handleThickness = Math.max(2, 2 * uiScale);
  const radius = Math.max(16, 20 * uiScale);
  const shadowBlur = 8 * uiScale;
  const shadowOffsetY = 2 * uiScale;
  const arrowSize = radius * 0.4;

  for (let i = 0; i < totalFrames; i++) {
    if (encoderError) throw encoderError;
    if (encoder.state !== 'configured') {
      throw new Error('Video encoder is not configured properly or closed unexpectedly.');
    }

    const p = getPositionForFrame(i, fps, cycleTime, sweepTime);
    
    ctx.clearRect(0, 0, width, height);

    if (mode === 'slider') {
      // Base layer: After
      ctx.drawImage(afterCanvas, 0, 0, width, height);

      // Mask layer: Before
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * p, height);
      ctx.clip();
      ctx.drawImage(beforeCanvas, 0, 0, width, height);
      ctx.restore();

      // Draw the Slider Handle
      if (p > 0 && p < 1) {
        const handleX = width * p;
        
        ctx.fillStyle = 'white';
        // Vertical line
        ctx.fillRect(handleX - handleThickness / 2, 0, handleThickness, height);
        
        // Handle circle
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.beginPath();
        ctx.arc(handleX, height / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.shadowColor = 'transparent'; // reset
        
        // Handle arrows (simple dark gray)
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
       // Base Layer: Before
       ctx.drawImage(beforeCanvas, 0, 0, width, height);

       // Fade overlay: After
       if (p > 0) {
         ctx.globalAlpha = p;
         ctx.drawImage(afterCanvas, 0, 0, width, height);
         ctx.globalAlpha = 1; // reset
       }
    }

    // Give UI thread a small break to update progresses every few frames
    if (i % 15 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    const timestamp = (i * 1000000) / fps;
    const frame = new VideoFrame(canvas, { timestamp });
    encoder.encode(frame, { keyFrame: i % fps === 0 });
    frame.close();

    onProgress((i / totalFrames) * 100);
  }

  await encoder.flush();
  muxer.finalize();

  // Reset original DOM state safely
  if (mode === 'slider') {
    const clip = container.querySelector('#capture-clip-path') as HTMLElement;
    if (clip) clip.style.transition = '';
    
    applyDOMStateSlider(container, initialPcts.sliderPos / 100);
    const handle = container.querySelector('#capture-slider-handle') as HTMLElement;
    if (handle) handle.style.left = `${initialPcts.sliderPos}%`;
  } else if (mode === 'fade') {
    const fade = container.querySelector('#capture-fade') as HTMLElement;
    if (fade) fade.style.transition = '';
    
    applyDOMStateFade(container, initialPcts.fadeOpacity / 100);
  }
  
  const beforeLabel = container.querySelector('#capture-before-label') as HTMLElement;
  const afterLabel = container.querySelector('#capture-after-label') as HTMLElement;
  if (beforeLabel) beforeLabel.style.transition = '';
  if (afterLabel) afterLabel.style.transition = '';

  return muxer.target.buffer;
}
