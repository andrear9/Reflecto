import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Easing function (in-out sine)
export function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export const getPositionForFrame = (i: number, fps: number, cycleTime: number, sweepTime: number) => {
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

export const applyDOMStateFade = (container: HTMLElement, p: number) => {
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
};

export const applyDOMStateSlider = (container: HTMLElement, p: number) => {
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
};
