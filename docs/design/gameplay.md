# Garden Defense Gameplay Document

- Document status: Prototype gameplay brief
- Last updated: 2026-05-01
- Primary owner: Gameplay / design
- Implementation source of truth: `packages/game-core` and `packages/game-content`

## 1. Overview

Garden Defense is a browser lane-defense game. The player protects a 5 x 9 lawn by planting defensive units, generating sun, and surviving a sequence of zombie waves.

The current build is a vertical slice focused on the core combat loop:

1. Select a plant from the seed bank.
2. Spend sun to place it on an empty lawn cell.
3. Click an occupied plant with a different selected seed to create a one-time fused plant.
4. Start the next wave when ready.
5. Plants generate resources, block enemies, or fire projectiles.
6. Zombies advance from right to left, attack plants in their lane, and damage the base if they cross the house line.
7. Dangerous zombies punish normal plants, so the player must prepare defensive fusions.
8. Clear all waves to win. Let too many zombies reach the house and the run is lost.

## 2. Design Goals

- Keep the first playable loop readable: every plant has one clear role.
- Reward preparation before starting each wave.
- Create a simple economy tension between early defense and future sun generation.
- Make plant fusion a readable upgrade layer without adding a separate menu.
- Give dangerous zombies a strong silhouette and a clear counter.
- Keep simulation rules deterministic and independent from rendering, UI, or backend services.
- Leave room for future model-driven pacing while keeping all visible gameplay understandable to the player.

## 3. Player Objective

The player must protect the house through all available waves.

- Win condition: all zombies from the final wave are defeated.
- Lose condition: base HP reaches 0.
- Current base HP: 3.
- Current total waves: 4.

## 4. Game Flow

### Ready Phase

The run starts in `ready`.

- Initial sun: 150.
- Initial selected plant: Sunflower.
- The player may place plants before triggering a wave.
- The player may fuse a selected seed into an existing unfused plant.
- The Start button begins the next wave.

### Playing Phase

During `playing`, zombies spawn according to the active wave definition.

- The player can still select, place, and fuse plants if they have enough sun and the selected seed is not cooling down.
- Cooldowns, sun generation, projectile combat, zombie movement, and bite attacks update continuously.
- When the wave has spawned all zombies and no zombies remain alive, the wave is cleared.

### End States

- `won`: final wave cleared.
- `lost`: base HP reaches 0.
- Reset starts a fresh run from the initial state.

## 5. Board

The lawn is a fixed grid.

| Property | Value |
| --- | ---: |
| Rows | 5 |
| Columns | 9 |
| Zombie direction | Right to left |
| Plant placement | One plant per empty cell |
| Plant fusion | Selected seed into an occupied unfused cell |
| Zombie spawn side | Right side of lawn |
| Base / house line | Left side of lawn |

Plants are placed by selecting a seed and clicking a valid empty grid cell. Clicking an occupied cell attempts fusion instead. Invalid placement or fusion attempts are ignored by the gameplay layer.

## 6. Resources

Sun is the only current spendable resource.

| Source | Amount | Timing |
| --- | ---: | --- |
| Passive sun drip | 25 | Every 7.5 seconds |
| Sunflower production | 25 | Every 7 seconds per Sunflower |

The hidden director may adjust passive sun drip speed within a clamped range. Sunflower output is currently not modified by the director.

## 7. Plants

| Plant | Role | Cost | Cooldown | HP | Behavior |
| --- | --- | ---: | ---: | ---: | --- |
| Pea Shooter | Damage | 100 | 5.5s | 130 | Fires at zombies in the same row. |
| Sunflower | Economy | 50 | 6.0s | 110 | Generates sun over time. |
| Wall-nut | Blocker | 50 | 9.0s | 420 | Absorbs zombie attacks. |

## 8. Plant Fusion

Fusion is the first upgrade layer.

- A plant can fuse only once.
- Only two different plant types can fuse.
- Fusion is performed by selecting a seed, then clicking an existing unfused plant.
- Fusion spends the selected seed cost and starts that seed cooldown.
- The fused plant keeps both component roles.
- Current numeric rule: HP, damage, and sun amount are additive. Single-source timings such as fire interval and sun interval are inherited from the component that provides that behavior.

Available fusions:

| Fusion | Components | Combined Role | Current Effect |
| --- | --- | --- | --- |
| Solar Pea | Pea Shooter + Sunflower | Damage + Economy | Shoots peas and produces sun. |
| Bulwark Pea | Pea Shooter + Wall-nut | Damage + Blocker | Shoots peas with much higher HP and can block dangerous zombies. |
| Solar Nut | Sunflower + Wall-nut | Economy + Blocker | Produces sun with much higher HP and can block dangerous zombies. |

Danger blocking rule:

- A dangerous zombie destroys ordinary plants in one attack.
- A fused plant that includes Wall-nut is treated as a defensive fusion and can block dangerous zombie attacks using normal damage rules.
- If a second blocker-type plant is added later, this rule can be tightened to require two blocker components.

### Fusion Art Direction

Fused plants should read as one upgraded unit, not two unrelated sprites stacked together.

| Fusion | Visual Treatment |
| --- | --- |
| Solar Pea | Pea Shooter body, sunflower halo, gold motes, warm yellow-green aura. |
| Bulwark Pea | Pea Shooter body, nut-shell side armor, shield rim, sturdy green-brown aura. |
| Solar Nut | Wall-nut shell, smaller sunflower face/halo, amber defensive glow. |

Shared art rules:

- Keep the plant footprint inside one grid cell.
- Use a ring, aura, or small secondary motifs to communicate fusion.
- Avoid large UI labels over the live playfield.
- Dangerous-counter fusions should include shield or shell language.

### Pea Shooter Combat

- Fire interval: 1.25 seconds.
- Projectile damage: 24.
- Projectile speed: 360.
- A Pea Shooter fires only when a zombie is in the same row and generally in front of it.
- Projectiles hit the nearest valid zombie in their row when close enough.

### Sunflower Economy

- Produces 25 sun every 7 seconds.
- New Sunflowers begin with partial progress toward their first production tick, so the first payout arrives sooner than a full interval.

### Wall-nut Blocking

- Has high HP and no attack.
- Its job is to hold zombies in place so damage plants can finish them.

## 9. Zombies

| Zombie | Category | HP | Speed | Damage | Attack Interval | Role |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Shambler | Normal | 84 | 19 | 18 | 1.05s | Basic pressure enemy |
| Conehead | Dangerous | 165 | 16 | 22 | 1.10s | Tougher lane breaker that shreds ordinary plants |

Zombies walk left until they find a plant within bite range in the same row. While attacking, they stop moving and damage that plant on their attack interval. When a plant reaches 0 HP, it is removed from the board.

If a zombie crosses the house line, it is removed and the base loses 1 HP.

Dangerous zombie presentation:

- Red ground aura.
- Small danger badge above the zombie.
- Slight warm tint to separate it from normal enemies.

## 10. Waves

| Wave | Total Zombies | Spawn Interval | HP Multiplier | Mix |
| --- | ---: | ---: | ---: | --- |
| 1 | 6 | 4.2s | 1.00 | Normal only |
| 2 | 9 | 3.4s | 1.08 | Mostly normal, light dangerous pressure |
| 3 | 13 | 2.75s | 1.18 | Mixed normal / dangerous |
| 4 | 18 | 2.25s | 1.32 | Heavy mixed pressure |

Implementation notes:

- The first zombie of a wave spawns after a short 1.2 second delay.
- Lane selection is deterministic so runs are reproducible.
- Zombie type selection uses weighted wave mix data.
- Spawn interval is clamped to a minimum of 0.9 seconds after pacing adjustments.

## 11. Hidden Director

The hidden director is a reserved pacing layer. It can tune the run, but hard clamps prevent it from rewriting balance.

| Adjustment | Clamp |
| --- | --- |
| Spawn interval multiplier | 0.75 to 1.25 |
| Zombie HP multiplier | 0.85 to 1.20 |
| Passive sun drip multiplier | 0.85 to 1.25 |

The current player-facing gameplay must still come from `game-core`. The director should only influence pacing through explicit adjustment commands.

## 12. HUD And Controls

Current HUD surfaces:

- Sun counter.
- Seed bank with plant cost, role, selection, and cooldown state.
- Wave, base, fusion count, zombie count, and dangerous zombie count.
- Start, Pause / Resume, and Reset controls.
- Ready, win, and loss status messaging.

Controls:

- Select a seed from the seed bank.
- Click a lawn cell to place the selected plant.
- Click an occupied unfused plant with a different selected seed to fuse.
- Press Start to begin the next wave.
- Press Pause / Resume to toggle simulation updates.
- Press Reset to restart the run.

HUD guidance:

- Keep fusion as a lightweight board interaction, not a separate inventory panel.
- Keep dangerous zombie warnings in the playfield visuals and compact stats, not center-screen prompts.
- Preserve the center and lower-middle playfield for reading lanes.

## 13. Current Non-Goals

These are not part of the current prototype loop:

- Manual sun collection.
- Plant removal, unfusing, or shoveling.
- Three-part plant fusions.
- Lawn mowers or emergency lane saves.
- Multiple levels or map variants.
- Meta-progression, upgrades, or roguelike rewards.
- Player abilities beyond plant placement.

## 14. Implementation Map

Gameplay changes should usually touch these files first:

| Area | Path |
| --- | --- |
| Plant, fusion, zombie, lawn, and wave data | `packages/game-content/src/index.ts` |
| Run state, commands, events, HUD snapshot types | `packages/game-core/src/types.ts` |
| Initial run values | `packages/game-core/src/state.ts` |
| Plant placement, fusion, and wave start commands | `packages/game-core/src/commands.ts` |
| Fused plant stat aggregation and dangerous-blocking checks | `packages/game-core/src/plantStats.ts` |
| Sun economy | `packages/game-core/src/systems/sunEconomy.ts` |
| Plant firing | `packages/game-core/src/systems/plants.ts` |
| Projectile movement and hits | `packages/game-core/src/systems/projectiles.ts` |
| Zombie movement, biting, and base damage | `packages/game-core/src/systems/zombies.ts` |
| Wave spawning and completion | `packages/game-core/src/systems/waves.ts` |
| HUD projections | `packages/game-core/src/selectors.ts` |
| Plant fusion visuals | `apps/web/src/game/phaser/renderers/PlantRenderer.ts` |
| Dangerous zombie visuals | `apps/web/src/game/phaser/renderers/ZombieRenderer.ts` |

Rendering and presentation should stay in `apps/web`. Gameplay rules should remain in `packages/game-core` or `packages/game-content`.

## 15. Documentation Maintenance

Update this document in the same change as any gameplay-facing rule or tuning change.

Recommended workflow:

1. Update the relevant rule or content data.
2. Update the matching section in this document.
3. Verify that README links and implementation references still point to the right files.
4. Add a short note to this section if the change significantly alters the player loop.

## 16. Change Notes

| Date | Change |
| --- | --- |
| 2026-05-01 | Added plant fusion, zombie categories, dangerous zombie counterplay, and fusion art direction. |
| 2026-05-01 | Added first gameplay document based on the current prototype implementation. |
