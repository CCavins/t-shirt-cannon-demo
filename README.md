# SHIRT BLAST AR

iPhone-first mobile AR activation demo: a virtual T-shirt cannon launches shirts through your camera view — tap them before time runs out.

**Primary platform:** iPhone Safari (camera + device orientation pseudo-AR)  
**Secondary:** Android Chrome camera overlay, with optional WebXR when available  
**Deploy:** Static site on GitHub Pages (no backend)

## Features

- Rear-camera full-screen AR with transparent Three.js overlay
- Virtual cannon placement (no plane tracking required)
- Recenter during placement and gameplay
- 30-second round, combos, local high score
- Forgiving layered touch targeting
- Desktop debug mode (`?debug=true`)
- Optional Android WebXR enhancement
- Procedural placeholder 3D/UI/audio (easy asset swap)

## Technical approach

This project does **not** require WebXR or plane detection for the core experience.

| Mode | When | How |
|------|------|-----|
| `IOSCameraARMode` | iPhone / primary | `getUserMedia` + orientation world |
| `CameraFallbackMode` | Android without WebXR | Same camera overlay stack |
| `DesktopDebugMode` | `?debug=true` | Simulated background + pointer-drag look |
| `AndroidWebXRMode` | Compatible Android only | Optional `immersive-ar` + hit-test |

Browser AR capabilities vary. The camera-based path is intentional so the game works from a normal HTTPS page in Safari with no App Store install, custom browser, or paid WebAR SDK.

## Browser compatibility

- **iPhone Safari (target):** camera overlay + orientation (playable if motion denied)
- **Android Chrome:** camera overlay; WebXR AR when the device/browser supports it
- **Desktop:** use `?debug=true` (no camera required)

Camera access needs **HTTPS** or **localhost**. GitHub Pages provides HTTPS.

## Permissions

All permissions start from one **Start Camera Game** tap:

1. Rear camera (`facingMode: environment`)
2. `DeviceOrientationEvent.requestPermission` when present (iOS)
3. `DeviceMotionEvent.requestPermission` when present (optional)
4. Audio unlock

Sensors are never required to play. If orientation is denied, the game uses a screen-relative / simulated look.

## Local setup

```bash
npm install
npm run dev
```

Open the printed local URL on your phone (same Wi‑Fi), or use a tunnel. For camera on a physical iPhone, prefer HTTPS (e.g. ngrok) or deploy to Pages.

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds with  
   `GITHUB_PAGES_BASE=/<repo-name>/` and deploys `dist`.
4. For a **user/org site** (`username.github.io`), set `GITHUB_PAGES_BASE=/` in the workflow env.

No environment secrets are required.

## Debug query parameters

| Param | Effect |
|-------|--------|
| `?debug=true` | No camera; drag to look; diagnostic panel |
| `?duration=10` | Shorter round |
| `?showBounds=true` | Show shirt hit spheres |
| `?forceFallback=true` | Skip WebXR on Android |
| `?autoPlace=true` | Auto-place after short countdown |
| `?performanceMode=low` | `auto` \| `high` \| `balanced` \| `low` |

## Configuration

Tune gameplay in [`src/config.js`](src/config.js):

- Round duration, spawn rate, max active shirts
- Cannon distance / height
- Launch zone weights and playable cone
- Hit collider scale and screen tolerance
- Orientation damping, scoring, pixel-ratio cap

## Asset replacement

Procedural meshes live in `Cannon.js` / `ShirtProjectile.js`. To replace:

1. Drop GLB/PNG/WebP into `public/assets/...`
2. Load with Three.js `GLTFLoader` / `TextureLoader`
3. Keep hit colliders ~1.3–1.6× visible size

### Higgsfield workflow

See [`asset-prompts/`](asset-prompts/) for generation prompts (cannon, shirt, UI). Convert outputs to:

- Transparent PNG sprites (key green/magenta)
- Compressed WebP textures
- Optimized GLB models (mobile-friendly)

Higgsfield is **not** an app dependency.

## Device testing checklist

- [ ] Current iPhone Safari
- [ ] Older / low-performance (`?performanceMode=low`)
- [ ] Motion permission granted
- [ ] Motion permission denied
- [ ] Camera permission denied → Retry copy
- [ ] Switch apps and return (camera resumes)
- [ ] Portrait ↔ landscape banner
- [ ] Low Power Mode (where practical)
- [ ] Android Chrome camera overlay
- [ ] Android Chrome WebXR (if supported)
- [ ] Desktop `?debug=true`
- [ ] GitHub Pages production HTTPS URL

## Known limitations

- No true 6DOF positional tracking in Safari camera mode (rotation only)
- WebXR plane/hit-test is Android-enhancement only
- Procedural art is a polished placeholder, not final brand kit
- Orientation quality varies by device and permissions

## Future production recommendations

- Replace procedural props with optimized GLBs
- Add analytics / consent as required for your event
- Harden iOS permission recovery UX per OS version
- Consider a short onboarding clip before first placement
- Cap concurrent sessions only if you add a backend later (not required here)

## License

Demo code is provided for the activation POC. Do not include real team/league brand assets.
