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
3. **Interactive Canvas Details**: 
   - A defining feature of the UI is a **Dot Matrix background animation** rendered on a `<canvas>` element.
   - This matrix should *not* be static. It must react to the user. For instance, creating rippling waves or light-novel-themed geometric disturbances around the mouse cursor to give the interface a tactile, "alive" feeling.

## Main Entry Point Focus
The dashboard is centered around the **Vibe Search Hero**. The search bar is the hero element—massive, central, and glowing. It invites natural language queries (e.g., "Find quotes with a melancholic rainy day vibe"). System stats (like "Books Indexed") are secondary and relegated to subtle side widgets so they do not distract from the story exploration.

## Development Rules for UI
- Always use `requestAnimationFrame` for canvas animations. Ensure they are optimized so they do not drain CPU resources.
- Colors must be rich and varied (`#a855f7` purple, `#ec4899` pink, `#06b6d4` cyan).
- Interactive elements (buttons, search bars, suggestion pills) should have hover state transforms (`translateY(-2px)`, scaling) and drop shadows/glows that match the current vibe colors.
- Use readable, structural typography. We use **Outfit** for headings and standard text, and **JetBrains Mono** only for specific data points or "AI system" status indicators.
