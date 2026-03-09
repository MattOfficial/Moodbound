export type VibeCategory = "Melancholic" | "Serene" | "Dark" | "Tense" | "Romantic" | "Epic" | "Mysterious" | "Happy" | "Neutral" | "Custom";

export interface Particle {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    life: number;
    angle: number;
    radius: number;
    baseRadius: number;
    alpha: number;
    targetAlpha: number;
    color?: string;
}

export interface RenderOptions {
    spacing?: number;
    maxDist?: number;
    interactionStrength?: number;
    canvasRgb?: [number, number, number];
    customUpdate?: (p: Particle, time: number, engine: VibePhysicsEngine) => void;
    customDraw?: (ctx: CanvasRenderingContext2D, p: Particle, rgb: [number, number, number], time: number) => void;
}

export class VibePhysicsEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private particles: Particle[] = [];
    private width: number = 0;
    private height: number = 0;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private currentVibe: VibeCategory = "Neutral";
    private animationFrameId: number | null = null;
    private time: number = 0;

    private spacing: number;
    private maxDist: number;
    private interactionStrength: number;
    private rgb: [number, number, number];

    // Extensibility hooks
    public customUpdate?: (p: Particle, time: number, engine: VibePhysicsEngine) => void;
    public customDraw?: (ctx: CanvasRenderingContext2D, p: Particle, rgb: [number, number, number], time: number) => void;

    constructor(canvas: HTMLCanvasElement, initialVibe: VibeCategory = "Neutral", options: RenderOptions = {}) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");
        this.ctx = ctx;

        this.spacing = options.spacing || 40;
        this.maxDist = options.maxDist || 250;
        this.interactionStrength = options.interactionStrength || 0.15;
        this.rgb = options.canvasRgb || [168, 85, 247]; // default purple
        this.currentVibe = initialVibe;
        this.customUpdate = options.customUpdate;
        this.customDraw = options.customDraw;

        this.resize();
        this.initParticles();

        this.handleResize = this.handleResize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
    }

    public start() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        this.animate();
    }

    public stop() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public setVibe(vibe: VibeCategory, rgb?: [number, number, number]) {
        this.currentVibe = vibe;
        if (rgb) this.rgb = rgb;
        // Don't re-init particles here! We want them to lerp into their new states.
    }

    private handleResize() {
        this.resize();
        // Rather than clearing everything on resize, we just add missing particles
        this.initParticles();
        // If the window shrank, we just leave them; they'll wrap or be culled by the specific physics
    }

    private handleMouseMove(e: MouseEvent) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    private resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.mouseX === 0) {
            this.mouseX = this.width / 2;
            this.mouseY = this.height / 2;
        }
    }

    private initParticles() {
        this.particles = [];
        const confettiColors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];

        for (let x = 0; x < this.width + this.spacing; x += this.spacing) {
            for (let y = 0; y < this.height + this.spacing; y += this.spacing) {
                const xOffset = (y / this.spacing) % 2 === 0 ? 0 : this.spacing / 2;
                this.particles.push({
                    x: x + xOffset,
                    y: y,
                    baseX: x + xOffset,
                    baseY: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: Math.random(),
                    angle: Math.random() * Math.PI * 2,
                    baseRadius: 0.8, // Smaller baseline dot
                    radius: 0.8,
                    alpha: 0.1,
                    targetAlpha: 0.1,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
                });
            }
        }
    }

    private drawTrails() {
        // Different vibes get different "trails" by not fully clearing the canvas
        if (this.currentVibe === "Epic" || this.currentVibe === "Melancholic") {
            this.ctx.fillStyle = `rgba(3, 0, 20, 0.2)`; // Slight fade instead of hard clear for motion blur
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    private updateParticle(p: Particle) {
        // Lerp factor for smooth transitions between physics states
        const lerp = 0.05;

        // 1. Core Physics Router
        switch (this.currentVibe) {
            case "Neutral":
                this.applyNeutral(p, lerp);
                break;
            case "Melancholic":
                this.applyMelancholic(p, lerp);
                break;
            case "Epic":
                this.applyEpic(p, lerp);
                break;
            case "Dark":
                this.applyDark(p);
                break;
            case "Serene":
                this.applySerene(p, lerp);
                break;
            case "Tense":
                this.applyTense(p);
                break;
            case "Romantic":
                this.applyRomantic(p, lerp);
                break;
            case "Happy":
                this.applyHappy(p);
                break;
            case "Mysterious":
                this.applyMysterious(p);
                break;
            case "Custom":
                if (this.customUpdate) this.customUpdate(p, this.time, this);
                break;
            default:
                this.applyNeutral(p, lerp);
        }

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Mouse interaction (Universal baseline overridable by specific vibes)
        if (this.currentVibe !== "Mysterious" && this.currentVibe !== "Dark") {
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.maxDist) {
                const scale = Math.pow((this.maxDist - dist) / this.maxDist, 2);

                // Draw connecting line to mouse pointer
                if (scale > 0.15) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p.x + (dx * this.interactionStrength), p.y + (dy * this.interactionStrength));
                    this.ctx.strokeStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${scale * 0.4})`;
                    this.ctx.stroke();
                }

                p.radius = p.baseRadius + (scale * 2.5);
                p.targetAlpha = 0.1 + (scale * 0.5);
            } else {
                p.radius += (p.baseRadius - p.radius) * 0.1;
                // Decay back to base alpha slowly
                p.targetAlpha = 0.1;
            }
        } else if (this.currentVibe === "Dark") {
            // For dark, we don't do the complex line drawing, but we still need to reset radius
            p.radius += ((p.baseRadius * 1.5) - p.radius) * 0.1;
        } else if (this.currentVibe === "Mysterious") {
            // Mysterious handles its own mouse interaction in the apply method, just needs radius reset
            p.radius += ((p.baseRadius * 1.5) - p.radius) * 0.1;
        }

        // Alpha lerping
        p.alpha += (p.targetAlpha - p.alpha) * 0.1;

        // Boundary wrapping (so they never permanently leave the screen)
        if (p.y > this.height + 50) p.y = -50;
        if (p.x > this.width + 50) p.x = -50;
        if (p.y < -50) p.y = this.height + 50;
        if (p.x < -50) p.x = this.width + 50;
    }

    private applyNeutral(p: Particle, lerp: number) {
        // Pull back to grid
        p.vx += (0 - p.vx) * lerp;
        p.vy += (0 - p.vy) * lerp;
        p.x += (p.baseX - p.x) * (lerp * 0.5);
        p.y += (p.baseY - p.y) * (lerp * 0.5);

        // Sine wave ripple
        const distFromCenter = Math.sqrt(Math.pow(p.x - this.width / 2, 2) + Math.pow(p.y - this.height / 2, 2));
        const ripple = Math.sin(distFromCenter * 0.02 - this.time * 2) * 0.5;
        p.radius = p.baseRadius + (ripple > 0.2 ? ripple * 0.5 : 0);
    }

    private applyMelancholic(p: Particle, lerp: number) {
        // Gravity Rain
        const targetVy = 3 + (p.life * 2); // random speeds
        p.vy += (targetVy - p.vy) * lerp;
        p.vx += (0.5 - p.vx) * lerp; // slight wind
    }

    private applyEpic(p: Particle, lerp: number) {
        // Ascending Sparks
        const targetVy = -5 - (p.life * 4);
        p.vy += (targetVy - p.vy) * lerp;
        p.vx += ((Math.sin(p.life * 100 + this.time * 5) * 2) - p.vx) * lerp;
    }

    private applySerene(p: Particle, lerp: number) {
        // Fireflies
        p.angle += 0.02;
        const targetVx = Math.cos(p.angle) * 0.5;
        const targetVy = Math.sin(p.angle) * 0.5 - 0.2; // slight upward drift
        p.vx += (targetVx - p.vx) * lerp;
        p.vy += (targetVy - p.vy) * lerp;

        // Pulsate
        if (Math.random() < 0.01) p.targetAlpha = 0.8;
        if (p.alpha > 0.5) p.targetAlpha = 0.1;
    }

    private applyDark(p: Particle) {
        // Smoke
        if (Math.random() < 0.05) {
            p.vx += (Math.random() - 0.5) * 1.5;
            p.vy += (Math.random() - 0.5) * 1.5 - 0.2;
            p.radius = p.baseRadius * (1.5 + Math.random() * 2); // Occasionally swell
        }
        // Friction
        p.vx *= 0.98;
        p.vy *= 0.98;
        // Increased base opacity so it's clearly visible
        p.targetAlpha = 0.4;
    }

    private applyTense(p: Particle) {
        // Jitter (ignores lerp to snap erraticly)
        if (Math.random() < 0.1) {
            p.x = p.baseX + (Math.random() - 0.5) * 20;
            p.y = p.baseY + (Math.random() - 0.5) * 20;
            p.targetAlpha = Math.random() > 0.8 ? 0.9 : 0.1;
        }
        p.vx *= 0.8;
        p.vy *= 0.8;
    }

    private applyRomantic(p: Particle, lerp: number) {
        // Heartbeat pulse
        p.vx += (0 - p.vx) * lerp;
        p.vy += (0 - p.vy) * lerp;
        p.x += (p.baseX - p.x) * (lerp * 0.5);
        p.y += (p.baseY - p.y) * (lerp * 0.5);

        const beat = Math.sin(this.time * 4); // fast heartbeat
        const beat2 = Math.sin(this.time * 4 - 0.5); // echo heartbeat
        if (beat > 0.8 || beat2 > 0.8) {
            p.radius = p.baseRadius * 2;
            p.targetAlpha = 0.4;
        } else {
            p.radius = p.baseRadius;
        }
    }

    private applyHappy(p: Particle) {
        // Bouncing Confetti
        p.vy += 0.1; // gravity
        if (p.vy > 5) p.vy = 5; // terminal velocity

        p.x += Math.sin(p.life * 100 + this.time * 5) * 2; // wobble

        // Floor collision
        if (p.y > this.height - 10 && p.vy > 0) {
            p.vy = -p.vy * 0.8; // bounce
            if (Math.abs(p.vy) < 1) p.vy = -10 - (Math.random() * 10); // randomly launch again
        }
    }

    private applyMysterious(p: Particle) {
        // Flee from mouse
        const dx = p.x - this.mouseX;
        const dy = p.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) {
            // Stronger repulsion force
            const force = Math.pow((300 - dist) / 300, 2);
            p.vx += (dx / dist) * force * 5;
            p.vy += (dy / dist) * force * 5;
        }

        // Friction + pull back to origin slowly
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += (p.baseX - p.x) * 0.02;
        p.y += (p.baseY - p.y) * 0.02;

        // Mysterious swarm pulses opacity and size
        if (Math.random() < 0.03) {
            p.targetAlpha = 0.8;
            p.radius = p.baseRadius * 2.5;
        } else if (p.alpha > 0.4) {
            p.targetAlpha = 0.3;
        } else {
            p.targetAlpha = 0.3; // Higher base resting alpha
        }
    }

    private drawParticle(p: Particle) {
        this.ctx.beginPath();

        switch (this.currentVibe) {
            case "Melancholic":
                // Raindrops: teardrop streaks
                this.ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
                this.ctx.lineTo(p.x, p.y);
                this.ctx.strokeStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.lineWidth = Math.max(0.5, p.radius);
                this.ctx.lineCap = "round";
                this.ctx.stroke();
                break;

            case "Serene":
                // Glowing Fireflies
                this.ctx.shadowBlur = p.targetAlpha > 0.5 ? 15 : 5;
                this.ctx.shadowColor = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, 1)`;
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // reset
                break;

            case "Happy":
                // Confetti: diverse colored rectangles
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.life * 10 + this.time * 2);
                this.ctx.fillStyle = p.color || `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.globalAlpha = p.alpha;
                const size = Math.max(2, p.radius * 2);
                this.ctx.fillRect(-size / 2, -size / 2, size, size * 1.5);
                this.ctx.globalAlpha = 1;
                this.ctx.rotate(-(p.life * 10 + this.time * 2));
                this.ctx.translate(-p.x, -p.y);
                break;

            case "Epic":
                // Sparks: bright glowing ascending lines
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = `rgba(255, 200, 0, ${p.alpha})`;
                this.ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
                this.ctx.lineTo(p.x, p.y);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
                this.ctx.lineWidth = Math.max(1, p.radius);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                break;

            case "Romantic":
                // Heartbeat: Pulsing glowing dots
                this.ctx.shadowBlur = p.radius > p.baseRadius * 1.5 ? 20 : 0;
                this.ctx.shadowColor = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, 0.8)`;
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                break;

            case "Dark":
                // Smoke: fuzzy blur
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha * 0.5})`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                break;

            case "Mysterious":
                // Swarm: glowing points
                this.ctx.shadowBlur = p.targetAlpha > 0.5 ? 10 : 0;
                this.ctx.shadowColor = `rgba(255, 255, 255, 0.5)`;
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                break;

            case "Tense":
            case "Neutral":
                // Standard dots, smaller & brighter
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.fill();
                break;

            case "Custom":
                if (this.customDraw) {
                    this.customDraw(this.ctx, p, this.rgb, this.time);
                } else {
                    // Fallback to neutral if no custom draw provided
                    this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                    this.ctx.fill();
                }
                break;

            default:
                this.ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${p.alpha})`;
                this.ctx.fill();
                break;
        }
    }

    private animate = () => {
        this.time = Date.now() * 0.0005;
        this.drawTrails();

        this.ctx.lineWidth = 0.5;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            this.updateParticle(p);
            this.drawParticle(p);
        }

        this.animationFrameId = requestAnimationFrame(this.animate);
    }
}
