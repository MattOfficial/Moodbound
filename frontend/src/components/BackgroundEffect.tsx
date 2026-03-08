import React, { useEffect, useRef } from 'react';

type VibeCategory = "Melancholic" | "Serene" | "Dark" | "Tense" | "Romantic" | "Epic" | "Mysterious" | "Happy" | "Neutral";

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
    Happy: { blob1: 'bg-yellow-400/40', blob2: 'bg-lime-400/30', blob3: 'bg-cyan-400/20', canvasRgb: [250, 204, 21] }
};

export const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ vibe = "Neutral" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const colors = VIBE_COLORS[vibe] || VIBE_COLORS.Neutral;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let dots: any[] = [];
        const spacing = 40;

        let mouseX = width / 2;
        let mouseY = height / 2;
        let animationFrameId: number;

        const initDots = () => {
            dots = [];
            for (let x = 0; x < width + spacing; x += spacing) {
                for (let y = 0; y < height + spacing; y += spacing) {
                    const xOffset = (y / spacing) % 2 === 0 ? 0 : spacing / 2;
                    dots.push({
                        x: x + xOffset,
                        y: y,
                        baseRadius: 1.2,
                        radius: 1.2,
                        alpha: 0.1
                    });
                }
            }
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initDots();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            const time = Date.now() * 0.0005;
            ctx.lineWidth = 0.5;

            // Extract the target animated color for the canvas layout
            const [cr, cg, cb] = colors.canvasRgb;

            dots.forEach(dot => {
                const dx = mouseX - dot.x;
                const dy = mouseY - dot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const maxDist = 250;
                let scale = 0;
                if (dist < maxDist) {
                    scale = Math.pow((maxDist - dist) / maxDist, 2);
                    if (scale > 0.15) {
                        ctx.beginPath();
                        ctx.moveTo(dot.x, dot.y);
                        const tailX = dot.x + (dx * 0.15);
                        const tailY = dot.y + (dy * 0.15);
                        ctx.lineTo(tailX, tailY);
                        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${scale * 0.4})`;
                        ctx.stroke();
                    }
                }

                const wave = Math.sin(dot.x * 0.005 + time) * Math.cos(dot.y * 0.005 - time);
                const cx = width / 2;
                const cy = height / 2;
                const distFromCenter = Math.sqrt(Math.pow(dot.x - cx, 2) + Math.pow(dot.y - cy, 2));

                const ripple = Math.sin(distFromCenter * 0.02 - time * 2) * 0.5;
                const force = (wave * 0.5 > 0 ? wave * 0.5 : 0) + (ripple > 0.2 ? ripple * 0.5 : 0);

                dot.radius = dot.baseRadius + (scale * 2.5) + force;
                const targetAlpha = 0.1 + (scale * 0.5);

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, Math.max(0.1, dot.radius), 0, Math.PI * 2);

                if (scale > 0.1) {
                    const r = Math.floor(255 - (scale * (255 - cr)));
                    const g = Math.floor(255 - (scale * (255 - cg)));
                    const b = Math.floor(255 - (scale * (255 - cb)));
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${targetAlpha})`;
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.02, targetAlpha + force * 0.1)})`;
                }

                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [colors]); // Re-bind the canvas loop when vibe colors change

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
