# Bite game verification — 2026-10-31

Implemented picker → selected-food play → replay / return flow with a cream, forest-green and tomato-red visual system. Only the existing classic burger is registered. Its SVG cover is an illustration, not another food asset.

## Checks

- Vitest: 50 tests passed across 11 files, including procedural audio/muting/context reuse, bite recoil, crumb emission and Float32 lifetime regression.
- Optimizer node:test: 3 tests passed, including safe food ID and dry-run path mapping.
- TypeScript and Vite production build passed. Main runtime bundle remains about 1.20 MB / 336 kB gzip; Vite reports its existing >500 kB chunk advisory.
- Playwright: full run passed 8/9; rapid-input test initially failed because driver latency exceeded the shortened chew. After changing its two inputs to dispatch in the same browser task, the scoped rerun passed 1/1 (9.8 seconds). All 9 cases now pass across those runs using local Chrome / SwiftShader. Added per-frame peak checks for real crumb/recoil emission, exact settling, and reduced-motion suppression. Covers 16-bite completion/replay, rapid-repeat suppression during chewing, direct model taps, drag isolation, help focus, settings persistence, no model requests before start, return to picker, mobile layout, reduced motion, parser/retry, cancellation, renderer retry and context loss.
- Desktop rendered food bounds: 462×443 → 438×405 → 406×313 → 246×246 px.
- Mobile rendered food bounds: 232×223 → 220×204 → 204×158 → 124×125 px.
- Both pixel checks confirm strict shrink in width/height. Final stage retains about 61% of stage-three width and 79% height, replacing the earlier abrupt 41% / 53% drop.
- Each bite emits 3 crumbs with gravity and a 0.55-second two-pulse chew; stage-end emits 5. Each stage takes 4 bites (16 total). A synchronous timer guard blocks repeated inputs until chewing ends; stage-ending BITE is deferred until after the chew. Timer is cleared on unmount. Fixed an actual particle-pool defect: Float32 rounding of the expired lifetime resurrected empty slots, filling the pool before a burst. Empty slots now use Infinity.
- Sound defaults on for new users, preserving saved mute preferences. Two soft lowpass mouth-texture pulses and quiet low tones span 0.50 seconds using a shared AudioContext. Removed high-frequency crackle and the bright stage-end accent. Subjective chew timbre has not been listened to in this session. Reduced-motion suppresses recoil and new crumbs.

## Appearance and stage transition update

- Chew duration is now 0.55 seconds with a 0.50-second audio phrase. Post-chew exit delay shortened to 0.06 seconds.
- Stage changes crossfade cloned material layers for 0.24 seconds using smoothstep, with subtle scale settling. Drag orientation is retained. Reduced motion skips the blend. Incoming layer alone handles hit tests; obsolete layer fades to zero and is hidden. Runtime material copies are disposed on unmount.
- All 4 source stages use a food atlas with very low packed roughness (median 12–36/255). Runtime texture copies remap roughness to 0.34 + 0.66 × original, remove metalness and apply 1.08 saturation / 1.06 tonal exponent in linear light. Original GLBs and source texture pixels are preserved. Ambient/fill light reduced with a neutral-warm key for more directional definition.
- Appearance has not been visually approved by the agent because image input is unavailable; new screenshots and browser runtime checks are evidence of rendering, not subjective appetite.

## Runtime design

`foods.ts` owns per-food stages. `PlayScreen` creates a store only after selection. That store loads stage zero, then sequentially preloads the selected food's remaining stages. Settings are browser-local and control sound, haptics, motion preference and sensitivity. Rotation is around the locally centered model; world pivot and floor account for calibration scale and translation.

Four GLBs suffice for one playable four-stage food. New foods require their own stage arrays and asset names; the optimizer accepts `--food <id>`. A small cover is recommended. Original assets remain under `public/models/`; the optimizer writes only mobile copies.

## Limits

The image reader in this session rejected image input, so screenshots were generated and measured programmatically but not visually inspected by the agent. Screenshots are under `docs/screenshots/`, including picker desktop/mobile and all four stage captures. Audio/haptics support depends on the device and browser; browser tests do not prove physical vibration or speaker output. Device performance should be checked on target phones.
