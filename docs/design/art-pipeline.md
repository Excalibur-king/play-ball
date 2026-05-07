# Garden Defense Art Pipeline

- Document status: active runtime contract
- Last updated: 2026-05-05
- Primary owner: web / render / art collaboration

## 1. Style Direction

Current target style: `Obsidian Forge` / `黑曜熔炉`

- Core material language: black basalt, cracked obsidian, molten seams, pale brass trims.
- Light behavior: warm internal glow instead of flat surface highlights.
- Readability priority: silhouettes must read from a distance before detail reads.
- Gameplay mood: dangerous but not photoreal, graphic and slightly ceremonial rather than cute garden whimsy.

Per faction:

- Buildings: stable, engineered, squat, intentional, with bright focal cores.
- Enemies: asymmetrical, more feral, stronger lava exposure, less brass than buildings.
- FX: short, hot, high-contrast bursts with clean directional motion.

## 2. Runtime Contract

The runtime source of truth for visual loading is:

- `apps/web/src/game/assets/assetManifest.ts`
- `apps/web/src/game/phaser/PreloadScene.ts`
- `apps/web/src/game/phaser/renderers/*`

Rules:

- Renderers may only reference manifest keys, never raw file paths.
- Gameplay ids from `packages/game-content` are the naming source of truth.
- If art is renamed on disk, only the manifest should need updating.
- New units should not require branching renderer code just to load a different file.

## 3. Directory Layout

All runtime art for the battle scene should live under:

```text
apps/web/public/assets/game/
  units/
    buildings/
      energy_core/
        base.png
      melee_turret/
        base.png
      ranged_turret/
        base.png
      laser_turret/
        base.png
      lava_wall/
        base.png
    enemies/
      ember_grunt/
        base.svg
      spark_runner/
        base.svg
      basalt_smasher/
        base.svg
      ash_wing/
        base.svg
      volcano_core_beast/
        base.svg
  atlases/
    fx-premium.webp
    fx-premium.json
    melee-turret-attack.png
    melee-turret-attack.json
```

Future expansions:

- `units/buildings/{buildingId}/attack.webp` only if a static override is truly needed.
- `portraits/` for HUD or codex art.
- `environment/` for lawn, house, lane props, and scene decals.

## 4. Naming Rules

Folder names:

- Must exactly match gameplay ids: `energy_core`, `ash_wing`, `volcano_core_beast`.
- Use lowercase snake_case only.
- No Chinese, spaces, or version suffixes in runtime folders.

Static file names:

- `base.svg` / `base.png`: default in-battle appearance.
- `upgrade.svg`: optional overlay or alternate upgraded state later.
- `portrait.svg`: optional HUD-only render, not used by battle scene by default.

Loader key rules inside the manifest:

- Building base: `building:{buildingId}:base`
- Enemy base: `enemy:{enemyId}:base`
- Projectile animation: `projectile:{projectileId}:fly`
- FX animation: `fx:{effectId}:burst`

Examples:

- `building:energy_core:base`
- `enemy:ash_wing:base`
- `projectile:basic_bolt:fly`
- `fx:projectile_impact:burst`

## 5. Atlas Frame Prefix Rules

When a unit graduates from a static SVG into an animated atlas, frame names should follow:

```text
building/{buildingId}/idle/0001
building/{buildingId}/attack/0001
building/{buildingId}/hit/0001
enemy/{enemyId}/walk/0001
enemy/{enemyId}/attack/0001
enemy/{enemyId}/hit/0001
enemy/{enemyId}/die/0001
projectile/{projectileId}/fly/0001
fx/{effectId}/burst/0001
```

Notes:

- Four-digit zero padding is required.
- Use action words from this list unless code explicitly asks for a new state.
- Keep one atlas action per consistent silhouette state. Do not mix idle and attack frames in one prefix.

## 6. Export Specs

Static unit SVG baseline:

- Standard building / enemy canvas: `160 x 160`
- Heavy or flying canvas: `176 x 176`
- Boss canvas: `192 x 192`
- Transparent background only
- Default facing: right

Composition rules:

- Keep the visual footprint inside one cell width unless the unit is intentionally large.
- Leave 8% to 12% transparent breathing room around the silhouette.
- Put the contact line near the lower 82% to 88% of the canvas height.
- Brightest focal point should sit near upper-middle, not at the feet.
- Avoid detached tiny particles in the base file; move them into FX if they animate independently.

## 7. Current Required Runtime Assets

Buildings:

- `units/buildings/energy_core/base.png`
- `units/buildings/melee_turret/base.png`
- `units/buildings/ranged_turret/base.png`
- `units/buildings/laser_turret/base.png`
- `units/buildings/lava_wall/base.png`

Enemies:

- `units/enemies/ember_grunt/base.svg`
- `units/enemies/spark_runner/base.svg`
- `units/enemies/basalt_smasher/base.svg`
- `units/enemies/ash_wing/base.svg`
- `units/enemies/volcano_core_beast/base.svg`

FX atlas frames:

- `projectile/basic_bolt/fly/0001`
- `fx/projectile_impact/burst/0001`
- `building/melee_turret/attack/0001`

Atlas files:

- `atlases/melee-turret-attack.png`
- `atlases/melee-turret-attack.json`

## 8. Artist Handoff Checklist

Before a file is considered ready to drop into the repo:

- Folder path matches the gameplay id exactly.
- The unit still reads clearly at 80% scale.
- The silhouette still reads on a warm green lawn background.
- No baked ground shadow in the source art.
- Internal glow is readable without pure white overuse.
- The exported name matches the manifest convention exactly.
