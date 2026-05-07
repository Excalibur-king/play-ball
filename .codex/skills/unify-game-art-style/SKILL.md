---
name: unify-game-art-style
description: Keep this repository's visual theme, prompt wording, and generated art assets stylistically consistent. Use when Codex needs to decide or adjust题材/画风, write image-generation prompts, replace or add美术资源, restyle UI surfaces, or keep homepage packaging and battle art aligned. Trigger on requests such as “改画风”, “统一风格”, “出提示词”, “生成建筑/敌人/卡牌/图标”, “替换美术资源”, “调整首页样式”, or “给这套资源定题材”.
---

# Unify Game Art Style

## Goal

Keep all new visual direction and prompt-writing anchored to one house style:

`Q版像素奇幻 + 浮空群岛冒险 + 元素裂隙章节 + 手游式明亮包装`

This repo should feel like a bright fantasy mobile game on the outside, with chapter-specific danger inside battle maps.

## Default World Tone

Hold these two layers together instead of letting them drift apart.

- Outer shell: floating islands, portals, magic academy energy, bright sky, blue crystal, gold trim, cute mascot energy, collectible mobile-game packaging.
- Battle chapters: elemental danger zones, clearer combat silhouettes, stronger local accents such as volcano, frost, forest, or storm.

For the current chapter direction, treat `黑曜熔炉 / 火山战线` as an accent, not the whole game's personality.

Do not default to grimdark, gore, horror, or realistic dark fantasy unless the user explicitly wants to branch away from the house style.

## Style Anchors In This Repo

Open these files when the request depends on the current visual direction.

- `apps/web/public/assets/ui/menu_background.png`
- `apps/web/public/assets/home-ui/menu-mascot-mage.webp`
- `docs/design/art-pipeline.md`
- `apps/web/src/game/assets/assetManifest.ts`

Use the homepage art to anchor the overall brand tone. Use the art pipeline and manifest only to anchor battle-scene readability and runtime constraints.

## Core Rules

Apply these rules whenever you generate prompts, suggest a new theme, or replace art.

1. Keep silhouettes simple, chunky, and readable at small size.
2. Prefer cute heroic fantasy over dark oppressive fantasy.
3. Use bright focal points, usually crystal cores, magical glow, or elemental seams.
4. Separate the global brand palette from chapter accents.
5. Keep battle assets gameplay-readable before decorative detail.
6. Default to transparent-background single-asset outputs for runtime sprites unless the request is for scene art or key art.
7. When an asset belongs to battle gameplay, preserve the role read at a glance: economy, attack, defense, flying, heavy, boss, UI action, and so on.

## Canonical Master Prompt

Start prompt-writing from this block, then append the specific asset ask.

```text
chibi pixel art fantasy, sky-island adventure world, elemental rift theme, bright and colorful mobile-game presentation, cute magical civilization, anime fantasy mobile game feeling, polished premium pixel art, adorable but readable, clean silhouette, simplified chunky shapes, blue crystal and gold trim visual language, magical engineering, soft glow, heroic and cheerful atmosphere, not dark horror, high readability at small size, cohesive game asset style
```

## Canonical Negative Prompt

Use this block unless the user explicitly asks for a different style branch.

```text
photorealistic, realistic texture, dark horror, gothic horror, grimdark, muddy colors, messy details, low readability, thin silhouette, realistic anatomy, painterly blur, sci-fi hard surface, cyberpunk, steampunk overload, background clutter, text, watermark, UI frame
```

## Asset-Specific Prompt Additions

Append one of these groups after the master prompt.

### Buildings

Use for towers, walls, generators, traps, and other battlefield structures.

```text
cute magical defense building, compact one-tile silhouette, centered composition, transparent background, no ground shadow, clear gameplay role, polished pixel rendering
```

Add role-specific language:

- Economy: `stable non-aggressive structure, glowing crystal core, clearly not a weapon`
- Attack: `clear attack head, readable muzzle or blade, combat-ready but adorable`
- Defense: `low and wide silhouette, thick sturdy body, clearly a blocker not a weapon`

### Enemies

Use for lane enemies, elites, and bosses.

```text
cute but threatening fantasy enemy, readable combat silhouette, asymmetrical creature design, strong elemental accent, battle-ready sprite, transparent background
```

Add role-specific language:

- Fast: `slim body, dynamic motion read, light frame`
- Heavy: `wide body, thick armor masses, slow crushing presence`
- Flying: `clear airborne read, lifted silhouette, wings or floating core`
- Boss: `large focal core, stronger shape hierarchy, premium silhouette`

### Cards And Ability Art

Use for skill cards, reward cards, and spell visuals.

```text
pixel fantasy spell illustration, centered icon-like composition, strong focal action, readable at small card size, bright magical contrast
```

### UI Panels, Buttons, And Icons

Use for menu surfaces and overlay assets.

```text
fantasy mobile game UI, pixel-polished panel art, blue crystal and gold trim, clean hierarchy, bright friendly tone, collectible adventure feel
```

### Environment And Map Art

Use for key art, home scenes, map backdrops, or chapter scenery.

```text
floating-island fantasy environment, magical expedition atmosphere, layered depth, bright sky and cloud sea, chapter accent materials, whimsical but premium pixel art
```

## Chapter Accent Modifiers

Use these after the master prompt when the request belongs to a specific chapter.

### Volcano / Black Forge

```text
volcanic magic accent, obsidian details used sparingly, molten seams, warm lava glow, dangerous but still cute and colorful
```

### Frost

```text
frost magic accent, pale cyan glow, snowy crystal edges, cold but clean and bright, playful winter fantasy
```

### Forest

```text
ancient woodland magic accent, mossy stone, flower glows, living roots, bright natural fantasy
```

### Storm

```text
storm magic accent, charged crystal arcs, deep blue clouds, wind-swept shapes, energetic fantasy
```

## Workflow

Follow this order whenever style consistency matters.

1. Identify the asset layer: homepage/UI shell, battle unit, card art, icon, or environment.
2. Identify the gameplay read that must survive the art pass.
3. Start from the canonical master prompt.
4. Append the asset-specific block.
5. Append the chapter accent only if needed.
6. Append format constraints such as `transparent background`, `single object`, `right-facing`, or `centered composition`.
7. Add the canonical negative prompt.

If the user asks for a different style, say whether it is a small adjustment inside the house style or a deliberate branch away from it.

## Working With Other Skills

- When the request is about runtime asset replacement, addition, manifest wiring, or atlas updates, use this skill together with `maintain-game-art-resources`.
- Use this skill first for visual direction and prompt wording.
- Then use `maintain-game-art-resources` for repo contract, file placement, manifest keys, preload, and renderer wiring.

## Response Pattern

When the user asks for a prompt, prefer returning:

1. A one-line style summary.
2. A ready-to-use positive prompt.
3. A negative prompt.
4. Short notes only when the asset needs runtime constraints such as transparent background or one-tile readability.
