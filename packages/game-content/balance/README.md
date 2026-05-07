# 数值工作区

这个目录是给数值同学和玩法同学维护内容源数据的地方。

## 工作方式

```text
balance/*.ts -> content:build -> data/generated/*.json
```

- `balance/*.ts`：人维护的源文件，可以写注释、类型、稳定 ID 和数值。
- `balance/combatBalance.ts`：战斗数值的核心常量和公式。优先改这里来调整全局平衡。
- `balance/enemyBalanceProfiles.ts`：关卡级敌人配置档。后续 `easy` / `hard` 关卡优先通过这里覆写敌人数值和解锁节奏。
- `balance/waveBuilder.ts`：波次作者工具。优先按“阶段”写波次，再由 helper 展平成运行时使用的 `enemyGroups`。
- `data/generated/*.json`：脚本生成的运行时数据，给程序读取，不要手改。
- `scripts/export-content.mjs`：导出和校验脚本。

## 波次作者工具

`waves.ts` 里推荐用 `buildWave(...)` 和 `phaseWave(...)` 来写 5 波短局：

```ts
buildWave({
  id: 'example_wave',
  mapId: 'volcano',
  index: 2,
  durationSeconds: 40,
  directorReserveBudget: 4,
  phases: [
    phaseWave(3, { enemyId: 'ember_grunt', count: 5, route: 'center', interval: 2.9 }),
    phaseWave(13, { enemyId: 'spark_runner', count: 3, route: 'center', interval: 2.6 })
  ],
  pressureGoal: '先主路持续压，再插入快怪抢节奏。',
  nextWaveHint: '下一波会开第二路。',
  aiDirectorAllowed: true,
  status: 'draft'
})
```

- `phaseWave(startSecond, groups)`：定义一个阶段从第几秒开始压。
- 每个阶段会正式写入 `wave.phases`，运行时可以识别当前段落并在 HUD / 特效里展示。
- `startOffset`：给同阶段里的某组怪再额外延后几秒。
- `stepSeconds`：给同阶段里的多组怪按顺序自动错开。
- `buildWave(...)`：把所有阶段展平成 `enemyGroups`，并自动生成带 `startSecond/endSecond` 的 phase 元数据。

## 常用命令

在仓库根目录运行：

```bash
pnpm content:build
```

也可以只在内容包内运行：

```bash
pnpm --filter @tower-rogue/game-content content:build
```

脚本会做基础校验：

- ID 是否重复。
- 数值是否为有效数字。
- 卡牌 `solves` 是否在 `0-1`。
- 建筑机制字段是否和建筑类型匹配。
- 波次引用的地图、敌人、Boss 是否存在。
- 生成物是否能被 JSON 序列化。

## 战斗数值基线

当前建筑和敌人的核心战斗字段不是孤立手填，而是从 `combatBalance.ts` 推导：

```text
enemyHp = standardTowerDps * timeUnitSeconds * enemyTtkUnits[role]
buildingHp = heavySiegeDps * timeUnitSeconds * buildingTtdUnitsAgainstHeavy[class]
attackPower = standardTowerDps * towerDpsMultiplier * attackInterval
buildingDamage = heavySiegeDps * siegeDpsMultiplier * attackInterval

heavySiegeDps = standardTowerDps * heavySiegeDpsToTowerDpsRatio
```

术语：

- `DPS`：每秒伤害。
- `TTK`：Time To Kill，怪物被标准火力击杀需要多久。
- `TTD`：Time To Die，建筑被重攻敌人拆掉需要多久。
- `Siege DPS`：怪物拆建筑的每秒伤害。

核心常量：

| 常量 | 作用 | 调整影响 |
| --- | --- | --- |
| `timeUnitSeconds` | 1 个数值时间单位 | 提高会让敌人和建筑整体更耐打，降低会让战斗节奏更快 |
| `standardTowerDps` | 标准持续单体输出塔的 DPS 基准 | 影响公式生成的塔攻击力和怪物 HP |
| `heavySiegeDpsToTowerDpsRatio` | 重攻拆建筑 DPS 与标准塔 DPS 的比值 | 提高会让建筑更容易被拆 |
| `enemyTtkUnits` | 各类怪物的耐打倍率 | 提高某一项只会让对应怪更肉 |
| `buildingTtdUnitsAgainstHeavy` | 各类建筑对重攻的耐拆倍率 | 提高某一项只会让对应建筑更耐拆 |

调参建议：

- 全局节奏太快或太慢，先改 `timeUnitSeconds`。
- 所有建筑输出都偏强，先检查各建筑的 `towerDpsMultiplier`，不要只抬怪物 HP。
- 所有怪都拆不动建筑，先改 `heavySiegeDpsToTowerDpsRatio`。
- 只有墙太肉，改 `buildingTtdUnitsAgainstHeavy.wall`。
- 只有某类怪太脆或太肉，改 `enemyTtkUnits` 对应角色。
- 每次只改 1 个主旋钮，跑完一轮 5 波再继续调。

具体建筑和敌人的局部倍率在 `buildings.ts`、`enemies.ts` 中调用公式时传入，例如 `attackPowerFromDpsMultiplier(1.05, attackInterval.melee)` 或 `buildingDamageFromSiegeMultiplier(0.42, attackInterval.normal)`。这些局部倍率用于表现单位特色，核心平衡仍以 `combatBalance.ts` 为准。

能量建筑的 `purchasePowerPerTick` 和 `productionInterval` 表示一个产出周期内的总量。运行时会把这笔总量拆成 1 点购买力的小包持续发放，例如 `25 / 8 秒` 会表现为约每 `0.32 秒` 增加 1 点，而不是 8 秒后一次性跳 25 点。

## PvZ 参考守则

这一版平衡除了看公式，也明确借鉴 `Plants vs. Zombies` 的几条骨架规则：

- 先定经济锚点，再推导攻击和波次。经济建筑如果改了价格或回本速度，通常会牵动整局节奏。
- 结构限制优先于硬抬数值。格子、lane、朝向、可建区域，本质上都是隐藏数值。
- 标准输出单位和普通敌人的 `TTK` 要成对设计，不要让基础塔单独轻松融掉基础怪。
- 墙和防御建筑的职责是买时间，不是补输出，因此要围绕 `TTD` 独立设计。
- 快怪、重攻、飞天、Boss 要测试不同防线弱点，不要都靠“更肉、更痛、更快”叠压。

映射到当前项目：

| 守则 | 当前落点 | 建议维护位置 |
| --- | --- | --- |
| 经济回本时间先行 | `energy_core` 当前 `50` cost、`25 / 8 秒`，回本约 `16` 秒 | `buildings.ts` |
| 结构限制优先 | 第 `1-9` 列可建，攻击塔固定向右、只打同排前方；近战塔仅对正在贴身啃咬自己的目标允许反击 | `src/index.ts`、`commands.ts`、`systems/plants.ts` |
| 标准塔与普通怪成对设计 | `ranged_turret` 作为标准持续输出塔，`enemyTtkUnits.normal` 作为普通怪耐打锚点 | `combatBalance.ts`、`buildings.ts` |
| 墙独立围绕 TTD 设计 | `lava_wall` 和后排建筑共用重攻基准，但倍率不同 | `combatBalance.ts` |
| 特殊敌人测试特定漏洞 | 快怪测拦截，重攻测拆建筑，飞天测对空，Boss 测整体构筑 | `enemies.ts`、`waves.ts` |

## 当前结构锚点

在继续改纯数值前，先把地图与火力结构当成第一层平衡器：

| 项 | 当前规则 | 设计含义 |
| --- | --- | --- |
| 可建造区域 | 共 `15` 列，其中第 `1-9` 列可建造 | 限制有效火力纵深，避免后场满屏塔无代价参战 |
| 攻击方向 | 攻击塔固定向右 | 避免回头火与双向覆盖 |
| 攻击选目标 | 默认只打同排、只打前方、按距离优先；近战塔保留贴身反击例外 | 降低跨排集火和不可读的自动最优解，同时避免近战贴脸后出现明显手感死角 |
| 设计火力预算 | 每排按 `2` 座持续火力塔 + `1` 个前排位 + `0-1` 座爆发塔来估算波次 | 波次按“可用火力预算”设计，不按“把所有格子都铺满”设计 |
| 激光塔预算 | 视为每排 `0-1` 座的爆发解法，而不是常驻主力 | 防止有限次数爆发塔把基准 DPS 带偏 |

说明：

- “设计火力预算”目前是数值和关卡设计假设，还不是代码里的硬上限。
- 如果后续实测仍然出现过量集火，优先把预算做成规则，例如“每排攻击塔上限”或“每排激光塔上限”，再考虑继续堆怪物血量。

## 当前实装调参包

下面这组已经落地到 `combatBalance.ts` 和 `buildings.ts`。目标是让怪物更能吃下集火、让重攻怪更能撕开前排，同时避免建筑继续过分耐拆。

### 落地原则

- 不先动 `standardTowerDps`。这个常量会同时影响塔伤和怪物 HP，不适合拿来解决“怪太脆”。
- 不再优先降怪速。当前速度已经下调，下一轮核心问题是火力密度和建筑耐拆比例。
- 优先改 `enemyTtkUnits`、`heavySiegeDpsToTowerDpsRatio`、`buildingTtdUnitsAgainstHeavy`，必要时再改局部塔倍率和成本。

### 实装参数

#### `combatBalance.ts`

| 项 | 上一版 | 当前 | 调整意图 |
| --- | ---: | ---: | --- |
| `enemyTtkUnits.normal` | `1.00` | `1.15` | 普通怪更能吃下基础远程塔火力，减少一排远程轻松融怪 |
| `enemyTtkUnits.fast` | `0.70` | `0.82` | 快怪仍脆，但不会一进场就被蒸发 |
| `enemyTtkUnits.heavy_attack` | `2.00` | `2.25` | 重攻怪在进入射程后能更稳定施加拆塔压力 |
| `enemyTtkUnits.flying` | `0.90` | `1.05` | 飞天怪需要更明确的对空投入，而不是被顺手清掉 |
| `enemyTtkUnits.boss` | `9.50` | `10.50` | Boss 波更接近最终构筑检验 |
| `heavySiegeDpsToTowerDpsRatio` | `1.35` | `1.55` | 重攻怪拆建筑更快，后排裸露会更危险 |
| `buildingTtdUnitsAgainstHeavy.wall` | `2.35` | `2.00` | 墙仍是前排主承伤，但不再拖太久 |
| `buildingTtdUnitsAgainstHeavy.meleeTower` | `1.35` | `1.05` | 前排近战塔更像冒风险换输出 |
| `buildingTtdUnitsAgainstHeavy.rangedTower` | `0.90` | `0.75` | 后排输出塔被贴脸时更容易被拆 |
| `buildingTtdUnitsAgainstHeavy.economy` | `0.75` | `0.58` | 经济路线更需要保护，贪经济的代价更清晰 |
| `buildingTtdUnitsAgainstHeavy.laserTower` | `0.65` | `0.48` | 激光塔保持高爆发，但更难长期站场 |

#### `buildings.ts`

| 项 | 上一版 | 当前 | 调整意图 |
| --- | ---: | ---: | --- |
| `melee_turret` 的 `towerDpsMultiplier` | `1.05` | `1.00` | 近战塔回到“接近标准 DPS 的前排单位”定位 |
| `laser_turret` 的 `towerDpsMultiplier` | `3.00` | `2.60` | 保留爆发感，但降低对成群地面敌人的蒸发能力 |
| `ranged_turret.cost` | `115` | `125` | 延缓远程塔铺满速度，让经济与布防更有取舍 |
| `laser_turret.cost` | `100` | `120` | 降低激光塔在早中期被无脑堆叠的收益 |

### 调整后希望看到的战斗结果

- 单座远程塔不再轻松处理整组普通怪，必须靠 lane 布局和前排拖时间配合。
- 快怪仍然强调空档惩罚，但玩家不会觉得“明明怪已经很慢却还是没存在感”。
- 重攻怪一旦顶到前排，能在合理时间内拆掉墙和脆弱后排，逼玩家修补或转路。
- 飞天怪必须靠对空投入处理，而不是顺手被地面主力塔覆盖掉。
- 经济路线的风险更清晰，能量核心不再是“放下就能安稳回本”的默认答案。

### 验证顺序

1. 先只改 `combatBalance.ts` 的建议值，跑完整 5 波。
2. 如果敌人仍然过快蒸发，再补 `buildings.ts` 的局部倍率和成本调整。
3. 如果仍然出现单排堆满远程塔无脑过关，再把“每排攻击塔上限”做成规则，不继续硬抬怪物 HP。

## 维护规则

1. `id` 是稳定主键，代码、存档和 AI 推荐都应该认 `id`，不要随便改。
2. 中文名、描述、推荐理由可以迭代。
3. 源文件里只写 JSON-safe 数据：字符串、数字、布尔、数组、对象、`null`。
4. 不要在数值数据里写运行时代码逻辑，效果只用 `effect.kind` 和参数描述；`combatBalance.ts` 只允许放确定性的数值公式。
5. 改完源文件后运行 `content:build`，把生成的 JSON 一起检查。

## 程序读取方式

生成后的 JSON 位于：

```text
packages/game-content/data/generated/
```

其他包后续可以通过包导出路径读取：

```ts
import content from '@tower-rogue/game-content/generated/content.json'
import cards from '@tower-rogue/game-content/generated/cards.json'
```

当前生成物：

- `content.json`：完整内容包。
- `manifest.json`：版本号、生成时间和数量统计。
- `maps.json`、`buildings.json`、`enemies.json`、`enemyBalanceProfiles.json`、`cards.json`、`waves.json`、`directorRules.json`、`aiStrategy.json`、`gameplay.json`：分表数据。
