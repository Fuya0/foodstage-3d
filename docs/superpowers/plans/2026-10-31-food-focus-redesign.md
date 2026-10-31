# Food-Focus Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the burger the only primary interaction, ensure the final remnant shrinks in both apparent axes, and produce a distinctive appetizing food portrait.

**Architecture:** Keep existing sequence and input contracts. Update modelPlacement to constrain source bounding width and height for fixed-camera display; tune Three.js scene lighting and CSS composition separately; update Playwright coverage around actual direct interaction and screenshot bounds.

**Tech Stack:** React 19, TypeScript 5, Three.js r180, React Three Fiber 9, Vite 7, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-food-focus-redesign.md`

## Global Constraints

- Do not alter original GLBs or textures; mobile GLBs stay optimized.
- Do not reintroduce counters, tabletops, plates, or eat command buttons.
- The fixed camera, four stages, eight bites per stage, replay and error recovery remain.
- Prefer direct food interaction on touch, pointer and keyboard.

---

### Task 1: Size Calibration

**Files:** Modify `src/scene/presentation.test.ts`, `src/scene/presentation.ts`.

**Interfaces:** `modelPlacement(base: Vec3,current: Vec3,center: Vec3,stage?:number)` continues returning `{scale,position}`; scene consumes the same shape.

- [ ] Add a failing test using actual four model bounding boxes: both `size.x * scale` and `size.y * scale` must strictly decrease; fourth stage must be smaller than the third in both, and no scale above one.
- [ ] Run `pnpm exec vitest run src/scene/presentation.test.ts` and confirm the old width-only implementation fails for stage four's height.
- [ ] Constrain stage scale by the minimum of the target width ratio and target height ratio, using stricter late-stage targets. Preserve existing baseline positioning.
- [ ] Run the focused tests, typecheck and `git diff --check`.

### Task 2: Direct Interaction And Layout

**Files:** Modify `tests/burger.spec.ts`, `src/App.tsx`, `src/ui/HelpSheet.tsx`, `src/style.css`.

**Interfaces:** `useFoodInput(motion,hit,playable,bite)` remains unchanged. Existing `data-stage`/`data-bites`/`data-phase` remain test-visible.

- [ ] Write a failing browser test asserting no eat button, pointer click on food increments once, instructions explain direct tap/drag, help opens and closes, and replay persists.
- [ ] Run the focused Playwright test, verify it fails at the obsolete button.
- [ ] Replace action dock with unframed food title/hint, preserve recovery buttons and restrained replay. Remove defunct CTA CSS and adjust responsive composition without overlapping the food.
- [ ] Run focused browser tests at desktop and mobile.

### Task 3: Food Portrait Rendering And Verification

**Files:** Modify `src/scene/Scene.tsx`, `tests/burger.spec.ts`, `src/style.css`, `docs/white-space-redesign-verification.md` if appropriate.

**Interfaces:** Scene props unchanged; camera remains orthographic and fixed to first model.

- [ ] Capture all four settled stages in a browser test with reduced motion; assert visible food bounds shrink on desktop/mobile using canvas sampling or screenshots.
- [ ] Run focused test red if the old stage-four projection jumps.
- [ ] Tune renderer color and key/fill/rim intensity, introduce a restrained contact cue via CSS/scene without blocking hit testing, keep natural model textures and subtle crumbs.
- [ ] Run `pnpm test`, `pnpm build`, `pnpm test:browser`, inspect four-stage pixel bounds and `git diff --check`, verify current live preview URL.
- [ ] Report limitations honestly if no image-capable viewer is available.
