import { useState } from 'react'
import { useAppStore } from '../appStore'

const mockSeedBank = [
  { type: 'mage', name: '法师', role: 'attack', cost: 20, selected: false, star: 3 },
  { type: 'archer', name: '弓箭手', role: 'attack', cost: 15, selected: true, star: 2 },
  { type: 'knight', name: '骑士', role: 'defense', cost: 15, selected: false, star: 2 },
  { type: 'healer', name: '治疗师', role: 'energy', cost: 30, selected: false, star: 1 }
]

const mockSkillCards = [
  { id: 'fire_breath', name: '火龙吐息', type: 'attack', description: '对一条路上所有敌人造成 80 点火焰伤害' },
  { id: 'ice_wall', name: '冰霜壁垒', type: 'defense', description: '在选定格子生成护盾，吸收 200 伤害' },
  { id: 'mana_surge', name: '灵力涌流', type: 'energy', description: '立即获得 50 点能量' },
  { id: 'starfall', name: '星陨契约', type: 'attack', description: '召唤 3 颗星陨火石攻击血量最高的敌人' },
  { id: 'wind_dash', name: '疾风步', type: 'pivot', description: '将选定魔导具瞬移至任意空格' }
]

const mockStrategyCards = [
  { id: 'rsc_1', name: '火力增幅', type: 'attack', slot: 'synergy', description: '所有攻击型魔导具伤害提升 25%，持续 15 秒' },
  { id: 'rsc_2', name: '紧急维修', type: 'emergency', slot: 'emergency', description: '基地恢复 200 点生命值' },
  { id: 'rsc_3', name: '阵线重组', type: 'pivot', slot: 'pivot', description: '随机 2 件魔导具免费升级一次' }
]

const mockEnemyList = [
  { name: 'Goblins', count: 12 },
  { name: 'Skeletons', count: 8 },
  { name: 'Slimes', count: 5 }
]

export function PrototypePage() {
  const openHome = useAppStore((state) => state.openHome)
  const [mp] = useState(125)
  const [maxMp] = useState(200)
  const [wave] = useState(15)
  const [totalWaves] = useState(30)
  const [baseHp] = useState(850)
  const [maxBaseHp] = useState(1000)
  const [selectedSeed, setSelectedSeed] = useState<string | null>('archer')
  const [bottomTab, setBottomTab] = useState<'strategy' | 'skill'>('strategy')

  const hpPercent = (baseHp / maxBaseHp) * 100
  const mpPercent = (mp / maxMp) * 100

  return (
    <main className="proto-shell">
      <div className="proto-stage">
        <div className="proto-bg-placeholder">
          <span>GAME CANVAS AREA</span>
        </div>

        <div className="proto-hud">
          {/* ====== TOP HUD BAR — one connected strip ====== */}
          <div className="proto-top-bar">
            {/* MP section */}
            <div className="proto-top-section proto-mp-section">
              <div className="proto-mp-icon" />
              <div className="proto-mp-body">
                <span className="proto-mp-label">MP</span>
                <span className="proto-mp-value">{mp}/{maxMp}</span>
                <div className="proto-bar proto-mp-bar">
                  <div className="proto-bar-fill mp" style={{ width: `${mpPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="proto-top-divider" />

            {/* Seed cards — center */}
            <div className="proto-top-section proto-seed-section">
              {mockSeedBank.map((seed) => (
                <button
                  type="button"
                  key={seed.type}
                  className={`proto-seed ${seed.role} ${selectedSeed === seed.type ? 'selected' : ''}`}
                  onClick={() => setSelectedSeed(seed.type === selectedSeed ? null : seed.type)}
                >
                  <div className="proto-seed-stars">
                    <span className="proto-star">{'★'.repeat(seed.star)}</span>
                  </div>
                  <div className="proto-seed-portrait" />
                  <span className="proto-seed-cost">★{seed.cost}</span>
                </button>
              ))}
            </div>

            <div className="proto-top-divider" />

            {/* Wave counter — center badge */}
            <div className="proto-top-section proto-wave-section">
              <span className="proto-wave-label">WAVE</span>
              <span className="proto-wave-value">{wave}<small>/{totalWaves}</small></span>
              <div className="proto-bar proto-wave-bar">
                <div className="proto-bar-fill wave" style={{ width: `${(wave / totalWaves) * 100}%` }} />
              </div>
            </div>

            <div className="proto-top-divider" />

            {/* Base HP */}
            <div className="proto-top-section proto-hp-section">
              <span className="proto-hp-icon">🏰</span>
              <div className="proto-hp-body">
                <span className="proto-hp-label">BASE HP</span>
                <span className="proto-hp-value">{baseHp}/{maxBaseHp}</span>
                <div className="proto-bar proto-hp-bar">
                  <div className="proto-bar-fill hp" style={{ width: `${hpPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="proto-top-divider" />

            {/* Enemy list */}
            <div className="proto-top-section proto-enemy-section">
              {mockEnemyList.map((enemy) => (
                <div key={enemy.name} className="proto-enemy-row">
                  <span className="proto-enemy-name">{enemy.name}:</span>
                  <span className="proto-enemy-count">{enemy.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ====== BOTTOM — strategy cards & skill pack ====== */}
          <div className="proto-bottom-bar">
            <div className="proto-bottom-tabs">
              <button
                type="button"
                className={`proto-tab ${bottomTab === 'strategy' ? 'active' : ''}`}
                onClick={() => setBottomTab('strategy')}
              >
                策略卡
              </button>
              <button
                type="button"
                className={`proto-tab ${bottomTab === 'skill' ? 'active' : ''}`}
                onClick={() => setBottomTab('skill')}
              >
                技能包
              </button>
            </div>

            {bottomTab === 'strategy' ? (
              <div className="proto-card-row">
                {mockStrategyCards.map((card) => (
                  <button type="button" key={card.id} className={`proto-card ${card.slot}`}>
                    <div className="proto-card-art" />
                    <span className="proto-card-slot">{formatSlot(card.slot)}</span>
                    <strong>{card.name}</strong>
                    <span className="proto-card-desc">{card.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="proto-card-row">
                {mockSkillCards.map((card) => (
                  <button type="button" key={card.id} className={`proto-card ${card.type}`}>
                    <div className="proto-card-art" />
                    <span className="proto-card-slot">{formatType(card.type)}</span>
                    <strong>{card.name}</strong>
                    <span className="proto-card-desc">{card.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exit back to home */}
          <button type="button" className="proto-exit" onClick={openHome}>← 返回首页</button>
        </div>
      </div>
    </main>
  )
}

function formatSlot(slot: string) {
  switch (slot) {
    case 'emergency': return '救急'
    case 'synergy': return '联动'
    case 'pivot': return '转向'
    default: return slot
  }
}

function formatType(type: string) {
  switch (type) {
    case 'energy': return '能量'
    case 'attack': return '攻击'
    case 'defense': return '防御'
    case 'emergency': return '救急'
    case 'pivot': return '转向'
    default: return type
  }
}
