# Food-Focus Redesign

## Purpose
The burger is the interface, not a preview beside a command button. A tap directly on the model takes a bite; dragging rotates it. The page should feel like a concise, carefully lit food portrait without tabletop frames, counters, or decorative cards.

## Layout
A compact wordmark and help control sit at the top. The burger occupies the main central space with a soft, restrained shadow for grounding. The lower band holds the food name and a quiet, legible instruction to tap or drag. Only failure recovery and the finished-state replay are buttons. The finished state replaces the model with concise completion copy and a replay command.

## Visual Direction
Cool white #FFFFFF, mist gray #F3F4F2, charcoal #252722, tomato red #B84B36 and toasted gold #C69152. The latter hues should come mainly from the model, not large UI fills. Typography should be compact and distinctive; no generic CTA, decorative blocks, or redundant descriptive slogans. Light the existing textured model with a directed warm key, gentle neutral fill and restrained rim; preserve physically based texture colors and evaluate sRGB output and tone mapping instead of applying blanket saturation filters.

## Projection And Behavior
The existing source GLBs have inconsistent bounding dimensions. Use one fixed camera and shrink-only per-stage calibration constrained by both width and height, not just X width. For the real source fixtures, projected width and height must decrease strictly at every stage, with the fourth remnant clearly smaller than the third. Keep a common floor baseline. The underlying 8-bite-per-stage sequence, direct hit test, drag isolation, keyboard activation, retries, reduced-motion, and replay remain intact.

## Verification
Red-green tests cover 3D size calibration, disappearance of the eat button, direct pointer activation and help copy. Browser tests capture all stages at settled idle on desktop and mobile and measure visible food bounds; run typecheck, unit tests, browser tests and build. Image inspection may be unavailable in the current runtime; report that limitation explicitly rather than claiming a subjective visual review.
