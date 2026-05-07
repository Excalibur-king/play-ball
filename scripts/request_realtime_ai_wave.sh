#!/bin/bash
# ----------------------------------------------
# Filename: request_realtime_ai_wave.sh
# Revision: 1.1
# Lastdate: 2026/05/07
# Author: czx
# Description: Request realtime AI wave plan with a filled sample payload.
# ----------------------------------------------

# Predefined constants.
AI_DIRECTOR_API_KEY="cr_98b7d4ba512f215f1f9e23a9e992f3fd1c8308049c912f397ee5225e3dacb5d5"
REQUEST_URL="https://aicode-api2.gz4399.com/api/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS=60
TMP_REQUEST_FILE=""

BuildRequestFile() {
  TMP_REQUEST_FILE=$(mktemp)

  cat > "${TMP_REQUEST_FILE}" <<'JSON'
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
JSON
}

Cleanup() {
  if [[ X${TMP_REQUEST_FILE} != X && -f "${TMP_REQUEST_FILE}" ]]; then
    rm -f "${TMP_REQUEST_FILE}"
  fi
}

SendRequest() {
  echo "POST ${REQUEST_URL}"
  curl --max-time "${REQUEST_TIMEOUT_SECONDS}" \
    -sS \
    -X POST "${REQUEST_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AI_DIRECTOR_API_KEY}" \
    --data-binary @"${TMP_REQUEST_FILE}"
  echo ""
}

Main() {
  BuildRequestFile
  trap Cleanup EXIT
  SendRequest
}

Main "$@"
