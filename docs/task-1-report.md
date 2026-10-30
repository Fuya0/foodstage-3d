# Task 1 report

Scope: package/configuration, `src/core`, `src/data`, and this report on `feat/burger-viewer`. No UI or production GLB loader was implemented. The approved plan and design were read and left unchanged. Original `public/models` assets were not edited and are excluded from this Task 1 commit.

## Commands and observed evidence

All pnpm commands used the bundled executables and put bundled Node first on PATH for subprocesses. Exact PowerShell setup and invocation pattern:

```powershell
$env:PATH = 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\node\bin;' + $env:PATH
& 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\pnpm\bin\pnpm.mjs' install
& 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\pnpm\bin\pnpm.mjs' test
& 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\fuyao\.dsh\dsh-runtimes\dsh-next-primary-runtime\dependencies\pnpm\bin\pnpm.mjs' build
```

- Install: exit 0, pnpm 10.19.0; lockfile generated. Installed React/ReactDOM 19.3.1, R3F 9.8.2, Three 0.180.0, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7. pnpm warned that esbuild's install script was ignored; Vite/Vitest both subsequently ran successfully using the installed platform binary.
- Tests were written before production logic. Initial red at 12:54:50: 3 suites failed because the new modules did not yet exist (exit 1).
- Export/type stubs then made the tests executable. Behavioral red at 12:55:27: **14 failed, 8 passed**, 3 files failed (exit 1). Examples: eight bites stayed at zero/loading; maximum drag distance stayed zero; asset snapshots were empty; sequential preload made no requests.
- Implementation green at 12:56:46: **22 passed, 3 files passed**, no unhandled errors (exit 0).
- Production scaffold build: `tsc --noEmit && vite build`, exit 0. One static HTML module; emitted `dist/index.html` (0.24 kB). This proves configuration/type compilation, not a playable application.
- Final verification repeats `test`, `build`, and `git diff --check` before committing.

## Public interfaces

### Sequence

```ts
createSequenceState(ready?: readonly number[]): SequenceState
sequenceReducer(state: SequenceState, event: SequenceEvent): SequenceState
// State: stage, bites, phase, ready, run, transition (all readonly)
// phase: loading | idle | waiting | final | eating | finished
// Events:
{ type: 'BITE' }
{ type: 'READY'; stage: number; run: number }
{ type: 'FINAL_DONE' | 'EATING_DONE'; run: number; transition: number }
{ type: 'RESTART' }
```

Initial cached stage zero yields idle immediately. Bites are ignored outside idle. Eight bites either wait for the next ready model or enter final; matching FINAL_DONE enters eating; matching EATING_DONE advances or finishes stage three. Readiness cannot advance a stage. Restart preserves successful readiness and increments run/transition. Animation consumers must capture both tokens when scheduling callbacks and echo them on completion. A stale token is ignored even if the later state has the same phase. Asset effects should synchronize all current ready entries using the current run after restart; an old-run READY is ignored.

### Assets

```ts
new AssetStore<T>(count: number, loader: (index: number) => Promise<T>)
store.load(index: number): Promise<AssetEntry<T>>
store.retry(index: number): Promise<AssetEntry<T>>
store.subscribe(listener: () => void): () => void
store.getSnapshot(): readonly AssetEntry<T>[]
// Entry: {status:'pending'|'loading'} | {status:'ready',asset:T} | {status:'error',error:unknown}
```

`getSnapshot` and `subscribe` are bound, directly usable with `useSyncExternalStore`. Snapshot arrays and entries are frozen and retain reference identity until a status change; parsed asset objects themselves remain untouched. Concurrent requests share a promise. Ready assets are reused, error entries require explicit retry. Loader throws/rejections resolve as error entries, including ignored background loads. After a success, the first unresolved stage is loaded; background loading is sequential and pauses at errors until retry. Constructor does not start network work: call `load(0)` after subscribing/mounting. Explicit foreground calls can request other indices concurrently. Unsubscribe stops notifications; separate stores do not share async state.

### Gesture and manifest

```ts
beginGesture(x: number, y: number, time: number): Gesture
moveGesture(gesture: Gesture, x: number, y: number): Gesture
endGesture(gesture: Gesture, x: number, y: number, time: number, cancelled?: boolean): TapInput
isTap(input: {maxDistance: number; duration: number; cancelled: boolean}): boolean
manifest: readonly FoodStage[] // { url, bites, calibration: { scale, position, yaw } }
```

Positions are CSS pixels and timestamps milliseconds from one clock. Pass every pointer move and final pointerup position; pass `cancelled=true` for pointercancel. Maximum displacement persists after returning to origin. A tap requires displacement strictly below 6 px and duration at most 250 ms. Manifest contains four original model URLs and eight bites each; identity calibration is provisional for visual inspection in Task 2.

## Tests and remaining concerns

- Sequence (6): initial gating/readiness, eight-bite cap, transition ordering, waiting retention/resume, 32-bite finish, restart/cache and stale same-phase/run/transition events, invalid readiness.
- Gesture (10): 6 px exclusive boundary, 250 ms inclusive boundary, long press, cancelled input, invalid timing/distance, drag out-and-back, final position.
- Assets (6): request deduplication, stable immutable snapshots, cache, sequential background order, parse failure/retry/resume, synchronous throw without unhandled rejection, unsubscribe and instance isolation, invalid indices/count.
- `dev`, `test`, `typecheck`, `build`, `preview` scripts are present. Playwright is deferred until browser code exists.
- No browser/WebGL or mobile-device behavior has been claimed or tested. The HTML root has no entry script until Task 2. No production loader, timer, scene, or view code is included.
- The injectable loader must resolve only after GLB parsing finishes. Consumers own component lifetime, store lifetime and animation cleanup. Notifications assume normal non-throwing subscriber callbacks.
- Identity model calibration needs visual validation against original model dimensions; do not change geometry/material/texture assets to compensate.
