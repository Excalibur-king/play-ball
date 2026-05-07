# 玩个球 EnemyDirectorSpec

- 文档状态：V0.2 机制规格草案
- 创建日期：2026-05-04
- 关联文档：`ai-role.md`、`../versions/v0.2-playable-loop.md`、`../versions/v0.2-engineering-breakdown.md`
- 目标：定义敌方导演如何在硬规则限制下，根据战局参数生成“下一波出兵计划”。

## 1. 一句话定义

敌方导演不是实时控怪 AI，而是一个在每波结算时运行一次的出兵规划器。

它读取战局快照，获得一份可支配的敌方预算，输出一组受白名单约束的导演参数；规则执行器再根据这些参数、预算与公平限制，生成合法的下一波敌潮。

## 2. 核心目标

Enemy Director 需要解决的不是“让 AI 更聪明”，而是：

1. 让敌潮对玩家当前构筑做出回应。
2. 让敌潮变化留在玩法系统内部，而不是跳出规则乱改。
3. 让策划、程序、测试都能看懂导演为什么这样出兵。
4. 让后续接入大模型时，AI 只负责传参数，不直接改战斗规则。

## 3. 核心原则

### 3.1 AI 不直接生成最终波次

AI 不应该直接输出“第 3 波刷 4 个飞天、2 个重攻、都走右路”。

AI 应该只输出：

- 这一波的战术意图。
- 应该把压力放在哪类路线。
- 更偏向哪类兵种。
- 应该花多少预算。
- 出兵节奏偏前、中、后。

最终波次由规则执行器生成。

### 3.2 敌人也有资源约束

玩家通过购买力建塔，敌方导演也应有一套自己的“敌方购买力”概念。

这一版先命名为：

- `directorReserveBudget`：本波导演可额外调度的预算。
- `directorCost`：每种敌人的导演成本。

这样导演不是无限加怪，而是在预算内决定买什么怪、买多少、压哪边。

### 3.3 基础波次和导演变化分离

关卡设计负责提供：

- 基础波次结构。
- 每波想表达的大体压力。
- Boss 波骨架。

导演只负责：

- 在基础波次之上做有限调整。
- 让同一张地图的不同对局出现变化。

## 4. 系统边界

Enemy Director 只在以下时机运行：

```text
上一波结算完成
-> 生成 BattleSnapshot
-> Director 读取快照
-> Director 输出参数
-> 执行器生成下一波计划
-> 向玩家展示预告
-> 下一波开始时应用
```

这一版不做：

- 已开波后的实时怪物微操。
- 中途改已经预告过的敌潮。
- 大模型直接输出最终数值。
- 脱离预算的额外刷怪。

## 5. 当前代码里的对应位置

当前代码里已经有一个很轻量的导演骨架：

- 计划生成：`packages/game-core/src/director.ts`
- 波次结算后挂入计划：`packages/game-core/src/systems/waves.ts`
- 开波时把计划并入基础波次：`packages/game-core/src/commands.ts`
- 战局输入：`packages/game-core/src/battleSnapshot.ts`

当前版本的问题是：

1. `director.ts` 仍是条件分支式的简化规则。
2. 没有真正的敌方预算模型。
3. 没有 AI 参数层，导演逻辑和执行逻辑还没分离。
4. 路线施压还没有完整用上 `lanePressure`。

本规格文档描述的是这套骨架应该演化成什么样。

## 6. 输入

导演输入为 `BattleSnapshot`，外加基础关卡波次数据。

### 6.1 运行时输入

来自 `BattleSnapshot`：

- `baseHp`
- `purchasePower`
- `leaksLastWave`
- `destroyedBuildingsLastWave`
- `buildingCounts`
- `outputProfile`
- `pressureProfile`
- `lanePressure`
- `nextWavePreview`
- `problemTags`
- `chosenCardTags`

其中最关键的是：

#### `problemTags`

决定“玩家当前暴露了什么问题”。

#### `lanePressure`

决定“导演应该往哪里压”。

#### `chosenCardTags`

决定“玩家刚拿了什么解法”，避免导演立刻恶意反制。

### 6.2 内容输入

来自内容表：

- `WaveDef.enemyGroups`
- `WaveDef.aiDirectorAllowed`
- `WaveDef.bossId`
- `WaveDef.pressureGoal`
- `EnemyDef`
- `DirectorRuleDef`

后续应补充：

- `WaveDef.directorReserveBudget`
- `EnemyDef.directorCost`

## 7. 输出

导演最终不直接输出最终刷怪表，而是输出两层东西：

1. `DirectorDecisionParams`
2. `EnemyDirectorPlan`

### 7.1 DirectorDecisionParams

这是 AI 或规则导演真正负责的参数层。

```ts
type DirectorIntent =
  | 'relief'
  | 'probe_fast'
  | 'probe_anti_air'
  | 'pressure_economy'
  | 'split_pressure'
  | 'boss_setup'

type DirectorDecisionParams = {
  intent: DirectorIntent
  aggression: number
  primaryRoute: 'left' | 'center' | 'right' | 'mixed'
  secondaryRoute?: 'left' | 'center' | 'right'
  roleWeights: {
    normal: number
    fast: number
    heavyAttack: number
    flying: number
  }
  spendRatio: number
  timingStyle: 'frontload' | 'steady' | 'backload'
}
```

字段解释：

- `intent`：这一波导演想表达什么战术意图。
- `aggression`：侵略性，决定预算使用力度。
- `primaryRoute`：主施压路线。
- `secondaryRoute`：副施压路线，可选。
- `roleWeights`：预算应该优先花在哪类兵种上。
- `spendRatio`：导演这次打算花掉多少储备预算。
- `timingStyle`：出兵节奏偏前压、均匀还是后压。

### 7.2 EnemyDirectorPlan

这是执行器落地后的玩家可读计划层。

```ts
type EnemyDirectorPlan = {
  targetWaveIndex: number
  intent: DirectorIntent
  budget: {
    reserve: number
    spendCap: number
    spent: number
  }
  params: DirectorDecisionParams
  addedGroups: EnemyDirectorAddedGroup[]
  removedGroups: Array<{
    enemyId: EnemyId
    count: number
  }>
  reasonTags: string[]
  previewText: string
}
```

说明：

- `params` 用于调试和 AI 回放。
- `addedGroups` 是最终新增的敌群。
- `removedGroups` 用于在放缓或替换时说明删掉了什么。
- `previewText` 是玩家可见预告。

## 8. 敌方预算模型

### 8.1 敌人成本

建议在 `EnemyDef` 中增加：

```ts
type EnemyDef = {
  id: string
  role: 'normal' | 'fast' | 'heavy_attack' | 'flying' | 'boss'
  directorCost: number
}
```

这版先只要求相对关系成立：

- 普通敌人最便宜。
- 极速略高于普通。
- 重攻和飞天明显更贵。
- Boss 不进入普通导演预算。

### 8.2 波次导演预算

建议在 `WaveDef` 中增加：

```ts
type WaveDef = {
  directorReserveBudget: number
}
```

含义：

- 基础波次负责主结构。
- `directorReserveBudget` 负责变化空间。

导演只能在这份预算里做事，不能无限制追加敌人。

## 9. 路线模型

V0.2 保持现有 route bucket，不直接做到单路索引。

现有 route：

- `left`
- `center`
- `right`
- `mixed`

建议和 `5 x 9` 棋盘这样映射：

- `left`：第 1-2 路
- `center`：第 3 路
- `right`：第 4-5 路
- `mixed`：所有路轮转

导演读取 `lanePressure` 后，不必直接生成 “lane 4”，而是先映射成 route。

这样能复用当前运行时结构：

```ts
type EnemyDirectorAddedGroup = {
  enemyId: EnemyId
  count: number
  route: 'left' | 'center' | 'right' | 'mixed'
  startSecond: number
  interval: number
}
```

## 10. 导演意图表

V0.2 建议先固定 6 个意图：

### 10.1 `relief`

适用：

- 玩家底线血量过低。
- 上一波刚大漏怪。

动作倾向：

- 少花预算。
- 删除 1-2 个低阶敌人。
- 把更激进的节奏改为均匀。

### 10.2 `probe_fast`

适用：

- 玩家基础输出够，但补刀和收尾不好。

动作倾向：

- 追加少量极速。
- 偏前中段进场。

### 10.3 `probe_anti_air`

适用：

- 玩家对空能力偏弱。

动作倾向：

- 增加少量飞天敌人。
- 必须在预告里说明。

### 10.4 `pressure_economy`

适用：

- 玩家经济建筑多，且后排暴露。

动作倾向：

- 追加少量重攻。
- 优先压经济暴露方向。

### 10.5 `split_pressure`

适用：

- 玩家单一路处理能力强，多路转火一般。

动作倾向：

- 用中等预算分散施压。
- 不把压力只放一边。

### 10.6 `boss_setup`

适用：

- Boss 前一波。

动作倾向：

- 提前消耗玩家资源。
- 暴露构筑短板。
- 不破坏 Boss 主结构。

## 11. 硬规则层

这层是整个系统的核心。

AI 可以建议，但执行器必须校验。

### 11.1 预算规则

- 本波总导演支出不能超过 `directorReserveBudget * spendRatio`。
- 本波额外压力增幅有上限。
- Boss 波的导演预算应更低或更保守。

### 11.2 兵种规则

- 飞天增兵有上限。
- 重攻增兵有上限。
- 同一波不能把预算全部花在单一高压兵种上。
- Boss 不允许被移除或替换掉主结构。

### 11.3 路线规则

- 不能连续两波只针对同一路。
- 高压路可被继续施压，但必须受冷却和上限限制。
- 若 `lanePressure` 明显失衡，导演可压主高压路或次高压路，不应永远只压最高路。

### 11.4 玩家保护规则

- 玩家低血量时降低侵略性。
- 玩家刚发生大漏怪时，不允许继续极限增压。
- 玩家刚拿了明显补某问题的卡牌时，下一波不应立即强反制拉满。

### 11.5 预告规则

- 所有高威胁变化必须进入下一波预告。
- 预告和最终计划必须一致。
- 不允许“明面说普通压力，暗里多塞飞天”的欺骗。

## 12. 执行流程

建议的系统流程：

```text
BattleSnapshot
-> 计算导演可用预算
-> 决定导演意图
-> 生成 DirectorDecisionParams
-> 根据参数筛选候选敌人
-> 按预算购买敌人
-> 分配到路线和时间段
-> 过硬规则校验
-> 输出 EnemyDirectorPlan
-> 生成玩家预告
```

## 13. 伪代码

```ts
function createDirectorPlan(state, snapshot, nextWaveDef) {
  if (!nextWaveDef.aiDirectorAllowed) return undefined

  const reserveBudget = nextWaveDef.directorReserveBudget
  const params = decideDirectorParams(snapshot, state)
  const spendCap = reserveBudget * params.spendRatio

  const candidates = getAllowedEnemies(params, nextWaveDef)
  const additions = buyEnemiesByBudget(candidates, spendCap, params.roleWeights)
  const routed = assignRoutes(additions, params, snapshot.lanePressure)
  const timed = assignTiming(routed, params.timingStyle)

  const draftPlan = {
    targetWaveIndex: state.waveIndex + 1,
    intent: params.intent,
    budget: {
      reserve: reserveBudget,
      spendCap,
      spent: sumDirectorCost(timed)
    },
    params,
    addedGroups: timed,
    removedGroups: [],
    reasonTags: deriveReasonTags(snapshot, params),
    previewText: buildPreviewText(params, timed)
  }

  return enforceDirectorRules(draftPlan, state, snapshot, nextWaveDef)
}
```

## 14. AI 接入方式

后续如果接大模型，模型不直接输出 `EnemyDirectorPlan`。

推荐方式：

### 14.1 模型输入

- `BattleSnapshot`
- 当前波次基础信息
- 可选意图白名单
- 可用 route 白名单
- 各兵种权重范围
- 预算范围

### 14.2 模型输出

只输出：

```ts
type DirectorDecisionParams = {
  intent: ...
  aggression: ...
  primaryRoute: ...
  secondaryRoute?: ...
  roleWeights: ...
  spendRatio: ...
  timingStyle: ...
}
```

### 14.3 规则执行器职责

- 校验 JSON 是否合法。
- 校验字段是否在白名单内。
- 校验是否超预算。
- 校验是否违反公平规则。
- 非法输出则回退到规则版导演。

## 15. 与当前版本的落地顺序

建议按以下顺序推进，而不是一次到位：

### Step 1：补数据结构

- `EnemyDef.directorCost`
- `WaveDef.directorReserveBudget`
- `DirectorDecisionParams`
- 扩展 `EnemyDirectorPlan`

### Step 2：写确定性执行器

- 根据参数和预算生成 `addedGroups`
- 先不接模型

### Step 3：规则版参数生成

把当前 `director.ts` 的条件分支，从“直接加怪”改为“先出参数，再执行”。

### Step 4：接 `lanePressure`

把最高压路、次高压路映射到 `primaryRoute` / `secondaryRoute`。

### Step 5：接 AI

让 AI 只负责产出 `DirectorDecisionParams`，不直接操作波次。

## 16. V0.2 版本边界

这一版先不追求：

- 单路精确到 `laneIndex`
- 实时中途改波
- 复杂兵种协同
- 多阶段 Boss AI
- 大模型直接生成最终波次

这一版只验证：

1. 导演有预算。
2. 导演能根据战局决定买什么兵。
3. 导演能决定压哪一侧。
4. AI 只传参数，规则执行器负责落地。
5. 所有导演行为都受硬规则限制。

## 17. 当前结论

Enemy Director 的本质，不是“多加几只怪”，而是：

```text
用受预算约束的战术意图，
在规则系统内部生成下一波变化。
```

玩家面对的不是随机出怪器，也不是作弊脚本，而是一个：

- 看得懂战局
- 但不能跳出规则
- 能表达施压意图
- 又可以被玩家读懂并反制

的敌方导演。
