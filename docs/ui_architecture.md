# UI Architecture & Concept Guidelines

This document serves as the primary context for future AI agents working on the frontend of the "Vibe Novel App" project.

## Core Aesthetic: Fun Personal Assistant

The Vibe Novel App is not a boring enterprise RAG tool. It is a **Personal Assistant for Light Novels**.
The visual language must constantly reinforce the feeling of magic, story, and dynamic interaction.

### Key Visual Pillars
1. **Glassmorphism**:
   - We use heavy frosted glass effects (`backdrop-filter: blur()`) to create depth and hierarchy.
   - Panels and cards should look like they are floating over a deep, living background.
   - Borders should be extremely subtle (e.g. `rgba(255, 255, 255, 0.08)` or similar) to separate panels from the background without feeling rigid.
2. **Dynamic Mesh Gradients**:
   - Avoid flat backgrounds. Use large, slow-moving CSS blurred elements (`filter: blur(120px)`) that float in the back layer.
   - The colors of these mesh elements (orbs/blobs) represent the AI's "brain" and the current "Vibe" of the application.
3. **Interactive Canvas Details (`vibe-particles`)**:
   - A defining feature of the UI is the autonomous background **particle physics engine** rendered on a `<canvas>` element via the custom `vibe-particles` package.
   - The canvas is fixed (`fixed inset-0 z-0`) underneath the application so that the UI can freely scroll over it without the effect cutting off.
   - The particles and mesh gradients must be **vibe-reactive**. When a user's search returns a "Melancholic" vibe, the mesh color should shift to oceanic blues and the particle weather should match (e.g., Rain effect).
   - The global application wrapper also uses a css `color-mix` tint injected with the active Semantic hex color to bathe the entire app context in that emotion. The default starting state is the high-energy blue **Antigravity** preset.

## Main Entry Point Focus
The dashboard is centered around the **Vibe Search Hero**. The search bar is the hero element—massive, central, and glowing. It invites natural language queries (e.g., "Find quotes with a melancholic rainy day vibe"). System stats (like "Books Indexed") are secondary and relegated to subtle side widgets so they do not distract from the story exploration.

## Development Rules for UI
- Always use `requestAnimationFrame` for canvas animations. Ensure they are optimized so they do not drain CPU resources.
- Colors must be rich and varied (`#a855f7` purple, `#ec4899` pink, `#06b6d4` cyan).
- Interactive elements (buttons, search bars, suggestion pills) should have hover state transforms (`translateY(-2px)`, scaling) and drop shadows/glows that match the current vibe colors.
- Use readable, structural typography. We use **Outfit** for headings and standard text, and **JetBrains Mono** only for specific data points or "AI system" status indicators.
