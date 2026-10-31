# Burger Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a distinct mobile-first burger viewer with lateral bite feedback and measured compressed GLBs.

**Architecture:** Keep asset loading and sequence reducer independent. Asset pipeline writes alternate GLBs and manifest swaps URLs; reducer uses one transition phase; Scene uses lateral impulse only. UI layout is a single stage surface, header, and functional progress footer.

**Tech Stack:** React 19, TypeScript 5, Three r180, R3F 9, Vite 7, Vitest, Playwright, glTF-Transform.

**Spec:** `docs/superpowers/specs/2026-10-30-burger-mobile-redesign.md`

## Global Constraints

- Preserve original `public/models/burger-{0..3}.glb` bytes.
- Four stages, eight bites each; stage 0 first, sequential preload and retry.
- No audio, backend, food selector or achievement UI.
- No model ascent/descent, opacity exit or model scale exit.
- Default phone view must fit without horizontal overflow.

---

### Task 1: Direct lateral transition

**Files:** Modify `src/core/sequence.ts`, `src/core/sequence.test.ts`, `src/scene/Scene.tsx`, `src/scene/motion.ts`, `src/scene/motion.test.ts`, `src/App.tsx`, `tests/burger.spec.ts`.

**Interfaces:** Reducer emits `final` after eighth bite or next-stage readiness and accepts `FINAL_DONE` only when run/transition matches; `eating` and `EATING_DONE` are removed. `motion.shake` drives only the horizontal group offset. Scene dispatches `FINAL_DONE` after ~0.22 seconds (reduced ~0.02 seconds).

- [x] Revise reducer unit assertions and observe red failures while existing reducer used two completions.
- [x] Implement single `final` completion and verify 25 unit tests/typecheck pass.
- [x] Remove exit group, vertical offset, scale exit and canvas opacity; use one 220ms final lateral shake.
- [ ] Run browser direct-swap assertions after optimized manifest is available.

### Task 2: Mobile asset pipeline

**Files:** Create `scripts/optimize-models.mjs`, `public/models-mobile/burger-{0..3}.glb`, `docs/model-optimization.md`; modify `package.json`, `pnpm-lock.yaml`, `src/data/manifest.ts`, `src/scene/assets.ts` as required by decoder.

**Interfaces:** manifest URLs point to `/models-mobile/burger-{0..3}.glb`; loader decodes chosen compression. Original files remain untouched and HTTP app requests only optimized assets.

- [x] Inspect original geometry/texture dimensions and choose supported optimizer/decoder.
- [x] Generate stage-0 sample and measure actual results.
- [x] Run parser and GLTFLoader browser smoke; reject invalid samples.
- [x] Generate remaining stages reproducibly and document measured totals and source hashes.
- [x] Browser test verifies optimized model URLs and all 4 stages load.

### Task 3: Distinct mobile UI

**Files:** Modify `src/style.css`, `src/ui/Progress.tsx`, `src/App.tsx`, `tests/burger.spec.ts`.

**Interfaces:** `Progress({stage,bites})` continues accessible stage/bite announcement while rendering four groups of eight notches; status and retry/replay controls remain operative.

- [x] Implement dark-green food stage, restrained plate arc and responsive progress layout.
- [x] Assert viewport, empty plate/replay and recovery controls; browser suite renders and captures the responsive scenes.
- [x] Inspect screenshot dimensions and pixel distribution; document that image-incompatible model prevented human visual review.

### Task 4: Integration and delivery

**Files:** Modify `README.md`, `docs/verification.md`; keep screenshots under `docs/screenshots/`.

- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:browser` after integration.
- [x] Verify four source SHA256 unchanged and optimized sizes/geometry measurements recorded.
- [x] Verify active Vite URL serves page and compressed assets and stays running.
- [x] Inspect git diff/status and record limitations and visual inspection status.
