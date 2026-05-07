import { useCallback, useEffect, useRef, useState } from 'react'
import { levels, strategyCards, type LevelId, type StrategyCardId } from '@tower-rogue/game-core'
import { formatStrategyCardDamageAtLevel } from '../../ui/strategyCardText'
import { StrategyCardArtwork } from '../../ui/StrategyCardArtwork'
import {
  DAILY_SKILL_CRYSTAL_PURCHASE_LIMIT,
  SKILL_CRYSTAL_GOLD_COST,
  getSkillCardLevel,
  getSkillCardUpgradeCost,
  useAppStore
} from '../appStore'
import {
  canEquipSkillCard,
  getSkillCardById,
  getSkillCardDescription,
  premiumCardCosts
} from '../skillCardRules'

export function HomePage() {
  const highlightedLevelId = useAppStore((state) => state.highlightedLevelId)
  const gold = useAppStore((state) => state.gold)
  const skillCrystals = useAppStore((state) => state.skillCrystals)
  const inspirationCrystals = useAppStore((state) => state.inspirationCrystals)
  const skillLoadout = useAppStore((state) => state.skillLoadout)
  const skillLevels = useAppStore((state) => state.skillLevels)
  const dailySkillCrystalPurchases = useAppStore((state) => state.dailySkillCrystalPurchases)
  const skillCrystalPurchaseDate = useAppStore((state) => state.skillCrystalPurchaseDate)
  const ownedPremiumCards = useAppStore((state) => state.ownedPremiumCards)
  const unlockedRewardCards = useAppStore((state) => state.unlockedRewardCards)
  const latestUnlockedRewardCardId = useAppStore((state) => state.latestUnlockedRewardCardId)
  const latestMapClearReward = useAppStore((state) => state.latestMapClearReward)
  const setSkillLoadout = useAppStore((state) => state.setSkillLoadout)
  const buyPremiumCard = useAppStore((state) => state.buyPremiumCard)
  const buyDailySkillCrystal = useAppStore((state) => state.buyDailySkillCrystal)
  const upgradeSkillCard = useAppStore((state) => state.upgradeSkillCard)
  const dismissLatestUnlockedRewardCard = useAppStore((state) => state.dismissLatestUnlockedRewardCard)
  const dismissLatestMapClearReward = useAppStore((state) => state.dismissLatestMapClearReward)
  const startLevel = useAppStore((state) => state.startLevel)
  const [skillPanelOpen, setSkillPanelOpen] = useState(false)
  const [shopPanelOpen, setShopPanelOpen] = useState(false)
  const [mapPanelOpen, setMapPanelOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null)
  const showComingSoon = useCallback((label: string) => {
    setToast({ message: `「${label}」即将开放`, key: Date.now() })
  }, [])
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId>(highlightedLevelId)

  const selectedLevel = levels.find((level) => level.id === selectedLevelId) ?? levels[0]
  const todayKey = new Date().toISOString().slice(0, 10)
  const todaySkillCrystalPurchases = skillCrystalPurchaseDate === todayKey ? dailySkillCrystalPurchases : 0
  const remainingSkillCrystalPurchases = Math.max(0, DAILY_SKILL_CRYSTAL_PURCHASE_LIMIT - todaySkillCrystalPurchases)
  const canBuyDailySkillCrystal = gold >= SKILL_CRYSTAL_GOLD_COST && remainingSkillCrystalPurchases > 0
  const handleStart = () => {
    startLevel(selectedLevel.id)
  }
  const selectedCards = skillLoadout
    .map((cardId) => strategyCards.find((card) => card.id === cardId))
    .filter((card): card is (typeof strategyCards)[number] => card !== undefined)
  const skillPackSlots = Array.from({ length: 5 }, (_, index) => selectedCards[index])
  const latestUnlockedRewardCard = latestUnlockedRewardCardId ? getSkillCardById(latestUnlockedRewardCardId) : undefined
  const skillCardLocks = {
    ownedPremiumCards,
    unlockedRewardCards
  }

  function toggleSkillCard(cardId: StrategyCardId) {
    if (!canEquipSkillCard(cardId, skillCardLocks)) {
      return
    }

    if (skillLoadout.includes(cardId)) {
      setSkillLoadout(skillLoadout.filter((item) => item !== cardId))
      return
    }

    if (skillLoadout.length >= 5) {
      return
    }

    setSkillLoadout([...skillLoadout, cardId])
  }

  return (
    <main className="menu-screen">
      <video className="menu-background-video" autoPlay loop muted playsInline preload="auto" aria-hidden="true">
        <source src="/assets/ui/主界面图.mp4" type="video/mp4" />
      </video>

      <div className="menu-avatar-info" aria-label="头像信息">
        <img className="menu-avatar-image" src="/assets/ui/头像信息.png" alt="头像信息" draggable={false} />
      </div>

      <div className="menu-resource-bar" aria-label="资源信息">
        <div className="menu-gold-info">
          <img className="menu-gold-image" src="/assets/ui/金币框.png" alt="金币信息" draggable={false} />
          <span>{gold}</span>
        </div>

        <div className="menu-skill-info">
          <img className="menu-skill-image" src="/assets/ui/紫水晶框.png" alt="技能原石" draggable={false} />
          <span>{skillCrystals}</span>
        </div>

        <div className="menu-inspiration-info">
          <img
            className="menu-inspiration-image"
            src="/assets/ui/体力框.png"
            alt="体力"
            draggable={false}
          />
          <span>{inspirationCrystals}</span>
        </div>
      </div>

      <div className="menu-social-row" aria-label="邮件好友设置">
        <div className="menu-mail-info">
          <img className="menu-mail-image" src="/assets/ui/邮件按钮.png" alt="邮件" draggable={false} />
        </div>

        <div className="menu-friend-info">
          <img className="menu-friend-image" src="/assets/ui/好友按钮.png" alt="好友" draggable={false} />
        </div>

        <div className="menu-settings-info">
          <img className="menu-settings-image" src="/assets/ui/设置按钮.png" alt="设置" draggable={false} />
        </div>
      </div>

      <div className="menu-skill-pack" aria-label="当前刷图技能包">
        <div className="menu-skill-pack-header">
          <span className="menu-skill-pack-icon" aria-hidden="true" />
          <span className="menu-skill-pack-title">技能包</span>
          <span className="menu-skill-pack-count">{selectedCards.length}/5</span>
        </div>
        <div className="menu-skill-pack-cards">
          {Array.from({ length: 5 }, (_, i) => {
            const card = selectedCards[i]
            return (
              <div key={card?.id ?? `empty-${i}`} className={`menu-skill-pack-slot${card ? '' : ' empty'}${card ? ` type-${card.type}` : ''}`}>
                {card ? (
                  <>
                    <StrategyCardArtwork cardId={card.id} name={card.name} type={card.type} className="slot-art" />
                    <div className="slot-info">
                      <span className="slot-type-tag">{formatCardType(card.type)}</span>
                      <span className="slot-name">{card.name}</span>
                    </div>
                  </>
                ) : (
                  <span className="slot-empty-mark">+</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="menu-entry-stack menu-entry-stack-left" aria-label="主界面入口左侧">
        <button className="menu-entry-button menu-entry-button-shift-up" type="button" aria-label="学院传送门" onClick={() => setMapPanelOpen(true)}>
          <img className="menu-entry-image" src="/assets/ui/学院传送门按钮.png" alt="学院传送门" draggable={false} />
        </button>

        <button
          className="menu-entry-button menu-entry-button-compact menu-entry-button-announcement-offset menu-entry-button-announcement-compact"
          type="button"
          aria-label="公告"
          onClick={() => showComingSoon('公告')}
        >
          <img className="menu-entry-image" src="/assets/ui/公告按钮.png" alt="公告" draggable={false} />
        </button>

        <button
          className="menu-entry-button menu-entry-button-compact menu-entry-button-archive-offset"
          type="button"
          aria-label="图鉴"
          onClick={() => showComingSoon('图鉴')}
        >
          <img className="menu-entry-image" src="/assets/ui/图鉴按钮.png" alt="图鉴" draggable={false} />
        </button>
      </div>

      <div className="menu-entry-row menu-entry-row-bottom-left" aria-label="主界面底部左侧">
        <button
          className="menu-entry-button menu-entry-button-bottom-boost menu-entry-button-equip-shift"
          type="button"
          aria-label="装备"
          onClick={() => showComingSoon('装备')}
        >
          <img className="menu-entry-image" src="/assets/ui/装备按钮.png" alt="装备" draggable={false} />
        </button>

        <button className="menu-entry-button menu-entry-button-bottom-boost" type="button" aria-label="英雄" onClick={() => showComingSoon('英雄')}>
          <img className="menu-entry-image" src="/assets/ui/英雄按钮.png" alt="英雄" draggable={false} />
        </button>

        <button
          className="menu-entry-button menu-entry-button-bottom-boost menu-entry-button-defense-shift"
          type="button"
          aria-label="防御塔"
          onClick={() => showComingSoon('防御塔')}
        >
          <img className="menu-entry-image" src="/assets/ui/防御塔按钮.png" alt="防御塔" draggable={false} />
        </button>

        <button
          className="menu-entry-button menu-entry-button-bottom-boost menu-entry-button-skill-shift"
          type="button"
          aria-label="技能"
          onClick={() => setSkillPanelOpen(true)}
        >
          <img className="menu-entry-image" src="/assets/ui/技能按钮.png" alt="技能" draggable={false} />
        </button>

        <button
          className="menu-entry-button menu-entry-button-achievement-shift"
          type="button"
          aria-label="成就"
          onClick={() => showComingSoon('成就')}
        >
          <img className="menu-entry-image" src="/assets/ui/成就按钮.png" alt="成就" draggable={false} />
        </button>
      </div>

      <div className="menu-entry-stack menu-entry-stack-right" aria-label="主界面入口右侧">
        <button className="menu-entry-button" type="button" aria-label="商店" onClick={() => setShopPanelOpen(true)}>
          <img className="menu-entry-image" src="/assets/ui/商店按钮.png" alt="商店" draggable={false} />
        </button>

        <button className="menu-entry-button" type="button" aria-label="PK对战" onClick={() => showComingSoon('PK对战')}>
          <img className="menu-entry-image" src="/assets/ui/PK对战按钮.png" alt="PK对战" draggable={false} />
        </button>

        <button className="menu-entry-button" type="button" aria-label="排行榜" onClick={() => showComingSoon('排行榜')}>
          <img className="menu-entry-image" src="/assets/ui/排行榜按钮.png" alt="排行榜" draggable={false} />
        </button>
      </div>


      {mapPanelOpen && (
        <div className="menu-skill-config menu-map-panel" role="dialog" aria-label="地图模式选择">
          <div className="menu-skill-config-head">
            <div>
              <strong>火山前线</strong>
              <span>选择挑战模式后，再点击【进入】开始地图。</span>
            </div>
            <button type="button" onClick={() => setMapPanelOpen(false)}>
              关闭
            </button>
          </div>
          <div className="menu-difficulty-panel" aria-label="地图难度选择">
            {levels.map((level) => (
              <button
                key={level.id}
                className={selectedLevelId === level.id ? 'selected' : ''}
                type="button"
                onClick={() => setSelectedLevelId(level.id)}
              >
                <strong>{level.difficulty === 'easy' ? '简单模式' : '困难模式'}</strong>
                <span>{level.waveCount} 波敌人 · 金币 {level.clearReward.gold[0]}-{level.clearReward.gold[1]}</span>
                <em>
                  技能原石 {level.clearReward.skillCrystals[0]}-{level.clearReward.skillCrystals[1]}
                  {'firstClearCardId' in level.clearReward ? ' · 首次掉落地图技能卡' : ''}
                </em>
              </button>
            ))}
          </div>
          <div className="menu-map-panel-footer">
            <span>
              当前选择：{selectedLevel.difficulty === 'easy' ? '简单模式' : '困难模式'} · {selectedLevel.waveCount} 波
            </span>
            <button type="button" onClick={handleStart}>
              进入
            </button>
          </div>
        </div>
      )}

      {skillPanelOpen && (
        <div className="menu-skill-config" role="dialog" aria-label="技能包配置">
          <div className="menu-skill-config-head">
            <div>
              <strong>刷图技能包</strong>
              <span>选择 5 张技能卡进入地图，每张卡本局只能使用一次。</span>
            </div>
            <button type="button" onClick={() => setSkillPanelOpen(false)}>
              关闭
            </button>
          </div>
          <div className="menu-skill-config-loadout" aria-label="当前技能包">
            {skillPackSlots.map((card, index) =>
              card ? (
                <div key={card.id} className={`menu-skill-pack-slot type-${card.type}`}>
                  <StrategyCardArtwork cardId={card.id} name={card.name} type={card.type} className="slot-art" />
                  <div className="slot-info">
                    <span className="slot-type-tag">{formatCardType(card.type)}</span>
                    <span className="slot-name">{card.name}</span>
                  </div>
                </div>
              ) : (
                <div key={`empty-${index}`} className="menu-skill-pack-slot empty" aria-hidden="true">
                  <span className="slot-empty-mark">+</span>
                </div>
              )
            )}
          </div>
          <div className="menu-skill-config-count">已选择 {skillLoadout.length}/5</div>
          <div className="menu-skill-card-grid">
            {strategyCards.map((card) => {
              const selected = skillLoadout.includes(card.id)
              const unlocked = canEquipSkillCard(card.id, skillCardLocks)
              const disabled = !selected && (!unlocked || skillLoadout.length >= 5)
              const skillLevel = getSkillCardLevel(skillLevels, card.id)
              const upgradeCost = getSkillCardUpgradeCost(skillLevel)
              const canUpgrade = unlocked && skillLevel < 100 && skillCrystals >= upgradeCost
              const damageText = formatStrategyCardDamageAtLevel(card, skillLevel)
              const description = getSkillCardDescription(card.id, skillCardLocks, card.description)

              return (
                <div key={card.id} className={`menu-skill-card ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}>
                  <StrategyCardArtwork cardId={card.id} name={card.name} type={card.type} className="menu-skill-card-art" />
                  <span>{formatCardType(card.type)}</span>
                  <strong>{card.name} · {skillLevel}阶</strong>
                  {damageText ? <small className="card-damage-badge">{damageText}</small> : null}
                  <em>{description}</em>
                  <div className="menu-skill-card-actions">
                    <button type="button" disabled={disabled} onClick={() => toggleSkillCard(card.id)}>
                      {selected ? '移出技能包' : unlocked ? '加入技能包' : '未解锁'}
                    </button>
                  <button
                    className="menu-skill-upgrade-button"
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => upgradeSkillCard(card.id)}
                  >
                    {skillLevel >= 100 ? '满阶' : `升级 ${upgradeCost} 原石`}
                  </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {shopPanelOpen && (
        <div className="menu-skill-config menu-shop-panel" role="dialog" aria-label="商店">
          <div className="menu-skill-config-head">
            <div>
              <strong>商店</strong>
              <span>金币 {gold} · 技能原石 {skillCrystals} · 灵感原石 {inspirationCrystals}</span>
            </div>
            <button type="button" onClick={() => setShopPanelOpen(false)}>
              关闭
            </button>
          </div>
          <div className="menu-shop-card menu-shop-crystal-card">
            <div className="menu-shop-crystal-icon" aria-hidden="true">
              <img src="/assets/ui/skill_crystal.png" alt="" draggable={false} />
            </div>
            <div className="menu-shop-card-copy">
              <span>每日补给</span>
              <strong>技能原石</strong>
              <em>
                消耗金币购买 1 个技能原石。今日剩余 {remainingSkillCrystalPurchases}/{DAILY_SKILL_CRYSTAL_PURCHASE_LIMIT} 次。
              </em>
            </div>
            <button type="button" disabled={!canBuyDailySkillCrystal} onClick={buyDailySkillCrystal}>
              {remainingSkillCrystalPurchases <= 0
                ? '今日已售罄'
                : gold < SKILL_CRYSTAL_GOLD_COST
                  ? '金币不足'
                  : '购买 1 个'}
            </button>
          </div>
          <div className="menu-shop-card">
            <StrategyCardArtwork
              cardId="premium_starfall_contract"
              name="星陨契约"
              type="attack"
              className="menu-shop-card-art"
            />
            <div className="menu-shop-card-copy">
              <span>氪金技能卡</span>
              <strong>星陨契约</strong>
              <small className="card-damage-badge">
                {formatStrategyCardDamageAtLevel(getSkillCardById('premium_starfall_contract')!, getSkillCardLevel(skillLevels, 'premium_starfall_contract'))}
              </small>
              <em>召唤 3 颗星陨火石攻击当前血量最高的敌人。购买后可加入刷图技能包。</em>
            </div>
            <button
              type="button"
              disabled={
                ownedPremiumCards.includes('premium_starfall_contract') ||
                inspirationCrystals < (premiumCardCosts.premium_starfall_contract ?? 0)
              }
              onClick={() => buyPremiumCard('premium_starfall_contract', premiumCardCosts.premium_starfall_contract ?? 0)}
            >
              {ownedPremiumCards.includes('premium_starfall_contract')
                ? '已拥有'
                : inspirationCrystals < (premiumCardCosts.premium_starfall_contract ?? 0)
                  ? `灵感原石不足（需要 ${premiumCardCosts.premium_starfall_contract ?? 0}）`
                  : `购买：${premiumCardCosts.premium_starfall_contract ?? 0} 灵感原石`}
            </button>
          </div>
        </div>
      )}

      {latestUnlockedRewardCard && (
        <div className="menu-skill-config menu-reward-panel" role="dialog" aria-label="通关解锁奖励">
          <div className="menu-skill-config-head">
            <div>
              <strong>通关解锁</strong>
              <span>新奖励技能已加入刷图技能包候选。</span>
            </div>
            <button type="button" onClick={dismissLatestUnlockedRewardCard}>
              关闭
            </button>
          </div>
          <div className="menu-reward-card">
            <StrategyCardArtwork
              cardId={latestUnlockedRewardCard.id}
              name={latestUnlockedRewardCard.name}
              type={latestUnlockedRewardCard.type}
              className="menu-shop-card-art"
            />
            <div className="menu-shop-card-copy">
              <span>奖励技能卡</span>
              <strong>{latestUnlockedRewardCard.name}</strong>
              {formatStrategyCardDamageAtLevel(latestUnlockedRewardCard, getSkillCardLevel(skillLevels, latestUnlockedRewardCard.id)) ? (
                <small className="card-damage-badge">
                  {formatStrategyCardDamageAtLevel(latestUnlockedRewardCard, getSkillCardLevel(skillLevels, latestUnlockedRewardCard.id))}
                </small>
              ) : null}
              <em>{latestUnlockedRewardCard.description}</em>
            </div>
            <button type="button" onClick={dismissLatestUnlockedRewardCard}>
              知道了
            </button>
          </div>
        </div>
      )}

      {toast && (
        <ComingSoonToast key={toast.key} message={toast.message} onDone={() => setToast(null)} />
      )}

      {latestMapClearReward && (
        <div className="menu-skill-config menu-reward-panel" role="dialog" aria-label="地图通关掉落">
          <div className="menu-skill-config-head">
            <div>
              <strong>地图掉落</strong>
              <span>金币 +{latestMapClearReward.gold} · 技能原石 +{latestMapClearReward.skillCrystals}</span>
            </div>
            <button type="button" onClick={dismissLatestMapClearReward}>
              关闭
            </button>
          </div>
          <div className="menu-clear-reward-copy">
            <strong>{latestMapClearReward.unlockedCardId ? '首次通关奖励技能已解锁！' : '奖励已放入背包。'}</strong>
            <em>可以在技能面板消耗技能原石提升技能阶数。</em>
            <button type="button" onClick={dismissLatestMapClearReward}>
              收下
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

const TOAST_DURATION_MS = 2000

function ComingSoonToast({ message, onDone }: { message: string; onDone: () => void }) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      timerRef.current = setTimeout(onDone, 360)
    }, TOAST_DURATION_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDone])

  return (
    <div className={`coming-soon-toast${exiting ? ' exiting' : ''}`} role="status" aria-live="polite">
      <span className="coming-soon-toast-icon">🔒</span>
      <span className="coming-soon-toast-text">{message}</span>
      <span className="coming-soon-toast-sub">敬请期待</span>
    </div>
  )
}

function formatCardType(type: (typeof strategyCards)[number]['type']) {
  switch (type) {
    case 'energy':
      return '能量'
    case 'attack':
      return '攻击'
    case 'defense':
      return '防御'
    case 'emergency':
      return '救急'
    case 'pivot':
      return '转向'
    default:
      return type
  }
}
