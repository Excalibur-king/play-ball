# Garden Defense

Minimal browser-game validation for a whimsical garden lane-defense game. The player-facing loop is pure game UI; the backend keeps a hidden director endpoint for future model-driven pacing.

## Run

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

The frontend can run without the API because the hidden director has a local fallback. Start the API to exercise the reserved backend entry.

## Documentation

- [Gameplay Document](docs/design/gameplay.md): current player-facing loop, rules, tuning tables, and implementation references.
- [Art Pipeline](docs/design/art-pipeline.md): runtime art contract, style direction, folder layout, naming rules, and export checklist.
- [Code 5 Merge Notes](docs/design/code5-merge-notes.md): records what was merged from `code 5`, what was rejected, and the decision boundary used for the merge.

## Premium Asset Pipeline

The battle scene now loads art through a manifest-driven resource layer:

- `apps/web/src/game/assets/assetManifest.ts`: preload manifest plus building / enemy / FX visual specs.
- `apps/web/src/game/phaser/PreloadScene.ts`: central preload entry for atlases and unit SVGs.
- `apps/web/src/game/phaser/renderers/*`: scene adapters that only consume manifest keys.
- `apps/web/public/assets/game/units/**`: static battle-ready unit art keyed by gameplay ids.
- `apps/web/public/assets/game/atlases/fx-premium.webp`: generated projectile and impact frames.

Regenerate the current FX atlas with:

```bash
pnpm assets:generate
```

The generator is intentionally deterministic and project-local. When final artist or AI-generated frame strips arrive, keep the same manifest keys and frame naming conventions so renderers do not need to change.

Frame naming convention:

```text
building/{buildingId}/idle/0001
enemy/{enemyId}/walk/0001
projectile/basic_bolt/fly/0001
fx/projectile_impact/burst/0001
```

Runtime loading is centralized in `apps/web/src/game/assets/assetManifest.ts` and `apps/web/src/game/phaser/PreloadScene.ts`.

## Architecture

- `apps/web`: React shell, Phaser canvas, DOM HUD, seed bank, hidden director hook.
- `apps/api`: Fastify service with health, content, and hidden director endpoints.
- `packages/game-core`: pure lane-defense simulation rules and commands.
- `packages/game-content`: lawn, plant, zombie, and wave definitions.
- `packages/shared`: API contracts shared by frontend and backend.

## Frontend Collaboration Boundaries

The frontend is split so teammates can work without fighting one large scene file:

- `apps/web/src/ui`: React DOM overlay. Owns HUD layout, seed buttons, actions, and store subscriptions.
- `apps/web/src/game/bridge`: the only command/snapshot bridge between React and Phaser.
- `apps/web/src/game/phaser`: Phaser lifecycle, preload, canvas scene orchestration, input plumbing, and renderers.
- `apps/web/src/game/phaser/renderers`: disposable view objects that mirror `game-core` state into sprites, tweens, bars, and effects.
- `apps/web/src/game/assets`: manifest-driven asset keys and URLs.
- `apps/web/src/styles`: global base theme, stage layout, and HUD overlay CSS split by responsibility.

Rules of thumb:

- React should dispatch `GameCommand` and render `HudSnapshot`; it should not mutate simulation state.
- Phaser should read `GameEngine.state`, render it, and forward board input; it should not define combat or economy rules.
- `packages/game-core` is the gameplay source of truth and must stay free of Phaser, React, DOM, network, and asset imports.
- `packages/game-content` is where new plants, zombies, waves, and lawn geometry should start.

## Game-Core Split

`packages/game-core/src` is organized by rule ownership:

- `engine.ts`: public facade used by the Phaser scene.
- `types.ts`: serializable run state, commands, transient events, and HUD snapshots.
- `state.ts`: initial run creation.
- `commands.ts`: direct player commands such as placing plants and starting waves.
- `systems/sunEconomy.ts`: passive sun and sunflower generation.
- `systems/plants.ts`: plant firing behavior.
- `systems/projectiles.ts`: projectile travel and hit resolution.
- `systems/zombies.ts`: zombie movement, bites, plant destruction, and base damage.
- `systems/waves.ts`: zombie spawning and wave completion.
- `selectors.ts`: read-only projections for world metadata, summaries, and HUD data.
