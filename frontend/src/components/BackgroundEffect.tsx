import React, { useEffect, useRef } from 'react';

export const BackgroundEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                        ctx.strokeStyle = `rgba(168, 85, 247, ${scale * 0.4})`;
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
                    const r = Math.floor(255 - (scale * (255 - 168)));
                    const g = Math.floor(255 - (scale * (255 - 85)));
                    ctx.fillStyle = `rgba(${r}, ${g}, 255, ${targetAlpha})`;
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
    }, []);

    return (
        <>
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[600px] h-[600px] bg-purple-500/40 -top-[10%] -left-[10%]" />
                <div className="absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out_reverse] w-[500px] h-[500px] bg-pink-500/30 -bottom-[20%] right-[15%]" style={{ animationDelay: '-5s' }} />
                <div className="absolute rounded-full blur-[120px] opacity-40 mix-blend-screen animate-[float_20s_infinite_alternate_ease-in-out] w-[400px] h-[400px] bg-cyan-500/20 top-[40%] left-[50%]" style={{ animationDelay: '-10s' }} />
            </div>
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full z-[1] pointer-events-none opacity-60"
            />
        </>
    );
};
