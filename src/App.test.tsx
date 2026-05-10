import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';
import * as videoExport from './lib/videoExport';
import * as gifExport from './lib/gifExport';

// Mock the export functions
vi.mock('./lib/videoExport', () => ({
  exportVideoTask: vi.fn(),
}));

vi.mock('./lib/gifExport', () => ({
  exportGifTask: vi.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL since it's used for file uploads and exports
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { name: /reflecto/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('handles uploading a "Before" image', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Find inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const beforeInput = fileInputs[0] as HTMLInputElement;

    const file = new File(['dummy content'], 'before.png', { type: 'image/png' });

    await user.upload(beforeInput, file);

    // The image src should be updated with the mock url
    const img = document.querySelector('img[alt="Before"]') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('blob:mock-url');
  });

  it('handles uploading an "After" image', async () => {
    const user = userEvent.setup();
    render(<App />);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const afterInput = fileInputs[1] as HTMLInputElement;

    const file = new File(['dummy content'], 'after.png', { type: 'image/png' });

    await user.upload(afterInput, file);

    const img = document.querySelector('img[alt="After"]') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('blob:mock-url');
  });

  it('can trigger video export', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Setup - Upload both images to enable export
    const fileInputs = document.querySelectorAll('input[type="file"]');
    await user.upload(fileInputs[0] as HTMLInputElement, new File([''], 'before.png', { type: 'image/png' }));
    await user.upload(fileInputs[1] as HTMLInputElement, new File([''], 'after.png', { type: 'image/png' }));

    // Ensure exportVideoTask resolves with a valid buffer
    vi.mocked(videoExport.exportVideoTask).mockResolvedValueOnce(new Uint8Array([1, 2, 3]).buffer);

    // Click Export MP4 button
    const exportBtn = screen.getByText('Export MP4');
    await user.click(exportBtn);

    // Verify exportVideoTask was called
    await waitFor(() => {
      expect(videoExport.exportVideoTask).toHaveBeenCalled();
    });
  });

  it('can trigger gif export', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Setup - Upload both images
    const fileInputs = document.querySelectorAll('input[type="file"]');
    await user.upload(fileInputs[0] as HTMLInputElement, new File([''], 'before.png', { type: 'image/png' }));
    await user.upload(fileInputs[1] as HTMLInputElement, new File([''], 'after.png', { type: 'image/png' }));

    // Ensure exportGifTask resolves
    vi.mocked(gifExport.exportGifTask).mockResolvedValueOnce(new Uint8Array([1, 2, 3]).buffer);

    // Click Export GIF button
    const exportBtn = screen.getByText('Export GIF');
    await user.click(exportBtn);

    // Verify exportGifTask was called
    await waitFor(() => {
      expect(gifExport.exportGifTask).toHaveBeenCalled();
    });
  });
});
