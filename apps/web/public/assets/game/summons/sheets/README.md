# 召唤物 4 宫格雪碧图（AI 生图源图）

本目录存放每个技能的 **2×2 = 4 帧关键帧雪碧图**，由 AI 生图后经 `scripts/process-summon-sheets.mjs` 补成 1:1 正方形（1536×1536）。

> **状态：源图，仅用于流水线输入。** 项目实际加载的是 `scripts/process_summon_frames.py` 处理后的成品，落在 `../frames/<cardId>/f1..f4.png` 与 `../frames/<cardId>.png`（Phaser spritesheet）。要重新出帧时改这里的源图，再重跑 Python 脚本即可。

## 抠色与切割

- 背景统一为 **`#FF00FF` 纯品红（chroma key）**，可在 Aseprite / Photoshop / GIMP / `magick` 中按颜色抠透明。
- 顶部和底部各有 **256 px** 的纯品红留白（左右补边为 0），是为了让总图变成 1:1。切割时按整图宽高对半划分：
  - 子图块：`768 × 768`，每个块内部上下各有约 128 px 留白，左右贴边。
  - 实际美术帧居中，可整体在切片后按 `trim` 去多余品红。
- 子图位置约定（用于动画播放顺序）：

  ```
  ┌─────────────┬─────────────┐
  │  f1 (TL)    │  f2 (TR)    │
  │  起手 / 入  │  蓄力 / 飞  │
  ├─────────────┼─────────────┤
  │  f3 (BL)    │  f4 (BR)    │
  │  爆发 / 击  │  余烬 / 出  │
  └─────────────┴─────────────┘
  ```

## 每张图的语义（用于落场特效设计）

| cardId | 文件 | 4 帧含义（TL→TR→BL→BR） | 推荐落场播放方式 |
| --- | --- | --- | --- |
| `energy_instant_power` | `energy_instant_power.png` | 火花凝聚 → 六芒星成形 → 全屏放射爆发 → 余晖收束 | 在能量核心头顶播 1 次，30 fps，~0.4s 后消失 |
| `emergency_freeze` | `emergency_freeze.png` | 中心冰点 → 时间符文环展开 → 冰晶+暂停符号峰值 → 残留环淡出 | 在被冻线路中点叠加，循环停留 3s，最后一帧延展 |
| `emergency_repair_all` | `emergency_repair_all.png` | 修复符文聚集 → 绿十字成形 → 治疗光环外扩 → 花瓣上升消散 | 在每个建筑头顶各播一次，0.5s |
| `spell_lava_rain` | `spell_lava_rain.png` | 高空小星 → 拖尾下坠 → 落地爆裂 → 火星余烬 | 每发落点独立调用，错时随机 8 次 |
| `summon_flame_hawks` | `summon_flame_hawks.png` | 翅膀↑ → 翅膀→ → 翅膀↓ → 翅膀→ | 持续召唤物循环，6 fps 飞行循环 |
| `summon_furnace_golem` | `summon_furnace_golem.png` | 待机 → 蓄力 → 出拳命中 → 收招 | 持续 25s，待机 + 攻击切换循环 |
| `defense_temp_wall` | `defense_temp_wall.png` | 轮廓成形 → 蜂窝填充 → 满能量脉动 → 稳定常驻 | 出现走 f1→f4，常驻时停在 f4 / 偶尔回闪 f3 |
| `summon_energy_sprite` | `summon_energy_sprite.png` | 翅膀↑ → 翅膀→ → 翅膀↓ → 翅膀→ | 9s 内绕能量核心循环飞行，6 fps |
| `pivot_wall_feedback` | `pivot_wall_feedback.png` | 命中点火花 → 小环展开 → 八芒星反震峰值 → 环淡出 | 仅在墙体被攻击时播 1 次，~0.3s |
| `attack_molten_chain` | `attack_molten_chain.png` | 火球凝聚 → 拖链飞行 → 命中爆裂 → 火星余烬 | 在每次弹跳的目标上独立播放 5 次 |
| `reward_fire_dragon_breath` | `reward_fire_dragon_breath.png` | 龙首入场 → 张口蓄气 → 龙身全屏吐息 → 龙尾出场 | 横向跨场播放 1 次（约 1.2s 跨整屏） |
| `premium_starfall_contract` | `premium_starfall_contract.png` | 高空浮星 → 拖尾下坠 → 砸地碎裂 → 水晶碎片散落 | 每颗火石独立调用，3 颗错时落 |

## 接入流程（已落地）

整套流水线已经接入，AI 重新出图后只需要按下面三步：

1. **替换源图**：把新的 1536×1024 / 1536×1536 PNG 放回 `apps/web/public/assets/game/summons/sheets/<cardId>.png`（命名必须等于 `cardId`）。如果源图还是 1536×1024，先跑 `node scripts/process-summon-sheets.mjs` 补成 1:1。
2. **跑 Python 切片 + 抠图**：

   ```bash
   # 默认 cutout（cutout.pro AI），需要网络
   python scripts/process_summon_frames.py

   # 不想走网络可以改用本地纯色抠色
   python scripts/process_summon_frames.py --method pillow

   # 只重出某些卡（逗号分隔 cardId）
   python scripts/process_summon_frames.py --only summon_furnace_golem,reward_fire_dragon_breath
   ```

   产出会落到：
   - `apps/web/public/assets/game/summons/frames/<cardId>/f1..f4.png` – 单帧透明 PNG
   - `apps/web/public/assets/game/summons/frames/<cardId>.png` – 横向 4 帧 strip（Phaser spritesheet）
   - `apps/web/public/assets/game/summons/frames/manifest.json` – 各 strip 的 `frameWidth/frameHeight`
3. **同步 manifest 帧尺寸**：如果某张图 cutout 后帧尺寸变了，把 `frames/manifest.json` 里对应 `frameWidth/frameHeight` 同步到 `apps/web/src/game/assets/assetManifest.ts` 的 `summonSpritesheets[<key>]`。Phaser 帧动画 key、播放节奏（fps / loop）、落场尺寸 / 偏移在同一文件的 `summonAnimations` 与 `summons` 字典中按 `cardId` 配置。

`apps/web/src/game/phaser/PreloadScene.ts` 已经会自动加载 `summonSpritesheets` 并基于 `summonAnimations` 注册帧动画；`apps/web/src/game/phaser/renderers/EffectsRenderer.ts.spawnSkillSummon` 在 `skillSummoned` 事件触发时按 `summons[cardId].animationKey` 自动 `sprite.play()`，循环型召唤物（如学院魔偶 / 风羽使魔 / 能量精灵 / 以太结界）通过 `repeatAnimation: true` + 更长悬停时间区分。
