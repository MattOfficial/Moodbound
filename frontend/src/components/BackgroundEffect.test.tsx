import { render } from '@testing-library/react';

import { BackgroundEffect } from './BackgroundEffect';

const { useVibeEngineMock, createRainPhysicsMock, createSwarmPhysicsMock } = vi.hoisted(() => ({
  useVibeEngineMock: vi.fn(),
  createRainPhysicsMock: vi.fn((options: unknown) => {
    void options;
    return { type: 'rain-physics' };
  }),
  createSwarmPhysicsMock: vi.fn((options: unknown) => {
    void options;
    return { type: 'swarm-physics' };
  }),
}));

vi.mock('vibe-particles', () => ({
  PRESETS: {
    antigravity: { rgb: [59, 130, 246], colorPalette: ['#3b82f6'] },
    neutral: { rgb: [168, 85, 247], colorPalette: ['#a855f7'] },
    melancholic: { rgb: [59, 130, 246], colorPalette: ['#3b82f6'] },
    serene: { rgb: [20, 184, 166], colorPalette: ['#14b8a6'] },
    dark: { rgb: [153, 27, 27], colorPalette: ['#991b1b'] },
    tense: { rgb: [220, 38, 38], colorPalette: ['#dc2626'] },
    romantic: { rgb: [244, 63, 94], colorPalette: ['#f43f5e'] },
    epic: { rgb: [245, 158, 11] },
    mysterious: { rgb: [124, 58, 237], colorPalette: ['#7c3aed'] },
    happy: { rgb: [234, 179, 8], colorPalette: ['#eab308'] },
  },
  createRainPhysics: (options: unknown) => createRainPhysicsMock(options),
  createSwarmPhysics: (options: unknown) => createSwarmPhysicsMock(options),
}));

vi.mock('vibe-particles/react', () => ({
  useVibeEngine: (...args: unknown[]) => useVibeEngineMock(...args),
}));

describe('BackgroundEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVibeEngineMock.mockReturnValue({ canvasRef: vi.fn() });
  });

  it('uses a rainbow palette for the neutral vibe', () => {
    const { container } = render(<BackgroundEffect vibe="Neutral" />);

    expect(useVibeEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spacing: 40,
        colorPalette: ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'],
      })
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('builds customized physics presets for melancholic and mysterious vibes', () => {
    const { rerender } = render(<BackgroundEffect vibe="Melancholic" />);

    expect(useVibeEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: expect.objectContaining({
          physics: { type: 'rain-physics' },
        }),
      })
    );

    rerender(<BackgroundEffect vibe="Mysterious" activeHex="#8b5cf6" />);

    expect(useVibeEngineMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        preset: expect.objectContaining({
          physics: { type: 'swarm-physics' },
        }),
        colorPalette: ['#7c3aed'],
      })
    );
  });

  it('falls back to antigravity visuals when no vibe is provided', () => {
    const { container } = render(<BackgroundEffect />);

    expect(useVibeEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: expect.objectContaining({ rgb: [59, 130, 246] }),
      })
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('uses the active hex color when a preset has no palette', () => {
    render(<BackgroundEffect vibe="Epic" activeHex="#f59e0b" />);

    expect(useVibeEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        colorPalette: ['#f59e0b'],
      })
    );
  });

  it('falls back to antigravity when given an unknown vibe', () => {
    render(<BackgroundEffect vibe={'Unknown' as never} />);

    expect(useVibeEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: expect.objectContaining({ rgb: [59, 130, 246] }),
      })
    );
  });
});
