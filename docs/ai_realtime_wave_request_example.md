# 实时 AI 布阵请求示例

本文档用于查看困难模式实时 AI 布阵的请求和响应结构。示例数据为脱敏和简化后的样例，不包含真实 API key。

## 前端调用后端接口

### 请求

```http
POST /api/director/realtime-wave-plan
Content-Type: application/json
```

```json
{
  "levelId": "volcano_frontier",
  "currentWaveElapsed": 28.4,
  "snapshot": {
    "wave": 3,
    "baseHp": 86,
    "purchasePower": 140,
    "leaksLastWave": 1,
    "destroyedBuildingsLastWave": 0,
    "buildingCounts": {
      "energy": 3,
      "attack": 5,
      "defense": 2
    },
    "outputProfile": {
      "groundDamage": 34,
      "flyingDamage": 12,
      "attackCoverage": 0.68,
      "blockCapacity": 24,
      "energyIncome": 3
    },
    "pressureProfile": {
      "groundPressure": 0.52,
      "flyingPressure": 0.35,
      "fastPressure": 0.47,
      "buildingDamagePressure": 0.22
    },
    "lanePressure": [
      {
        "lane": 0,
        "leaksLastWave": 0,
        "enemiesReachedFront": 1,
        "destroyedBuildingsLastWave": 0,
        "groundDps": 16,
        "flyingDps": 4,
        "blockHp": 18,
        "economyValue": 1,
        "pressureScore": 0.42
      },
      {
        "lane": 1,
        "leaksLastWave": 0,
        "enemiesReachedFront": 2,
        "destroyedBuildingsLastWave": 0,
        "groundDps": 22,
        "flyingDps": 8,
        "blockHp": 20,
        "economyValue": 2,
        "pressureScore": 0.55
      },
      {
        "lane": 2,
        "leaksLastWave": 0,
        "enemiesReachedFront": 1,
        "destroyedBuildingsLastWave": 0,
        "groundDps": 22,
        "flyingDps": 8,
        "blockHp": 20,
        "economyValue": 2,
        "pressureScore": 0.35
      },
      {
        "lane": 3,
        "leaksLastWave": 0,
        "enemiesReachedFront": 2,
        "destroyedBuildingsLastWave": 0,
        "groundDps": 13,
        "flyingDps": 2,
        "blockHp": 10,
        "economyValue": 0,
        "pressureScore": 0.5
      },
      {
        "lane": 4,
        "leaksLastWave": 1,
        "enemiesReachedFront": 3,
        "destroyedBuildingsLastWave": 0,
        "groundDps": 9,
        "flyingDps": 0,
        "blockHp": 6,
        "economyValue": 0,
        "pressureScore": 0.76
      }
    ],
    "nextWavePreview": {
      "normal": 7,
      "fast": 3,
      "heavyAttack": 1,
      "flying": 2,
      "hasBoss": false
    },
    "problemTags": ["row5_low_block", "weak_anti_air"],
    "chosenCardTags": ["freeze", "repair"]
  }
}
```

### 后端接口响应

后端会返回由 AI 轻量意图编译出的完整 `AiWavePlan`；如果 AI 失败或计划为空，则返回 `null`，前端会触发本地兜底布阵。

```json
{
  "pressureGoal": "第5行薄弱，快怪施压。",
  "nextWaveHint": "第5行和空中需补防。",
  "phases": [
    {
      "label": "第5行破口",
      "startSecond": 32,
      "directives": [
        {
          "kind": "role",
          "role": "fast",
          "route": "row-5",
          "budgetUnits": 1.8,
          "cadence": "dense"
        }
      ]
    },
    {
      "label": "空中补压",
      "startSecond": 38,
      "directives": [
        {
          "kind": "role",
          "role": "flying",
          "route": "row-3",
          "budgetUnits": 1.8,
          "cadence": "dense"
        }
      ]
    }
  ]
}
```

## 后端发给 AI 模型的请求

后端会把完整战局压缩为轻量 prompt。AI **只输出战术意图**，后端再把意图编译成现有 `AiWavePlan`。

### 请求

```http
POST https://aicode-api2.gz4399.com/api/v1/chat/completions
Content-Type: application/json
Authorization: Bearer cr_xxx
```

```json
{
  "model": "gpt-5.4-mini",
  "temperature": 0.7,
  "max_tokens": 512,
  "messages": [
    {
      "role": "system",
      "content": "## 角色\n你是塔防实时增援导演，只根据用户提供的当前战况 JSON，选择本次增援意图。\n\n## 当前约束\n- 关卡：volcano_frontier\n- 当前波次：3\n- 当前波次已进行：28.4 秒\n- 地图是 5x9 格子，出兵只选择 row 1-5。\n- 可选敌人类型为普通 / 快速 / 重装 / 飞行。\n\n## 用户战况 JSON 字段说明\n- `w`: 当前波次。\n- `hp`: 玩家基地当前血量。\n- `hpMax`: 玩家基地血量上限；用 `hp / hpMax` 判断危险程度。\n- `sun`: 玩家当前资源；平均约 100 点可购买 1 个御敌装置，越高代表阵容更强。\n- `build`: `[能量建筑数, 输出建筑数, 防御建筑数]`。\n- `power`: `[对地输出, 对空输出, 覆盖率, 阻挡承伤]`。\n- `pressure`: `[地面压力, 飞行压力, 快速压力, 重攻压力]`。\n- `rows`: 每项为 `[行号, 综合压力, 对地输出, 对空输出, 阻挡承伤, 经济价值]`。\n- `tags`: 当前战况标签。\n- `hint`: `[最薄弱行, 压力最高行]`。\n\n## 输出字段\n- `rows`: 1-3 个行号，取值 1-5；优先压最薄弱行，也可以转移压力。\n- `roles`: 1-3 个类型，可选 `normal` / `fast` / `heavyAttack` / `flying`。\n- `intensity`: 1-3，1=试探，2=施压，3=强压。\n- `cadence`: `sparse` / `steady` / `dense`。\n\n## 输出规则\n- 只返回严格 JSON，不要 Markdown，不要解释。\n- 不要输出 `phases`、`pressureGoal`、`nextWaveHint`、`budgetUnits`、`startSecond`。\n- 如果对空薄弱，优先包含 `flying`；如果阻挡薄弱，优先包含 `fast` 或 `heavyAttack`。\n- 不要总是选择中间行；根据 `rows` 和 `hint` 选择真实薄弱点。\n\n## 完整输出示例\n```json\n{\"rows\":[5,3],\"roles\":[\"fast\",\"flying\"],\"intensity\":2,\"cadence\":\"dense\"}\n```\n\n## 最终要求\n- 只返回严格 JSON。\n- 不要输出 Markdown。\n- 不要解释。"
    },
    {
      "role": "user",
      "content": "{\"w\":3,\"hp\":86,\"hpMax\":100,\"sun\":140,\"build\":[3,5,2],\"power\":[34,12,0.7,24],\"pressure\":[0.5,0.4,0.5,0.2],\"rows\":[[1,0.4,16,4,18,1],[2,0.5,18,3,14,1],[3,0.4,22,8,20,2],[4,0.5,13,2,10,0],[5,0.8,9,0,6,0]],\"tags\":[\"row5_low_block\",\"weak_anti_air\"],\"hint\":[5,5]}"
    }
  ],
  "extra_body": {
    "thinking": {
      "type": "disabled"
    }
  }
}
```

### `messages[1].content` 展开示例

实际请求中 `user.content` 是一段紧凑 JSON 字符串，只包含当前战况；输出规则、字段说明和完整示例都在 `system.content` 中。

```json
{
  "w": 3,
  "hp": 86,
  "hpMax": 100,
  "sun": 140,
  "build": [3, 5, 2],
  "power": [34, 12, 0.7, 24],
  "pressure": [0.5, 0.4, 0.5, 0.2],
  "rows": [
    [1, 0.4, 16, 4, 18, 1],
    [2, 0.5, 18, 3, 14, 1],
    [3, 0.4, 22, 8, 20, 2],
    [4, 0.5, 13, 2, 10, 0],
    [5, 0.8, 9, 0, 6, 0]
  ],
  "tags": ["row5_low_block", "weak_anti_air"],
  "hint": [5, 5]
}
```

### AI 响应

AI 必须只返回轻量意图 JSON，不返回 Markdown 或解释。

```json
{
  "rows": [5, 3],
  "roles": ["fast", "flying"],
  "intensity": 2,
  "cadence": "dense"
}
```

### 后端编译后的接口响应

后端会把 AI 意图扩展为完整 `AiWavePlan`，再返回给前端。

```json
{
  "pressureGoal": "第5行、第3行快怪、飞行施压",
  "nextWaveHint": "第5行、第3行注意补对空",
  "phases": [
    {
      "label": "第5行快怪施压",
      "startSecond": 31.4,
      "directives": [
        {
          "kind": "role",
          "role": "fast",
          "route": "row-5",
          "budgetUnits": 1.8,
          "cadence": "dense"
        }
      ]
    }
  ]
}
```

### AI 失败时的后端响应

```json
null
```

前端收到 `null` 后会派发 `applyRealtimeDirectorFallback`，由本地规则导演追加兜底敌群。
