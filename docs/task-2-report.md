# Task 2 report

Implemented the approved raw-asset playable UI on top of Task 1 (`3d4d376`). React entry, responsive warm stage, inset CSS plate, local lighting, original GLTFLoader scenes, four eight-bite SVG rings, keyboard and model-hit pointer input, waiting/error/retry, finish/replay, reduced motion and WebGL recovery are included. No material/geometry/texture modifications or synthetic food. No external environment/font/CDN requests.

## Architecture and behavior

- `src/scene/assets.ts` resolves only after GLTFLoader parsing. Existing AssetStore supplies sequential preloading, deduplication, cache and explicit retry. Effects synchronize READY using current run tokens and unsubscribe on unmount.
- `src/scene/Scene.tsx` separates interaction rotation, additive shake, exit and calibration groups. Stage-zero dimensions define the fixed orthographic framing for every stage. All models retain identity uniform scale. Bounding-box X/Z centers and a shared bottom baseline are used; no per-stage fit or stretching. The exact bottom-slice centroid was not computed: whole-bounds horizontal centering retains the original irregular shape as permitted in the brief.
- The exit runs 400 ms final / 500 ms sinking and canvas opacity fade; no material transparency edits. Frame-loop completion events carry run/transition tokens; no React per-frame status updates or timer leaks. Reduced motion uses 60 ms phases without shake.
- Input raycasts the actual model before starting a gesture; transparent canvas misses cannot bite. Capture tracks outside releases, max excursion survives returning to origin, long presses/right buttons/cancel/multitouch cannot bite. Interaction rotation persists between stages; replay resets it and uses cached scenes.
- Exact exponential inertia integration is independent of dt. It integrates only after release, with stale release velocity cleared after a stationary hold. Shake impulses add/cap and end at 250 ms.
- Scene error boundary, Canvas WebGL fallback, context-loss status/retry, asset parser/network error/retry prevent permanent blank output. Keyboard bites also require mounted scene hit readiness.

## Environment and exact commands

Windows, installed Chrome 156.0.8078.74, Playwright 1.64.1, bundled Node 24.21.0 / pnpm 10.19.0. Headless Chrome uses `--use-angle=swiftshader --enable-unsafe-swiftshader`: **software simulated GPU**, not physical mobile GPU validation. No browser download was performed.

```powershell
$env:PATH = 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\node\bin;' + $env:PATH
$pnpmTask2 = 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\pnpm\bin\pnpm.mjs'
& node $pnpmTask2 add -D @playwright/test
& node $pnpmTask2 test
& node $pnpmTask2 typecheck
& node $pnpmTask2 build
& node $pnpmTask2 test:browser
git diff --check
```

Initial red commands:

```powershell
& node node_modules/vitest/vitest.mjs run src/scene/motion.test.ts
& node node_modules/@playwright/test/cli.js test --grep 'real model' --timeout 15000
```

Executable motion stubs produced **2 failed** (zero inertia displacement and missing additive shake) at 13:03:32, before motion implementation. Browser red at 13:02:56 timed out waiting for the real stage-zero model request because the entry/UI did not exist. Initial module-not-found motion red was followed by the executable behavioral red above.

Green at 13:05:56: 24 tests passed. First browser green: 3 tests passed in 37.2 s. Additional regression red: held-pointer inertia incorrectly moved by 0.225594 rad (13:08:51); fixed by suppressing integration while dragging. Missing exit fade failed opacity assertion (`1`, expected `<1`); fixed by compositing canvas opacity. A simultaneous source edit exposed Vite watcher `EBUSY` on atomic temporary directories; ignored `**/*.tmpdir/**` in dev watcher, rather than changing application logic.

Expanded green at 13:11:17: **25 unit tests / 4 files; 5 browser tests passed in 53.0 s**, typecheck and production build exit 0. Final exact-code verification at 13:13:05: **25 unit tests passed, typecheck exit 0, production build exit 0, 5 browser tests passed in 56.8 s, git diff --check exit 0**.

Browser coverage includes real HTTP GLB load and actual model-hit click, out-and-back drag no bite, eight-bite advancement, eating opacity, 32-bite completion/replay, next-model HTTP failure retry with full ring and retained model, 390×844 overflow/reduced-motion transition, first-model invalid-GLB parser failure/retry, outside blank-canvas release, right button, long press, CDP multitouch/cancel, Enter input and context-loss recovery. The successful full-loop test records and asserts zero page errors and console errors. Failure scenarios intentionally inject HTTP/parser/context failures; their recovery is asserted.

Playwright auto-starts/stops Vite at `http://127.0.0.1:4173`; no replacement DSH server. Browser config accepts `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, otherwise detects installed Windows Chrome, otherwise uses Playwright Chromium (on another host install with `pnpm exec playwright install chromium`). 180 s flow timeout / 90 s assertion timeout allow raw local assets to parse.

## Screenshots and observations

- `docs/screenshots/desktop-initial.png`: initial resting view, 1440×1000.
- `docs/screenshots/desktop.png`: after drag and first actual pointer bite.
- `docs/screenshots/mobile.png`: 390×844 viewport.
- `docs/screenshots/finished.png`: empty plate and replay.

All screenshot files captured by real Chrome WebGL. **Visual self-inspection is unavailable:** `read_image` was called for desktop/mobile/finished and rejected by runtime because `gpt-6-sol` does not declare image input. Controller independently encountered the same limitation. Do not interpret the screenshot artifacts as a human visual approval. Browser geometry/overflow and successful actual raycast/flows were verified.

Four raw models total 75,363,324 bytes (~71.9 MiB), original files remain untouched. Original mirror-like material response, holes and stage-size differences are preserved. No iOS/Android hardware, FPS or network performance guarantee. Vite warns about the 1.16 MB minified JS chunk (Three/R3F/loader); build succeeds. Test process may emit NO_COLOR/FORCE_COLOR environment warnings; these are separate from browser console assertions.

Background execution IDs: `pwsh-62fffc61f6db42d7`, `pwsh-373bf9c7b3f84daa`, `pwsh-68a29134396145d8`, `pwsh-5e0d5ef54aa249c6`, `pwsh-2df3b6628bf7449f`; all are collected on completion. Playwright owns/cleans its webServer. Controller-owned untracked README and verification document remain untouched and uncommitted. Task-owned source/config/tests/screenshots/report only are committed; raw assets were already tracked and unchanged.

## Task 2 review fix

Review found that the renderer error boundary fallback is nested inside `.food-input`. Its retry button therefore bubbles `pointerdown` to the food input, which captured the pointer before the button's native click could fire. `src/ui/useFoodInput.ts` now exits before pointer tracking/capture when the event target is an interactive descendant (`button`, `a`, `input`, or `[data-no-drag]`). This preserves the fallback's explicit retry behavior while leaving model-hit drag/tap routing unchanged.

Regression evidence: the focused Playwright test `renderer fallback retry remains clickable inside food input` first forces a renderer failure, clicks the nested `重试画面` button, then verifies keyboard bite and drag isolation. It failed before the guard with `data-bites` remaining `0`, and passed after the guard. Unit tests passed (25), typecheck passed, production build passed, and the focused browser regression passed. A subsequent full browser run reached 5/6 tests; the remaining failure was Playwright trace artifact cleanup (`ENOENT` while closing the context), not an application assertion.
