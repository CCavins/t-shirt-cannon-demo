# Higgsfield Prompt — T-Shirt Cannon

Use this prompt to generate a visual reference for replacing the procedural Three.js cannon. Higgsfield is **not** a runtime dependency.

## STYLE FORMULA (insert byte-identical)

Chunky stylized arcade sports graphics with soft gradients and bold condensed athletic letterforms. Rounded chunky silhouettes, thick dark navy outlines, stadium energy without real team marks. Environment reads as bright arena night lights with cyan and electric-yellow accents; interactive targets (shirts) in vivid coral-orange so they pop against the live camera; UI panels in translucent navy glass with white and lemon score text. Playful high-energy broadcast mood with crisp rim highlights. High contrast over camera passthrough, clean readable silhouettes, consistent first-person AR perspective across 3D props and HUD.

## Prompt

```
game prop concept of a playful fictional arena T-shirt cannon, chunky stylized proportions, large barrel, friendly arcade appearance, bright generic sports colors navy cyan and electric yellow, no logos, no readable text, isolated on solid uniform bright #00FF00 background, clear front three-quarter view, consistent materials, suitable as visual reference for a low-poly 3D asset, Chunky stylized arcade sports graphics with soft gradients and bold condensed athletic letterforms. Rounded chunky silhouettes, thick dark navy outlines, stadium energy without real team marks. Environment reads as bright arena night lights with cyan and electric-yellow accents; interactive targets (shirts) in vivid coral-orange so they pop against the live camera; UI panels in translucent navy glass with white and lemon score text. Playful high-energy broadcast mood with crisp rim highlights. High contrast over camera passthrough, clean readable silhouettes, consistent first-person AR perspective across 3D props and HUD., on a solid uniform bright #00FF00 background, no shadows cast on the background, no ground plane, nothing cropped at the edges
```

## Suggested settings

- Aspect: 1:1
- Subject isolated for keying / image-to-3D
- Avoid real team brands

## After generation

1. Key out green background → transparent PNG
2. Optionally run image-to-3D → optimize to GLB (<1 MB preferred)
3. Place at `public/assets/models/cannon.glb`
4. Load in `Cannon.js` via `GLTFLoader` when ready
