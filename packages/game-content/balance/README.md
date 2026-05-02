# 数值工作区

这个目录是给数值同学和玩法同学维护内容源数据的地方。

## 工作方式

```text
balance/*.ts -> content:build -> data/generated/*.json
```

- `balance/*.ts`：人维护的源文件，可以写注释、类型、稳定 ID 和数值。
- `data/generated/*.json`：脚本生成的运行时数据，给程序读取，不要手改。
- `scripts/export-content.mjs`：导出和校验脚本。

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

## 维护规则

1. `id` 是稳定主键，代码、存档和 AI 推荐都应该认 `id`，不要随便改。
2. 中文名、描述、推荐理由可以迭代。
3. 源文件里只写 JSON-safe 数据：字符串、数字、布尔、数组、对象、`null`。
4. 不要在数值数据里写运行时代码逻辑，效果只用 `effect.kind` 和参数描述。
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
- `maps.json`、`buildings.json`、`enemies.json`、`cards.json`、`waves.json`、`directorRules.json`：分表数据。
