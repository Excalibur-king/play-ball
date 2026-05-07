# Code 5 Merge Notes

- Date: 2026-05-05
- Scope: compare `/Users/a0000/Documents/game/code` with sibling workspace `code 5`
- Decision rule: preserve the current project's AI director system as the source of truth; only merge UI, art, and rendering changes that can stand on their own

## Accepted

### 1. Frontend debug panel removal

Merged into current project:

- Removed the DOM debug surface and its frontend-only state wiring.
- Deleted `DevDebugDock`, `DirectorDebugPanel`, and `StrategyAdviceDebugPanel`.
- Simplified `HUD` so battle UI no longer depends on debug snapshots.

Reason:

- The debug panel was not providing enough value to justify the extra UI noise and store complexity.

Main files:

- `apps/web/src/ui/HUD.tsx`
- `apps/web/src/ui/gameUiStore.ts`
- `apps/web/src/ui/useEnemyDirector.ts`
- `apps/web/src/ui/useStrategyCardAdvice.ts`

### 2. Battle advice hook-up

Merged into current project:

- `useBattleAdvice()` is now mounted from the battle page runtime.
- Tightened `useBattleAdvice` request lifecycle so stale or empty card-select requests are canceled more cleanly.

Reason:

- The current project already had the advice pipeline and HUD slot, but it was not actually wired into the battle runtime.

Main files:

- `apps/web/src/app/pages/BattlePage.tsx`
- `apps/web/src/ui/useBattleAdvice.ts`

### 3. Energy counter skin

Merged into current project:

- Switched the top-left energy counter from icon-plus-text to the image-based `energy_value.png` treatment.
- Added matching HUD CSS for the image overlay layout.

Reason:

- This is a pure presentation upgrade and does not affect gameplay, AI, or HUD data contracts.

Main files:

- `apps/web/src/ui/SunCounter.tsx`
- `apps/web/src/styles/hud.css`
- `apps/web/public/assets/ui/energy_value.png`

### 4. Melee turret attack animation

Merged into current project:

- Added the `melee-turret-attack` atlas.
- Extended the asset manifest with melee turret attack animation metadata.
- Added `PlantRenderer.playAttackAnimation(...)`.
- Triggered the melee attack animation from projectile fire events.

Reason:

- This is an isolated render-layer enhancement with no dependency on AI director behavior.

Main files:

- `apps/web/src/game/assets/assetManifest.ts`
- `apps/web/src/game/phaser/renderers/PlantRenderer.ts`
- `apps/web/src/game/phaser/renderers/EffectsRenderer.ts`
- `apps/web/public/assets/game/atlases/melee-turret-attack.png`
- `apps/web/public/assets/game/atlases/melee-turret-attack.json`

### 5. Building base art PNG refresh

Merged into current project:

- Repointed building runtime art from SVG base files to PNG base files for:
  - `energy_core`
  - `melee_turret`
  - `ranged_turret`
  - `laser_turret`
  - `lava_wall`
- Synced the art pipeline document to match the runtime contract.

Reason:

- The PNG assets are part of the same visual upgrade as the melee attack animation and are self-contained in the render pipeline.

Main files:

- `apps/web/src/game/assets/assetManifest.ts`
- `docs/design/art-pipeline.md`
- `apps/web/public/assets/game/units/buildings/**/base.png`

## Rejected

### 1. Any AI director simplification

Rejected from `code 5`:

- Removal of director policy constraints
- Removal of recent director history
- Removal of director outcome tracking
- Simplification of director preview from structured object to plain string
- Prompt, schema, and shared contract downgrades

Reason:

- The current project's AI director system is explicitly the source of truth and must not be regressed by `code 5`.

Representative files kept from current project:

- `apps/api/src/directorParams.ts`
- `packages/game-core/src/director.ts`
- `packages/game-core/src/types.ts`
- `packages/shared/src/index.ts`
- `packages/game-content/balance/waves.ts`

### 2. Director lane preview removal

Rejected from `code 5`:

- Removing `DirectorLanePreviewRenderer`
- Removing the related `@tower-rogue/game-content` dependency used by that renderer path

Reason:

- The current project already has a stronger director telegraphing layer and this remains useful after the debug panel removal.

Representative files kept from current project:

- `apps/web/src/game/phaser/BattleScene.ts`
- `apps/web/src/game/phaser/renderers/DirectorLanePreviewRenderer.ts`
- `apps/web/package.json`

### 3. HUD information downgrade

Rejected from `code 5`:

- Removing structured director preview cards from the HUD
- Replacing them with a single plain-text preview line
- Removing strategy recommendation summary lines already present in the current project

Reason:

- The current project's HUD carries more actionable information and aligns with the richer AI director output that we intentionally kept.

Representative files kept from current project:

- `apps/web/src/ui/HUD.tsx`
- `apps/web/src/ui/CardChoicePanel.tsx`
- `apps/web/src/styles/hud.css`

### 4. Unused or non-runtime assets

Rejected from `code 5`:

- Chinese-named UI reference images that were not wired into runtime code
- Any extra files that did not have a clear live consumer in the current build

Reason:

- Keep the runtime asset set deliberate and avoid importing reference scraps into the main project without code usage.

## Merge Boundary

When checking future branches against this merge:

1. AI director behavior, contracts, and prompt context stay owned by the current project.
2. Pure visual upgrades are safe to merge only if they do not remove existing director visibility or gameplay information.
3. Debug-only UI can be removed if it does not break the main player loop.
4. Runtime asset changes must update `assetManifest.ts` and any affected design pipeline docs together.
