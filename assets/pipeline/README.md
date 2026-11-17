# Asset pipeline sources

The active Python entry points are in tools/. This directory retains historical source copies; some differ from tools/ and must not replace the active implementation. Food-specific pipeline scripts may also require optional local inputs.

## Runtime release workflow

```sh
python tools/assets.py inventory --runtime-only
python tools/assets.py verify --runtime-only
```

These package assets:inventory/assets:verify commands work without source or processed archives. Runtime inventory updates manifest.runtimeFiles from the sole final public/models-runtime root while preserving existing provenance fields. The manifest records every final and compatibility GLB, including files outside the current catalog. Runtime roots must be exactly {"unified":"public/models-runtime"}. Menu previews and tasting at every viewport share those files. The current 32 files cover 24 catalog stages plus four chocolate and four canned compatibility stages.

Production Vite builds disable wholesale public copying. Only public/models-runtime models registered in runtimeFiles, plus public/foods and public/audio, enter the static output. Development public URLs retain their existing behavior.

## Optional local archive processing

The original Python inventory(), verify() and sync() APIs and CLI modes remain strict and require local source/processed inputs. Legacy optimize-models.mjs and build-desktop-models.py also require original public/models files. These files and historical artifacts stay on disk but are not Git release inputs. Git retains final runtime models, source code, tests, configuration, the lockfile and license/source attribution files.

The older simplify=0.35, texture downscaling and WebP recipe includes lossy operations. It is not this round's visually reviewed precision-compression recipe and must not be applied to accepted final models without candidate review.

Processing should be deterministic. Write new candidates, backups, scripts, parameters, source/output hashes, bounds, screenshots and validation reports beneath the project .codex directory. Never delete original assets or historical local evidence as part of packaging. Legacy inventory preserves the accepted runtime manifest; legacy sync only writes public/models-mobile and public/models-desktop and records .codex/assets/last-sync.json. Neither publishes into models-runtime. Promote reviewed candidates separately, then regenerate runtime-only inventory and verify the final release manifest before building. Runtime inventory replaces stale runtimeRoots keys while preserving source/provenance fields. Legacy public/models, models-mobile and models-desktop remain available locally and are excluded from production output.
