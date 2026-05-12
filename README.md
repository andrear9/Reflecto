<div align="center">
  <img src="./public/reflecto-logo.png" alt="Reflecto Logo" height="100" />

  <h3>A privacy-first studio for beautiful before & after comparisons.</h3>
  <p>Frame, label, and export — entirely in your browser. No uploads. No servers. No limits.</p>

  <p>
    <a href="https://github.com/andrear9/reflecto/releases"><img src="https://img.shields.io/github/v/release/andrear9/reflecto?style=flat-square&color=6366f1" alt="Release"></a>
    <a href="https://github.com/andrear9/Reflecto/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/andrear9/reflecto/ci.yml?style=flat-square&color=6366f1&label=CI" alt="CI"></a>
    <a href="https://github.com/andrear9/reflecto/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square&color=6366f1" alt="License"></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react&color=6366f1" alt="React"></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6-blue.svg?style=flat-square&logo=vite&color=6366f1" alt="Vite"></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-v4-blue.svg?style=flat-square&logo=tailwindcss&color=6366f1" alt="Tailwind CSS"></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API"><img src="https://img.shields.io/badge/WebCodecs-Native-blue.svg?style=flat-square&logo=webrtc&color=6366f1" alt="WebCodecs API"></a>
  </p>
</div>

---

<div align="center">
  <img src="./public/Screenshot.png" alt="Reflecto interface preview" style="border-radius: 12px; border: 1px solid #27272a;" />
  <p><em>Turn raw assets into engaging, social-ready comparisons in seconds.</em></p>
</div>

<br>

## What is Reflecto?

Reflecto is a client-side comparison studio built for designers, photographers, and developers who need to present visual changes clearly and beautifully. Drop in two images, choose a transition style, fine-tune the framing, and export — as a high-resolution PNG, a 60FPS MP4, or a compressed GIF optimized for social sharing.

Everything runs directly in the browser. Your images are never uploaded anywhere.

<br>

## ✨ Features

### Comparison Modes
Five distinct ways to present your before & after:

| Mode | Description |
|---|---|
| **Slider** | Classic interactive drag handle |
| **Side-by-Side** | Both images framed together |
| **Diagonal Split** | Sharp angled divide |
| **Vertical Stack** | Top-and-bottom layout |
| **Alpha Fade** | Smooth cross-dissolve transition |

### Image Controls
- **Independent Pan & Zoom** per layer — drag to reposition, scroll to zoom, reset in one click. Transformations are CSS-masked to prevent clipping.
- **Per-layer filters** — Brightness, Contrast, and Saturation adjustable individually for each image.

### Workspace
- Customizable canvas padding, border radius, and dynamic background colors.
- **Draggable smart labels** with custom text, typography, and opacity — snap them anywhere on the frame.
- Adaptive dark/light theming with seamless touch and mouse support.

### Export Engine
- **PNG** — Retina-ready static exports (2×/3×), instantly copyable to clipboard.
- **MP4** — Hardware-accelerated 60FPS video via the native WebCodecs API.
- **GIF** — Highly optimized animated GIFs with pre-computed global color palettes for fast, compact output.

<br>

<div align="center">
  <img src="./public/features.gif" alt="Reflecto features preview" style="border-radius: 12px; border: 1px solid #27272a;" />
</div>

<br>

---

## 🔄 How Exports Work

Reflecto's export engine bypasses DOM capture entirely to avoid framerate drops and quality loss.

**MP4 (WebCodecs):** Pre-caches both images as raw bitmaps, then composites each frame — including transition math, easing curves, and UI handles — directly onto a hidden canvas buffer. Frames are piped one-by-one into the browser's native `VideoEncoder` and muxed via `mp4-muxer`, with no server involvement at any step.

**GIF:** Before the render loop starts, a single global color palette is extracted by combining both frames into a temporary canvas. This means NeuQuant color quantization runs once per export instead of once per frame — yielding roughly **3× faster processing** that scales with animation length and framerate.

**PNG:** Dynamic density scaling produces retina-ready output at 2×/3× resolution, delivered via the async Clipboard API or as a direct download.

> **Browser note:** MP4 exports are optimized for Chromium-based browsers (Chrome, Edge, Brave, Arc) where `VideoEncoder` hardware acceleration is most reliable.

<br>

---

## 🚀 Getting Started

**Prerequisites:** Node.js 18+ and npm (or bun).

```bash
# 1. Clone
git clone https://github.com/andrear9/reflecto.git
cd reflecto

# 2. Install
npm install

# 3. Run
npm run dev
```

Open `http://localhost:3000` in your browser.

### Build for production

```bash
npm run build    # outputs to /dist — minified and tree-shaken by Vite
npm run preview  # preview the production build locally
```

No environment variables are required to run the core application. If you're extending it:

```bash
cp .env.example .env.local
```

<br>

---

## 🏗 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 19 | Predictable state, concurrent features |
| Build | Vite 6 | Sub-second HMR, optimized output |
| Styling | Tailwind CSS v4 | Utility-first, zero runtime |
| Icons | lucide-react | Consistent geometric iconography |
| DOM → Canvas | html-to-image | Clones React's virtual DOM into bitmaps |
| Video | WebCodecs + mp4-muxer | Native hardware-accelerated encoding |
| GIF | gifenc | Compact palette-optimized output |

### Notable implementation details

- **No React in export loops** — `exportVideoTask` and `exportGifTask` operate entirely on Canvas APIs. React re-renders are kept completely out of the generation pipeline.
- **Shared transition utilities** — `applyDOMStateFade`, `applyDOMStateSlider`, and `getPositionForFrame` live in `utils.ts` and are shared across both export modules, preventing logic drift.
- **Pointer event delegation** — Label dragging uses `setPointerCapture` for unified mouse/touch/stylus tracking at 120Hz on modern devices, with no library overhead.
- **Debounced ResizeObserver** — Prevents layout thrashing when the workspace is resized.

<br>

---

## 🗺 Roadmap

### 🔗 Sharing & Collaboration
- [ ] **Shareable Links** — Encode the full workspace state (mode, labels, filters, colors) into a URL so comparisons can be shared or bookmarked without re-uploading.

### 🎨 Workspace & Presets
- [ ] **Saved Presets** — Store and recall named workspace configurations for consistent branding across exports.
- [ ] **Social Format Quick-Presets** — One-click canvas sizing for Instagram Square (1:1), Reels/TikTok (9:16), and Twitter/X header (16:9).

### 🖼 Comparison Modes
- [ ] **3-Way Comparison (A/B/C)** — Support a third image layer for multi-version comparisons (e.g. Original → V1 → V2).

### 📤 Export
- [ ] **WebM Export** — Alpha-channel transparent video for overlay use cases and design workflows.
- [ ] **Batch Export** — Queue and export multiple comparison configurations in one click.

### ⌨️ Workflow
- [ ] **Keyboard Shortcuts** — Power-user bindings for switching modes, triggering exports, and nudging labels.

<br>

---

## 🤝 Contributing

Contributions are welcome — whether it's a bug fix, a new export format, or a roadmap feature.

1. Fork the repo and create a branch: `git checkout -b feat/your-idea`
2. Make your changes and write a test if applicable.
3. Verify everything passes: `npm run lint` and `bun run test`
4. Open a pull request with a clear description of what changed and why.

For larger changes, consider opening an issue first to discuss the approach.

<br>

---

## ❓ FAQ

**Video exports are corrupted or fail silently.**  
Make sure you're on a recent Chromium-based browser. WebCodecs (`VideoEncoder`) support and h264 compliance vary significantly across browser engines.

**Image exports come back blank or tainted.**  
This happens when images are loaded from external domains without proper CORS headers. Use the file uploader instead — it relies on `URL.createObjectURL()` and bypasses cross-origin restrictions entirely.

<br>

---

## 📜 License

MIT — see [`LICENSE`](./LICENSE) for details.

---

<div align="center">
  <p>Built and maintained with care.<br>
  <a href="https://github.com/andrear9/reflecto">⭐ Star the repo</a> if Reflecto saves you time.</p>
</div>
