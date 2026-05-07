---
name: maintain-game-art-resources
description: Maintain, replace, add, rename, and validate battle art resources in this repository. Use when Codex needs to replace existing art files, add new unit or FX art, wire SVG or atlas assets into Phaser, update `apps/web/src/game/assets/assetManifest.ts`, adjust preload or renderer hookups, regenerate atlases, or keep art naming and folder layout consistent. Trigger on requests such as “替换美术资源”, “新增美术资源”, “接入新图集”, “新增单位立绘”, “更新动画帧”, “把资源挂到 manifest”, or “修复美术资源加载/播放”. 
---

# Maintain Game Art Resources

## Overview

Keep all battle-scene art changes inside the repo's runtime asset contract:

- `apps/web/public/assets/game/units/**` for static unit art
- `apps/web/public/assets/game/atlases/**` for generated atlas textures and metadata
- `apps/web/src/game/assets/assetManifest.ts` for stable runtime keys and visual specs
- `apps/web/src/game/phaser/PreloadScene.ts` for preload and animation registration
- `apps/web/src/game/phaser/renderers/*` for manifest-driven playback only
- `docs/design/art-pipeline.md` for folder, naming, and export rules

Do not wire raw asset paths directly inside gameplay code or scene logic. Route every runtime asset through the manifest first.

## Style Direction Gate

Before replacing, adding, or prompting new art, open `.codex/skills/unify-game-art-style/SKILL.md` when the request includes any of these:

- visual style changes
- prompt writing for image generation
- theme or chapter art direction
- matching new runtime assets to the homepage and existing battle style

Use `unify-game-art-style` to keep the world tone, palette language, and prompt wording aligned. Then use this skill to handle runtime file layout and wiring.

## Route The Request

Classify the request before editing files.

### Replace Existing Art With The Same Runtime Key

Use this path when the gameplay id and runtime key stay the same.

- Replace the existing file under `apps/web/public/assets/game/units/**` or `apps/web/public/assets/game/atlases/**`.
- Keep folder names, file names, and frame prefixes unchanged.
- Update `assetManifest.ts` only if dimensions, offsets, frame names, display size, or animation settings changed.
- Avoid touching renderers unless the new art requires a different visual state or timing.

### Add New Art For An Existing Gameplay Id

Use this path when the building or enemy id already exists in `packages/game-content`.

- Add the file under the matching gameplay-id folder.
- Keep folder names exactly equal to the gameplay id, such as `energy_core` or `ash_wing`.
- Add or update the matching texture and visual spec in `apps/web/src/game/assets/assetManifest.ts`.
- Keep `PreloadScene` and renderers manifest-driven; do not introduce ad hoc file-path loading.

### Add Art For A Brand-New Gameplay Id

Use this path when the request introduces a new building or enemy, not just a new picture.

- Confirm the id exists or is being added in `packages/game-content/balance/*.ts`.
- Match the art folder name to that gameplay id exactly.
- Add the new runtime key and visual spec to `assetManifest.ts`.
- Update the relevant renderer only if the existing manifest schema cannot express the new behavior.

### Add Or Replace FX / Atlas Animation

Use this path for projectile, hit, burst, and other frame-based effects.

- Keep atlas frame prefixes aligned with `docs/design/art-pipeline.md`.
- Update `assetManifest.animations` with the public animation key, prefix, frame count, frame rate, and repeat rule.
- Update `scripts/generate-premium-assets.mjs` if the generated atlas content changes.
- Consume the animation from renderers with `sprite.play(animationKey)`, not hardcoded frame loops.

## Edit Order

Use this order unless the request clearly needs something else.

1. Open `docs/design/art-pipeline.md` and verify the expected folder layout, naming, and export constraints.
2. Identify the affected gameplay ids in `packages/game-content/balance/buildings.ts` or `packages/game-content/balance/enemies.ts` when ids are part of the request.
3. Add or replace the art files in `apps/web/public/assets/game/units/**` or `apps/web/public/assets/game/atlases/**`.
4. Update `apps/web/src/game/assets/assetManifest.ts` so runtime keys, dimensions, offsets, and animation config match the art.
5. Update `apps/web/src/game/phaser/PreloadScene.ts` only when a new preload category is needed.
6. Update `apps/web/src/game/phaser/renderers/*` only when the existing manifest schema cannot express the new playback behavior.
7. Update `docs/design/art-pipeline.md` if the contract changed, not merely because a file was swapped.

## Runtime Rules

Preserve these rules while working.

- Treat `assetManifest.ts` as the public runtime contract for art.
- Keep renderers keyed by gameplay ids and manifest keys, never by raw disk paths.
- Prefer adding manifest fields before branching renderer logic by individual unit ids.
- Keep `BattleScene` thin; animation and playback decisions belong in renderers.
- Keep atlas frame names zero-padded to four digits.
- Keep static unit art on transparent backgrounds with no baked ground shadow.

## File Touchpoints

Open only the relevant files for the request.

### Static Unit Art

- `apps/web/public/assets/game/units/buildings/{buildingId}/base.svg`
- `apps/web/public/assets/game/units/enemies/{enemyId}/base.svg`
- `apps/web/src/game/assets/assetManifest.ts`
- `apps/web/src/game/phaser/renderers/PlantRenderer.ts`
- `apps/web/src/game/phaser/renderers/ZombieRenderer.ts`

### FX And Frame Animation

- `apps/web/public/assets/game/atlases/fx-premium.webp`
- `apps/web/public/assets/game/atlases/fx-premium.json`
- `scripts/generate-premium-assets.mjs`
- `apps/web/src/game/assets/assetManifest.ts`
- `apps/web/src/game/phaser/renderers/ProjectileRenderer.ts`
- `apps/web/src/game/phaser/renderers/EffectsRenderer.ts`

### Contract And Naming

- `docs/design/art-pipeline.md`
- `README.md`

## Validation

Run the smallest validation set that proves the change is wired correctly.

### Always Run

- `pnpm --filter @tower-rogue/web typecheck`

### Run When FX Atlas Content Or Generator Changes

- `pnpm assets:generate`

### Run When Manifest Or Renderer Wiring Changes

- `pnpm --filter @tower-rogue/web build`

### Use Search Checks When Renaming Or Cleaning Up

- `rg -n "old-key|old-folder|old-frame-prefix" apps/web/src apps/web/public docs scripts`

## Finish The Change

Report the result in terms of the art contract, not just the file swap.

- Name the gameplay ids and manifest keys affected.
- Say whether the change was a pure asset swap or required manifest / renderer wiring.
- Mention which validation commands ran.
- Call out any remaining manual review needs, such as browser-side visual inspection or final artist replacement.
