import React, { useEffect, useRef } from 'react';
import { VibePhysicsEngine } from '../lib/physicsEngine';
import type { VibeCategory } from '../lib/physicsEngine';

interface BackgroundEffectProps {
    vibe?: VibeCategory;
}

const VIBE_COLORS: Record<VibeCategory, { blob1: string, blob2: string, blob3: string, canvasRgb: [number, number, number] }> = {
    Neutral: { blob1: 'bg-purple-500/40', blob2: 'bg-pink-500/30', blob3: 'bg-cyan-500/20', canvasRgb: [168, 85, 247] },
    Melancholic: { blob1: 'bg-blue-600/40', blob2: 'bg-slate-500/30', blob3: 'bg-indigo-500/20', canvasRgb: [59, 130, 246] },
    Serene: { blob1: 'bg-teal-500/40', blob2: 'bg-emerald-400/30', blob3: 'bg-cyan-300/20', canvasRgb: [20, 184, 166] },
    Dark: { blob1: 'bg-red-900/40', blob2: 'bg-neutral-800/60', blob3: 'bg-black/40', canvasRgb: [153, 27, 27] },
    Tense: { blob1: 'bg-orange-600/40', blob2: 'bg-red-600/30', blob3: 'bg-yellow-600/20', canvasRgb: [220, 38, 38] },
    Romantic: { blob1: 'bg-rose-500/40', blob2: 'bg-pink-400/30', blob3: 'bg-fuchsia-400/20', canvasRgb: [244, 63, 94] },
    Epic: { blob1: 'bg-amber-500/40', blob2: 'bg-orange-400/30', blob3: 'bg-yellow-300/20', canvasRgb: [245, 158, 11] },
    Mysterious: { blob1: 'bg-violet-600/40', blob2: 'bg-indigo-600/30', blob3: 'bg-purple-700/20', canvasRgb: [124, 58, 237] },
    Happy: { blob1: 'bg-yellow-400/40', blob2: 'bg-lime-400/30', blob3: 'bg-cyan-400/20', canvasRgb: [250, 204, 21] },
    Custom: { blob1: 'bg-slate-500/40', blob2: 'bg-gray-400/30', blob3: 'bg-zinc-400/20', canvasRgb: [148, 163, 184] }
};

export const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ vibe = "Neutral" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<VibePhysicsEngine | null>(null);
    const colors = VIBE_COLORS[vibe] || VIBE_COLORS.Neutral;

    // 1. Initialize Engine ONCE on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        engineRef.current = new VibePhysicsEngine(canvas, vibe, {
            canvasRgb: colors.canvasRgb,
            spacing: 40
        });

        engineRef.current.start();

        return () => {
            if (engineRef.current) {
                engineRef.current.stop();
            }
        };
    }, []); // Empty dependency array, strictly on mount

    // 2. Dispatch State Changes when Props Update
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setVibe(vibe, colors.canvasRgb);
        }
    }, [vibe, colors.canvasRgb]);

    return (
        <>
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
                <div className={`absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[600px] h-[600px] transition-colors duration-1000 ${colors.blob1} -top-[10%] -left-[10%]`} />
                <div className={`absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out_reverse] w-[500px] h-[500px] transition-colors duration-1000 ${colors.blob2} -bottom-[20%] right-[15%]`} style={{ animationDelay: '-5s' }} />
                <div className={`absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[400px] h-[400px] transition-colors duration-1000 ${colors.blob3} top-[40%] left-[50%]`} style={{ animationDelay: '-10s' }} />
            </div>
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full z-[1] pointer-events-none opacity-60"
            />
        </>
    );
};
