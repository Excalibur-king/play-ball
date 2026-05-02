# 游戏设计文档库

- 项目名：玩个球
- 文档用途：存放玩法白盒、版本规划、AI 机制、数值、美术协作和关卡设计文档。
- 当前主版本：V0.2 可玩闭环规格
- 当前主文档：`versions/v0.2-playable-loop.md`

## 目录结构

```text
docs/game-design/
  README.md
  VERSION_PLAN.md
  ai/
    ai-role.md
  versions/
    v0.1-core-whitebox.md
    v0.2-playable-loop.md
    v0.2-content-tables.md
    v0.2-engineering-breakdown.md
```

## 文档类型

| 类型 | 用途 | 建议文件 |
| --- | --- | --- |
| 核心玩法白盒 | 定义一局游戏怎么玩、玩家做什么选择、AI 做什么 | `versions/vX.X-core-whitebox.md` |
| 版本规划 | 管理每个版本要验证的目标和边界 | `VERSION_PLAN.md` |
| 数值设计 | 塔、敌人、卡牌、波次的数值基准 | 后续新增 `balance/` |
| 美术规范 | 地图、敌人、塔、卡牌、特效的可读性规则 | 后续新增 `art/` |
| AI 机制 | AI 定位、BattleSnapshot、推荐卡、敌方导演、公平限制 | `ai/` |
| 关卡设计 | 地图机制、波次结构、Boss 设计 | 后续新增 `levels/` |

## 维护规则

1. 改玩法前，先确认要改的是哪个文档里的规则。
2. 影响核心循环的改动，需要生成一个新版本文档，不直接覆盖旧版本。
3. 塔、敌人、策略卡、波次、AI 输入输出改变时，同步更新对应文档。
4. 已实现内容和待验证内容要分开写，避免策划和工程误解。
5. 每个版本都要写清楚成功标准，避免只用“好玩”判断。
