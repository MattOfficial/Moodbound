import React from 'react';
import { PRESETS, createRainPhysics, createSwarmPhysics } from 'vibe-particles';
import { useVibeEngine } from 'vibe-particles/react';
import type { Preset, RGB } from 'vibe-particles';

// Map our app's vibe strings to vibe-particles presets + blob colors
type VibeKey = 'Antigravity' | 'Neutral' | 'Melancholic' | 'Serene' | 'Dark' | 'Tense' | 'Romantic' | 'Epic' | 'Mysterious' | 'Happy';

interface VibeConfig {
    preset: Preset;
    blob1: string;
    blob2: string;
    blob3: string;
}

const VIBE_MAP: Record<VibeKey, VibeConfig> = {
    Antigravity: { preset: PRESETS.antigravity, blob1: 'bg-blue-600/60', blob2: 'bg-indigo-500/50', blob3: 'bg-cyan-500/40' },
    Neutral: { preset: PRESETS.neutral, blob1: 'bg-purple-500/50', blob2: 'bg-pink-500/40', blob3: 'bg-cyan-500/30' },
    // Showcasing modularity by customizing the Rain speed and wind
    Melancholic: {
        preset: { ...PRESETS.melancholic, physics: createRainPhysics({ speed: 4, wind: 2.5 }) },
        blob1: 'bg-blue-600/60', blob2: 'bg-slate-500/50', blob3: 'bg-indigo-500/40'
    },
    Serene: { preset: PRESETS.serene, blob1: 'bg-teal-500/60', blob2: 'bg-emerald-400/50', blob3: 'bg-cyan-300/40' },
    Dark: { preset: PRESETS.dark, blob1: 'bg-red-900/60', blob2: 'bg-neutral-800/70', blob3: 'bg-black/60' },
    Tense: { preset: PRESETS.tense, blob1: 'bg-orange-600/60', blob2: 'bg-red-600/50', blob3: 'bg-yellow-600/40' },
    Romantic: { preset: PRESETS.romantic, blob1: 'bg-rose-500/60', blob2: 'bg-pink-400/50', blob3: 'bg-fuchsia-400/40' },
    Epic: { preset: PRESETS.epic, blob1: 'bg-amber-500/60', blob2: 'bg-orange-400/50', blob3: 'bg-yellow-300/40' },
    // Showcasing modularity by customizing the Swarm repel radius to be huge and monochromatic
    Mysterious: {
        preset: {
            ...PRESETS.mysterious,
            physics: createSwarmPhysics({ repelRadius: 400 }),
            colorPalette: ['#7c3aed'] // Monochromatic purple override!
        },
        blob1: 'bg-violet-600/60', blob2: 'bg-indigo-600/50', blob3: 'bg-purple-700/40'
    },
    Happy: { preset: PRESETS.happy, blob1: 'bg-yellow-400/60', blob2: 'bg-lime-400/50', blob3: 'bg-cyan-400/40' },
};

interface BackgroundEffectProps {
    vibe?: VibeKey;
    activeHex?: string;
}

export const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ vibe = 'Antigravity', activeHex }) => {
    const config = VIBE_MAP[vibe] || VIBE_MAP.Antigravity;

    const { canvasRef } = useVibeEngine({
        preset: config.preset,
        spacing: 40,
        rgb: config.preset.rgb as RGB,
        colorPalette: vibe === 'Neutral'
            ? ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'] // Rainbow for neutral
            : config.preset.colorPalette || (activeHex ? [activeHex] : undefined), // Monochromatic for vibes
    });

    return (
        <>
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
                <div className={`absolute rounded-full blur-[120px] opacity-60 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[600px] h-[600px] transition-colors duration-1000 ${config.blob1} -top-[10%] -left-[10%]`} />
                <div className={`absolute rounded-full blur-[120px] opacity-60 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out_reverse] w-[500px] h-[500px] transition-colors duration-1000 ${config.blob2} -bottom-[20%] right-[15%]`} style={{ animationDelay: '-5s' }} />
                <div className={`absolute rounded-full blur-[120px] opacity-60 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[400px] h-[400px] transition-colors duration-1000 ${config.blob3} top-[40%] left-[50%]`} style={{ animationDelay: '-10s' }} />
            </div>
            <canvas
                ref={canvasRef}
                className="fixed top-0 left-0 w-vw h-vh z-0 pointer-events-none opacity-60"
            />
        </>
    );
};
