# SHIRT BLAST AR

**[Play the demo →](https://ccavins.github.io/t-shirt-cannon-demo/)**

Tap flying T-shirts from three arena cannons before time runs out. Built as an iPhone Safari camera AR experience — no App Store install, no backend.

Best on **iPhone Safari** over HTTPS. On a computer, use [`?debug=true`](https://ccavins.github.io/t-shirt-cannon-demo/?debug=true) (drag to look around).

## How to play

1. Open the link on your phone  
2. Tap **Start** and allow camera (and motion, if asked)  
3. Point at an open area and **Place Cannons**  
4. Tap shirts for 30 seconds — use **Recenter** anytime  

## Features

- Rear-camera AR with a transparent Three.js overlay  
- Three cannons (left / center / right) sharing one launch rate  
- Virtual placement — no plane tracking required  
- Combos, local high score, forgiving touch targets  
- Desktop debug mode and optional Android WebXR  

## Technical approach

Browser AR varies by platform. This demo’s **primary** path is camera + device orientation (iPhone Safari). WebXR is an optional Android enhancement only.

| Mode | When |
|------|------|
| Camera + orientation | iPhone / default Android |
| Desktop debug | `?debug=true` |
| WebXR immersive-AR | Compatible Android Chrome |

## Permissions

All prompts start from one **Start** tap: rear camera, then motion/orientation when the browser requires it. The game stays playable if motion is denied.

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Camera needs **HTTPS** or **localhost**. For a physical iPhone against your laptop, use a tunnel or the GitHub Pages URL.

## GitHub Pages

1. **Settings → Pages → Source: GitHub Actions**  
2. Push to `main` — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys `dist`  
3. Live site: https://ccavins.github.io/t-shirt-cannon-demo/  

## Debug query parameters

| Param | Effect |
|-------|--------|
| `?debug=true` | No camera; drag to look; diagnostics |
| `?duration=10` | Shorter round |
| `?showBounds=true` | Show hit spheres |
| `?forceFallback=true` | Skip WebXR on Android |
| `?autoPlace=true` | Auto-place after a short countdown |
| `?performanceMode=low` | `auto` \| `high` \| `balanced` \| `low` |

## Configuration & assets

Tune gameplay in [`src/config.js`](src/config.js) (distance, spacing, spawn rate, scoring).

Procedural meshes ship by default. Replacement prompts live in [`asset-prompts/`](asset-prompts/). Drop GLB/PNG into `public/assets/` when you have final art.

## Known limitations

- Safari camera mode is rotational AR (no true 6DOF walk-around)  
- Orientation quality depends on device permissions and sensors  
- Procedural art is placeholder-ready for brand swaps  

## License

MIT — see [LICENSE](LICENSE). Do not include real team/league brand assets.
