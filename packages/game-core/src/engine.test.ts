import { buildingDefinitions, cellCenter, lawn, strategyCardDefinitions } from '@tower-rogue/game-content'
import { describe, expect, it } from 'vitest'
import { createBattleSnapshot } from './battleSnapshot'
import { GameEngine } from './engine'
import { recommendStrategyCards } from './recommender'
import {
  INITIAL_READY_COUNTDOWN_SECONDS,
  WAVE_CLEARED_CARD_SELECTION_SECONDS
} from './runLoop'
import { ACTIVE_STRATEGY_CARD_DRAW_COST } from './strategyCardDraw'
import { clearExpiredCardEffects, isStrategyCardImplemented } from './systems/cards'
import { updatePlants } from './systems/plants'
import { updateProjectiles } from './systems/projectiles'
import { updateZombies } from './systems/zombies'
import type { BattleSnapshot, GameEvent, Plant, Zombie } from './types'

describe('GameEngine core rules', () => {
  it('starts with no building selected', () => {
    const engine = new GameEngine()

    expect(engine.state.selectedPlantType).toBeNull()
    expect(engine.getSnapshot().selectedPlantType).toBeNull()
  })

  it('places a selected plant, spends sun, and records a plant placement', () => {
    const engine = new GameEngine()
    const startingSun = engine.state.sun
    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2 })

    expect(engine.state.sun).toBe(startingSun - buildingDefinitions.ranged_turret.cost)
    expect(engine.state.plants).toHaveLength(1)
    expect(engine.state.plants[0]?.type).toBe('ranged_turret')

    const events = engine.drainEvents()
    expect(events.some((event) => event.type === 'plantPlaced' && event.plantType === 'ranged_turret')).toBe(true)
    expect(engine.state.selectedPlantType).toBeNull()
  })

  it('keeps energy cores idle until the wave starts', () => {
    const engine = new GameEngine()
    const startingSun = engine.state.sun

    engine.dispatch({ type: 'selectPlant', plantType: 'energy_core' })
    engine.dispatch({ type: 'placePlant', row: 4, col: 2 })
    const afterPlacementSun = startingSun - buildingDefinitions.energy_core.cost
    expect(engine.state.sun).toBe(afterPlacementSun)
    expect(engine.state.plants).toHaveLength(1)

    engine.step(buildingDefinitions.energy_core.productionInterval! + 0.01)

    expect(engine.state.sun).toBe(afterPlacementSun)

    engine.dispatch({ type: 'startWave' })
    engine.step(buildingDefinitions.energy_core.productionInterval! / buildingDefinitions.energy_core.purchasePowerPerTick!)

    expect(engine.state.sun).toBe(afterPlacementSun + 1)

    engine.step(buildingDefinitions.energy_core.productionInterval!)

    expect(engine.state.sun).toBe(afterPlacementSun + buildingDefinitions.energy_core.purchasePowerPerTick! + 1)
  })

  it('does not place buildings outside the board', () => {
    const engine = new GameEngine()
    const startingSun = engine.state.sun

    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 9 })

    expect(engine.state.sun).toBe(startingSun)
    expect(engine.state.plants).toHaveLength(0)
  })

  it('does not place anything until a building is selected', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'placePlant', row: 2, col: 2 })

    expect(engine.state.plants).toHaveLength(0)
  })

  it('keeps the selection after placement in persistent build mode', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret', mode: 'persistent' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2 })

    expect(engine.state.selectedPlantType).toBe('ranged_turret')
    expect(engine.state.selectedPlantMode).toBe('persistent')
  })

  it('enters persistent build mode when shift-place is requested', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2, keepSelected: true })

    expect(engine.state.selectedPlantType).toBe('ranged_turret')
    expect(engine.state.selectedPlantMode).toBe('persistent')
  })

  it('clears the selection after a successful upgrade in single mode', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2, keepSelected: true })

    const upgradeCost = buildingDefinitions.ranged_turret.upgrade?.cost ?? 0
    engine.state.sun = upgradeCost
    engine.dispatch({ type: 'selectPlant', plantType: 'ranged_turret' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2 })

    expect(engine.state.plants[0]?.upgraded).toBe(true)
    expect(engine.state.selectedPlantType).toBeNull()
  })

  it('clears the selected building on demand', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'selectPlant', plantType: 'laser_turret', mode: 'persistent' })
    engine.dispatch({ type: 'clearSelectedPlant' })

    expect(engine.state.selectedPlantType).toBeNull()
    expect(engine.state.selectedPlantMode).toBe('single')
  })

  it('uses each equipped skill card at most once', () => {
    const engine = new GameEngine()
    engine.dispatch({ type: 'setSkillLoadout', cardIds: ['energy_instant_power'] })

    const startingSun = engine.state.sun
    engine.dispatch({ type: 'useSkillCard', cardId: 'energy_instant_power' })

    expect(engine.state.sun).toBe(startingSun + Number(strategyCardDefinitions.energy_instant_power.effect.value))
    expect(engine.getSnapshot().skillPack[0]).toEqual(
      expect.objectContaining({
        cardId: 'energy_instant_power',
        used: true,
        usable: false
      })
    )

    engine.dispatch({ type: 'useSkillCard', cardId: 'energy_instant_power' })

    expect(engine.state.sun).toBe(startingSun + Number(strategyCardDefinitions.energy_instant_power.effect.value))
  })

  it('allows premium and unlocked reward cards to be equipped as active skills', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'setSkillLoadout', cardIds: ['premium_starfall_contract', 'reward_fire_dragon_breath'] })

    expect(engine.getSnapshot().skillPack.map((slot) => slot.cardId)).toEqual(['premium_starfall_contract', 'reward_fire_dragon_breath'])
  })

  it('initializes and preserves the selected skill loadout across resets', () => {
    const engine = new GameEngine(undefined, ['spell_lava_rain', 'summon_flame_hawks'])

    expect(engine.getSnapshot().skillPack.map((slot) => slot.cardId)).toEqual(['spell_lava_rain', 'summon_flame_hawks'])

    engine.dispatch({ type: 'resetRun' })

    expect(engine.getSnapshot().skillPack.map((slot) => slot.cardId)).toEqual(['spell_lava_rain', 'summon_flame_hawks'])
  })

  it('auto-starts the first wave after the initial ready countdown', () => {
    const engine = new GameEngine()

    expect(engine.state.phase).toBe('ready')
    expect(engine.getSnapshot().readyCountdownRemaining).toBeCloseTo(INITIAL_READY_COUNTDOWN_SECONDS, 5)

    engine.step(INITIAL_READY_COUNTDOWN_SECONDS - 0.2)
    expect(engine.state.phase).toBe('ready')

    engine.step(0.25)

    expect(engine.state.phase).toBe('playing')
    expect(engine.state.readyAutoStartAt).toBeUndefined()
  })

  it('tracks authored wave phases in state, events, and HUD snapshots', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'startWave' })

    expect(engine.getSnapshot().currentWavePhase).toEqual(
      expect.objectContaining({
        index: 1,
        total: 1,
        label: '双路起手'
      })
    )
    expect(engine.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'wavePhaseChanged',
          phaseIndex: 0,
          label: '双路起手'
        })
      ])
    )

    clearCurrentWave(engine)
    hydrateRecommendations(engine)
    const selectedCard = engine.state.activeRecommendations[0]?.cardId

    expect(selectedCard).toBeDefined()
    engine.dispatch({ type: 'selectStrategyCard', cardId: selectedCard! })

    expect(engine.getSnapshot().currentWavePhase).toEqual(
      expect.objectContaining({
        index: 1,
        total: 2,
        label: '主路稍压'
      })
    )

    engine.drainEvents()
    engine.step(13.1)

    expect(engine.getSnapshot().currentWavePhase).toEqual(
      expect.objectContaining({
        index: 2,
        total: 2,
        label: '侧路快探'
      })
    )
    expect(engine.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'wavePhaseChanged',
          phaseIndex: 1,
          label: '侧路快探'
        })
      ])
    )
  })

  it('freezes enemies in place with volcanic stasis', () => {
    const engine = new GameEngine()
    const zombie = createZombie({ x: 900 })
    engine.state.zombies = [zombie]
    engine.dispatch({ type: 'setSkillLoadout', cardIds: ['emergency_freeze'] })

    engine.dispatch({ type: 'useSkillCard', cardId: 'emergency_freeze' })
    engine.step(2)

    expect(engine.state.zombies[0]?.x).toBe(900)

    engine.step(1.2)

    expect(engine.state.zombies[0]?.x).toBeLessThan(900)
  })

  it('hits all enemies with fire dragon breath using the code 7 damage profile', () => {
    const engine = new GameEngine()
    const boss = createZombie({ id: 'zombie-boss', category: 'boss', hp: 220, maxHp: 220, x: 880 })
    const grunt = createZombie({ id: 'zombie-grunt', hp: 140, maxHp: 140, x: 940, row: 1 })
    engine.state.zombies = [boss, grunt]
    engine.dispatch({ type: 'setSkillLoadout', cardIds: ['reward_fire_dragon_breath'] })

    engine.dispatch({ type: 'useSkillCard', cardId: 'reward_fire_dragon_breath' })
    engine.step(0.7)

    expect(engine.state.zombies.find((zombie) => zombie.id === boss.id)?.hp).toBe(110)
    expect(engine.state.zombies.find((zombie) => zombie.id === grunt.id)?.hp).toBe(30)
  })

  it('retargets starfall contract across multiple high-hp enemies with code 7 burst values', () => {
    const engine = new GameEngine()
    const first = createZombie({ hp: 120, maxHp: 120, x: 920 })
    const second = createZombie({ hp: 260, maxHp: 260, x: 980, row: 2 })
    engine.state.zombies = [first, second]
    engine.dispatch({ type: 'setSkillLoadout', cardIds: ['premium_starfall_contract'] })

    engine.dispatch({ type: 'useSkillCard', cardId: 'premium_starfall_contract' })

    expect(engine.state.zombies).toHaveLength(0)
  })

  it('removes a zombie that reaches the house line and damages the base', () => {
    const engine = new GameEngine()
    const zombie = createZombie({ x: lawn.houseLineX - 1 })
    engine.state.zombies.push(zombie)

    engine.step(0.1)

    expect(engine.state.baseHp).toBe(9)
    expect(engine.state.zombies).toHaveLength(0)

    const events = engine.drainEvents()
    expect(events.some((event) => event.type === 'baseHit' && event.zombieId === zombie.id)).toBe(true)
  })

  it('lets heavy attack enemies destroy fragile buildings', () => {
    const plant = createPlant({ type: 'energy_core', components: ['energy_core'], hp: 90, maxHp: 90 })
    const zombie = createZombie({
      category: 'heavy_attack',
      buildingDamage: 120,
      x: plant.x,
      row: plant.row,
      type: 'basalt_smasher'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants).toHaveLength(0)
    expect(events.some((event) => event.type === 'plantDestroyed' && event.plantId === plant.id)).toBe(true)
  })

  it('lets lava walls absorb ground enemy attacks', () => {
    const plant = createPlant({
      type: 'lava_wall',
      components: ['lava_wall'],
      hp: 360,
      maxHp: 360
    })
    const zombie = createZombie({
      category: 'heavy_attack',
      buildingDamage: 34,
      x: plant.x,
      row: plant.row,
      type: 'basalt_smasher'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants).toHaveLength(1)
    expect(engine.state.plants[0]?.hp).toBe(326)
    expect(events.some((event) => event.type === 'plantDamaged' && event.plantId === plant.id)).toBe(true)
  })

  it('lets flying enemies bypass defensive buildings', () => {
    const plant = createPlant({
      type: 'lava_wall',
      components: ['lava_wall'],
      hp: 360,
      maxHp: 360
    })
    const zombie = createZombie({
      category: 'flying',
      flying: true,
      blockable: false,
      buildingDamage: 0,
      x: plant.x,
      row: plant.row,
      type: 'ash_wing'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants[0]?.hp).toBe(360)
    expect(engine.state.zombies[0]?.x).toBeLessThan(plant.x)
    expect(events.some((event) => event.type === 'plantDamaged')).toBe(false)
  })

  it('lets wall reflection cards damage attackers on contact', () => {
    const plant = createPlant({
      type: 'lava_wall',
      components: ['lava_wall'],
      hp: 360,
      maxHp: 360
    })
    const zombie = createZombie({
      hp: 8,
      maxHp: 8,
      buildingDamage: 12,
      x: plant.x,
      row: plant.row,
      type: 'ember_grunt'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]
    engine.state.activeCardEffects.wallReflectionDamage = 10
    engine.state.activeCardEffects.wallReflectionInterval = 1
    engine.state.activeCardEffects.wallReflectionLastTriggeredAt = Number.NEGATIVE_INFINITY

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants[0]?.hp).toBe(348)
    expect(engine.state.zombies).toHaveLength(0)
    expect(events.some((event) => event.type === 'zombieKilled' && event.zombieId === zombie.id)).toBe(true)
  })

  it('fires laser beams through multiple enemies and retires depleted laser turrets', () => {
    const engine = new GameEngine()
    const plant = createPlant({
      type: 'laser_turret',
      components: ['laser_turret'],
      hp: buildingDefinitions.laser_turret.hp,
      maxHp: buildingDefinitions.laser_turret.hp,
      chargesRemaining: 1,
      shootCooldown: 0
    })
    const laserDamage = buildingDefinitions.laser_turret.attackPower!
    const zombieA = createZombie({
      id: 'zombie-a',
      row: plant.row,
      x: plant.x + 120,
      hp: laserDamage,
      maxHp: laserDamage,
      type: 'ember_grunt'
    })
    const zombieB = createZombie({
      id: 'zombie-b',
      row: plant.row,
      x: plant.x + 250,
      hp: laserDamage,
      maxHp: laserDamage,
      type: 'spark_runner',
      category: 'fast',
      speed: 1.35,
      buildingDamage: 8,
      attackInterval: 1
    })

    engine.state.plants = [plant]
    engine.state.zombies = [zombieA, zombieB]

    engine.step(0.1)

    expect(engine.state.plants).toHaveLength(0)
    expect(engine.state.zombies).toHaveLength(0)

    const events = engine.drainEvents()
    expect(events.some((event) => event.type === 'laserFired' && event.plantId === plant.id)).toBe(true)
    expect(events.filter((event) => event.type === 'zombieKilled')).toHaveLength(2)
  })

  it('does not let laser turrets target flying enemies', () => {
    const engine = new GameEngine()
    const events: GameEvent[] = []
    const plant = createPlant({
      type: 'laser_turret',
      components: ['laser_turret'],
      hp: buildingDefinitions.laser_turret.hp,
      maxHp: buildingDefinitions.laser_turret.hp,
      chargesRemaining: 1,
      shootCooldown: 0
    })
    const flyingZombie = createZombie({
      id: 'flying-zombie',
      row: plant.row,
      x: plant.x + 120,
      type: 'ash_wing',
      category: 'flying',
      flying: true,
      blockable: false,
      attackInterval: 0,
      buildingDamage: 0
    })

    engine.state.plants = [plant]
    engine.state.zombies = [flyingZombie]

    updatePlants(engine.state, 0.1, events)

    expect(engine.state.plants).toHaveLength(1)
    expect(engine.state.plants[0]?.chargesRemaining).toBe(1)
    expect(engine.state.zombies).toHaveLength(1)
    expect(engine.state.zombies[0]?.hp).toBe(flyingZombie.maxHp)
    expect(events.some((event) => event.type === 'laserFired' && event.plantId === plant.id)).toBe(false)
  })

  it('limits attack targeting to the same lane and forward direction', () => {
    const engine = new GameEngine()
    const plant = createPlant({
      type: 'ranged_turret',
      components: ['ranged_turret'],
      attackDirection: 'right',
      shootCooldown: 0
    })
    const behindZombie = createZombie({
      id: 'behind-zombie',
      row: plant.row,
      x: plant.x - 20
    })
    const otherLaneZombie = createZombie({
      id: 'other-lane-zombie',
      row: plant.row - 1,
      x: plant.x + 40
    })
    const forwardZombie = createZombie({
      id: 'forward-zombie',
      row: plant.row,
      x: plant.x + 180
    })

    engine.state.plants = [plant]
    engine.state.zombies = [behindZombie, otherLaneZombie, forwardZombie]

    engine.step(0.1)

    expect(engine.state.projectiles).toHaveLength(1)
    expect(engine.state.projectiles[0]?.targetId).toBe(forwardZombie.id)
  })

  it('applies projectile damage when a large step would otherwise overshoot the target', () => {
    const engine = new GameEngine()
    const zombie = createZombie({
      id: 'zombie-overshoot',
      x: 535,
      hp: 84,
      maxHp: 84
    })

    engine.state.zombies = [zombie]
    engine.state.projectiles = [
      {
        id: 'projectile-overshoot',
        targetId: zombie.id,
        row: zombie.row,
        x: 406,
        y: zombie.y - 7,
        speed: 420,
        damage: 36,
        canHitFlying: true,
        visualKey: 'basicBolt'
      }
    ]

    const events: GameEvent[] = []

    updateProjectiles(engine.state, 0.4, events)

    expect(engine.state.zombies[0]?.hp).toBe(48)
    expect(engine.state.projectiles).toHaveLength(0)
    expect(events.some((event) => event.type === 'zombieHit' && event.zombieId === zombie.id)).toBe(true)
  })

  it('keeps melee turrets on their configured baseline attack cadence', () => {
    const engine = new GameEngine()
    const plant = createPlant({
      type: 'melee_turret',
      components: ['melee_turret'],
      attackDirection: 'right',
      shootCooldown: 0
    })
    const zombie = createZombie({
      x: plant.x + lawn.cellWidth,
      y: plant.y,
      hp: 1000,
      maxHp: 1000
    })
    const events: GameEvent[] = []

    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updatePlants(engine.state, 0, events)
    updatePlants(engine.state, buildingDefinitions.melee_turret.attackInterval!, events)

    expect(engine.state.zombies[0]?.hp).toBe(1000 - buildingDefinitions.melee_turret.attackPower! * 2)
  })

  it('lets melee turrets retaliate against zombies already biting them from slightly behind', () => {
    const engine = new GameEngine()
    const plant = createPlant({
      type: 'melee_turret',
      components: ['melee_turret'],
      attackDirection: 'right',
      shootCooldown: 0,
      hp: 100,
      maxHp: 100
    })
    const bitingZombie = createZombie({
      id: 'biting-zombie',
      row: plant.row,
      x: plant.x - 20,
      hp: 1000,
      maxHp: 1000,
      attackCooldown: 0
    })

    engine.state.plants = [plant]
    engine.state.zombies = [bitingZombie]

    engine.step(0.1)

    expect(engine.state.zombies[0]?.hp).toBe(1000 - buildingDefinitions.melee_turret.attackPower!)
    expect(engine.state.plants[0]?.hp).toBe(100 - bitingZombie.buildingDamage)
  })

  it('keeps melee turrets from hitting rear zombies that are not yet in bite range', () => {
    const engine = new GameEngine()
    const plant = createPlant({
      type: 'melee_turret',
      components: ['melee_turret'],
      attackDirection: 'right',
      shootCooldown: 0
    })
    const rearZombie = createZombie({
      id: 'rear-zombie',
      row: plant.row,
      x: plant.x - 80,
      hp: 1000,
      maxHp: 1000
    })
    const events: GameEvent[] = []

    engine.state.plants = [plant]
    engine.state.zombies = [rearZombie]

    updatePlants(engine.state, 0, events)

    expect(engine.state.zombies[0]?.hp).toBe(1000)
    expect(events.some((event) => event.type === 'zombieHit' && event.zombieId === rearZombie.id)).toBe(false)
  })

  it('clears the attack interval floor when speed effects expire', () => {
    const engine = new GameEngine()

    engine.state.activeCardEffects.attackIntervalBonus = -0.4
    engine.state.activeCardEffects.attackIntervalMin = 0.65
    engine.state.activeCardEffects.expiresAfterWave.attackIntervalBonus = engine.state.waveIndex

    clearExpiredCardEffects(engine.state, engine.state.waveIndex)

    expect(engine.state.activeCardEffects.attackIntervalBonus).toBe(0)
    expect(engine.state.activeCardEffects.attackIntervalMin).toBe(0)
  })

  it('moves from wave clear to card select, then through all five waves to victory', () => {
    const engine = new GameEngine()

    for (let waveIndex = 0; waveIndex < 4; waveIndex += 1) {
      engine.dispatch({ type: 'startWave' })
      expect(engine.state.phase).toBe('playing')

      clearCurrentWave(engine)

      expect(engine.state.phase).toBe('card_select')
      expect(engine.state.lastBattleSnapshot?.wave).toBe(waveIndex + 1)
      hydrateRecommendations(engine)
      expect(engine.state.activeRecommendations).toHaveLength(3)
      expect(
        engine.state.activeRecommendations.every((recommendation) =>
          isStrategyCardImplemented(strategyCardDefinitions[recommendation.cardId])
        )
      ).toBe(true)

      const selectedCard = engine.state.activeRecommendations[0]?.cardId
      expect(selectedCard).toBeDefined()
      engine.dispatch({ type: 'selectStrategyCard', cardId: selectedCard! })

      expect(engine.state.phase).toBe('playing')
      expect(engine.state.waveIndex).toBe(waveIndex + 1)
    }

    clearCurrentWave(engine)

    expect(engine.state.phase).toBe('won')
    expect(engine.state.resultReason).toContain('通关解锁')
  })

  it('keeps the card selection open until the player chooses a card after wave clear', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'startWave' })
    clearCurrentWave(engine)
    hydrateRecommendations(engine)

    expect(engine.getSnapshot().cardSelectionCountdownRemaining).toBe(0)

    engine.step(WAVE_CLEARED_CARD_SELECTION_SECONDS + 0.1)

    expect(engine.state.phase).toBe('card_select')
    expect(engine.state.waveIndex).toBe(0)
    expect(engine.state.activeRecommendations).toHaveLength(3)
    expect(engine.state.cardSelectionAutoPickAt).toBeUndefined()
  })

  it('applies the director plan to the next wave before spawning starts', () => {
    const engine = new GameEngine()
    engine.state.directorPlan = {
      targetWaveIndex: 0,
      intent: 'probe_fast',
      params: {
        intent: 'probe_fast',
        aggression: 0.8,
        primaryRoute: 'mixed',
        roleWeights: {
          normal: 0,
          fast: 1,
          heavyAttack: 0,
          flying: 0
        },
        spendRatio: 0.5,
        timingStyle: 'frontload'
      },
      budget: {
        reserve: 4,
        spendCap: 2,
        spent: 2
      },
      addedGroups: [{ enemyId: 'spark_runner', count: 1, route: 'mixed', startSecond: 6, interval: 2.4 }],
      removedEnemyCount: 2,
      reasonTags: ['base_danger'],
      preview: {
        title: '多线极速试探',
        subtitle: '前段快速压线，优先补阻挡或减速。',
        tags: ['多线', '高速', '前压'],
        threatLevel: 'medium'
      }
    }

    engine.dispatch({ type: 'startWave' })

    expect(engine.state.directorPlan).toBeUndefined()
    expect(engine.state.activeDirectorPlanForWave?.intent).toBe('probe_fast')
    expect(engine.state.recentDirectorHistory).toEqual([
      {
        wave: 1,
        intent: 'probe_fast',
        primaryRoute: 'mixed',
        reasonTag: 'base_danger'
      }
    ])
    expect(engine.state.wave.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ enemyId: 'ember_grunt', count: 1, route: 'center', source: 'base' }),
        expect.objectContaining({ enemyId: 'ember_grunt', count: 2, route: 'left', source: 'base' }),
        expect.objectContaining({ enemyId: 'spark_runner', count: 1, source: 'director' })
      ])
    )
    expect(engine.state.wave.groups.reduce((sum, group) => sum + group.count, 0)).toBe(4)
  })

  it('records a director outcome when a directed wave ends', () => {
    const engine = new GameEngine()
    engine.state.directorPlan = {
      targetWaveIndex: 0,
      intent: 'probe_fast',
      params: {
        intent: 'probe_fast',
        aggression: 0.8,
        primaryRoute: 'right',
        roleWeights: {
          normal: 0.35,
          fast: 1,
          heavyAttack: 0,
          flying: 0
        },
        spendRatio: 0.75,
        timingStyle: 'frontload'
      },
      budget: {
        reserve: 4,
        spendCap: 3,
        spent: 3
      },
      addedGroups: [{ enemyId: 'spark_runner', count: 1, route: 'right', startSecond: 4, interval: 1.6 }],
      removedEnemyCount: 0,
      reasonTags: ['fast_pressure_high'],
      preview: {
        title: '右路极速试探',
        subtitle: '前段快速压线，优先补阻挡或减速。',
        tags: ['右路', '高速', '前压'],
        threatLevel: 'high'
      }
    }

    engine.dispatch({ type: 'startWave' })
    engine.state.currentWaveStats.leaks = 1
    engine.state.currentWaveStats.destroyedBuildings = 1
    clearCurrentWave(engine)

    expect(engine.state.lastDirectorOutcome).toEqual({
      wave: 1,
      intent: 'probe_fast',
      primaryRoute: 'right',
      leaks: 1,
      destroyedBuildings: 1,
      baseHpDelta: 0,
      verdict: 'on_target'
    })
  })

  it('hydrates director params into the active next wave before the first spawn', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'startWave' })
    clearCurrentWave(engine)

    expect(engine.state.phase).toBe('card_select')
    expect(engine.state.lastBattleSnapshot?.wave).toBe(1)

    hydrateRecommendations(engine)
    const selectedCard = engine.state.activeRecommendations[0]?.cardId

    expect(selectedCard).toBeDefined()
    engine.dispatch({ type: 'selectStrategyCard', cardId: selectedCard! })

    expect(engine.state.phase).toBe('playing')
    expect(engine.state.waveIndex).toBe(1)

    engine.dispatch({
      type: 'hydrateDirectorDecisionParams',
      clearedWave: 1,
      params: {
        intent: 'probe_fast',
        aggression: 0.8,
        primaryRoute: 'right',
        roleWeights: {
          normal: 0.35,
          fast: 1,
          heavyAttack: 0,
          flying: 0
        },
        spendRatio: 0.75,
        timingStyle: 'frontload'
      }
    })

    expect(engine.state.directorPlan).toBeUndefined()
    expect(engine.state.activeDirectorPlanForWave).toEqual(
      expect.objectContaining({
        targetWaveIndex: 1,
        intent: 'probe_fast',
        budget: {
          reserve: 4,
          spendCap: 3,
          spent: 3
        },
        addedGroups: [
          {
            enemyId: 'spark_runner',
            count: 1,
            route: 'right',
            startSecond: 4,
            interval: 1.6
          },
          {
            enemyId: 'ember_grunt',
            count: 1,
            route: 'right',
            startSecond: 6.2,
            interval: 2.1
          }
        ],
        preview: expect.objectContaining({
          title: '右路极速试探',
          tags: ['右路', '高速', '前压']
        })
      })
    )
    expect(engine.state.wave.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          enemyId: 'spark_runner',
          count: 1,
          route: 'right',
          source: 'director'
        })
      ])
    )
  })

  it('prefers a pending AI wave plan over the old director plan when the next wave starts', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'startWave' })
    clearCurrentWave(engine)
    hydrateRecommendations(engine)
    const selectedCard = engine.state.activeRecommendations[0]?.cardId

    expect(selectedCard).toBeDefined()

    engine.dispatch({
      type: 'hydrateAiWavePlan',
      clearedWave: 1,
      plan: {
        pressureGoal: '中路稳压，再插入右路快怪。',
        nextWaveHint: '右路后段会突然提速。',
        phases: [
          {
            label: '中路起压',
            startSecond: 0,
            directives: [
              {
                kind: 'role',
                role: 'normal',
                route: 'center',
                budgetUnits: 5,
                cadence: 'steady',
                startOffset: 2
              }
            ]
          },
          {
            label: '右路插速',
            startSecond: 12,
            directives: [
              {
                kind: 'role',
                role: 'fast',
                route: 'right',
                budgetUnits: 4,
                cadence: 'dense'
              }
            ]
          }
        ]
      }
    })

    engine.dispatch({
      type: 'hydrateDirectorDecisionParams',
      clearedWave: 1,
      params: {
        intent: 'probe_fast',
        aggression: 0.8,
        primaryRoute: 'right',
        roleWeights: {
          normal: 0.35,
          fast: 1,
          heavyAttack: 0,
          flying: 0
        },
        spendRatio: 0.75,
        timingStyle: 'frontload'
      }
    })

    engine.dispatch({ type: 'selectStrategyCard', cardId: selectedCard! })

    expect(engine.state.activeAiWavePlanForWave).toEqual(
      expect.objectContaining({
        targetWaveIndex: 1,
        source: 'ai-wave-director',
        phases: [
          expect.objectContaining({ label: '中路起压' }),
          expect.objectContaining({ label: '右路插速' })
        ]
      })
    )
    expect(engine.state.activeDirectorPlanForWave).toBeUndefined()
    expect(engine.getSnapshot().wavePlanPreview).toEqual(
      expect.objectContaining({
        title: expect.stringContaining('中路起压')
      })
    )
    expect(engine.state.wave.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          enemyId: 'ember_grunt',
          count: 5,
          route: 'center',
          source: 'ai-wave-director'
        }),
        expect.objectContaining({
          enemyId: 'spark_runner',
          count: 2,
          route: 'right',
          source: 'ai-wave-director'
        })
      ])
    )
  })

  it('stages director adjustments until the next wave begins', () => {
    const engine = new GameEngine()

    engine.dispatch({
      type: 'applyDirectorAdjustment',
      adjustment: {
        spawnIntervalMultiplier: 0.9,
        zombieHpMultiplier: 1.1,
        sunDripMultiplier: 0.95
      }
    })

    expect(engine.state.director).toEqual({
      spawnIntervalMultiplier: 1,
      zombieHpMultiplier: 1,
      sunDripMultiplier: 1
    })
    expect(engine.state.pendingDirectorAdjustment).toEqual({
      spawnIntervalMultiplier: 0.9,
      zombieHpMultiplier: 1.1,
      sunDripMultiplier: 0.95
    })

    engine.dispatch({ type: 'startWave' })

    expect(engine.state.director).toEqual({
      spawnIntervalMultiplier: 0.9,
      zombieHpMultiplier: 1.1,
      sunDripMultiplier: 0.95
    })
    expect(engine.state.pendingDirectorAdjustment).toBeUndefined()
  })

  it('draws strategy cards as an active skill and resumes the current wave after selection', () => {
    const engine = new GameEngine()
    const startingSun = engine.state.sun

    engine.dispatch({ type: 'startWave' })
    expect(engine.state.phase).toBe('playing')

    engine.dispatch({ type: 'drawStrategyCards' })

    expect(engine.state.phase).toBe('card_select')
    expect(engine.state.paused).toBe(true)
    expect(engine.state.strategyCardSelection?.source).toBe('active-skill')
    hydrateRecommendations(engine)
    expect(engine.state.activeRecommendations).toHaveLength(3)
    expect(engine.state.nextStrategyCardDrawAt).toBeGreaterThan(0)
    expect(engine.state.sun).toBe(startingSun - ACTIVE_STRATEGY_CARD_DRAW_COST)

    const selectedCard = engine.state.activeRecommendations[0]?.cardId
    expect(selectedCard).toBeDefined()

    engine.dispatch({ type: 'selectStrategyCard', cardId: selectedCard! })

    expect(engine.state.phase).toBe('playing')
    expect(engine.state.paused).toBe(false)
    expect(engine.state.waveIndex).toBe(0)
    expect(engine.state.activeRecommendations).toHaveLength(0)

    engine.dispatch({ type: 'drawStrategyCards' })
    expect(engine.state.phase).toBe('playing')
    expect(engine.state.activeRecommendations).toHaveLength(0)
  })

  it('does not allow active strategy draw outside an active wave or without enough purchase power', () => {
    const engine = new GameEngine()

    engine.dispatch({ type: 'drawStrategyCards' })
    expect(engine.state.phase).toBe('ready')
    expect(engine.state.activeRecommendations).toHaveLength(0)

    engine.dispatch({ type: 'startWave' })
    engine.state.sun = ACTIVE_STRATEGY_CARD_DRAW_COST - 1
    engine.dispatch({ type: 'drawStrategyCards' })

    expect(engine.state.phase).toBe('playing')
    expect(engine.state.activeRecommendations).toHaveLength(0)
  })

  it('builds recommendation reasons from the current battle snapshot instead of static card copy', () => {
    const snapshot: BattleSnapshot = {
      wave: 2,
      baseHp: 5,
      purchasePower: 45,
      leaksLastWave: 2,
      destroyedBuildingsLastWave: 1,
      buildingCounts: { energy: 1, attack: 1, defense: 0 },
      outputProfile: {
        groundDamage: 38,
        flyingDamage: 38,
        attackCoverage: 1,
        blockCapacity: 80,
        energyIncome: 25
      },
      pressureProfile: {
        groundPressure: 9,
        flyingPressure: 4,
        fastPressure: 4,
        buildingDamagePressure: 2
      },
      lanePressure: [
        {
          lane: 0,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 12,
          flyingDps: 12,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.82
        },
        {
          lane: 1,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 1,
          groundDps: 10,
          flyingDps: 10,
          blockHp: 0,
          economyValue: 25,
          pressureScore: 0.78
        },
        {
          lane: 2,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 16,
          flyingDps: 16,
          blockHp: 80,
          economyValue: 0,
          pressureScore: 0.41
        },
        {
          lane: 3,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 0,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.36
        },
        {
          lane: 4,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 0,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.33
        }
      ],
      nextWavePreview: {
        normal: 4,
        fast: 4,
        heavyAttack: 2,
        flying: 4,
        hasBoss: false
      },
      problemTags: ['low_economy', 'fast_pressure_high', 'flying_pressure_high', 'coverage_low'],
      chosenCardTags: []
    }

    const recommendations = recommendStrategyCards(snapshot)

    expect(recommendations).toHaveLength(3)
    expect(recommendations.some((recommendation) => /购买力|飞行|极速|第 1 路/.test(recommendation.reason))).toBe(true)
    expect(recommendations.every((recommendation) => recommendation.reason.length > 0)).toBe(true)
  })

  it('builds lanePressure from per-lane losses, buildings, and next-wave routing', () => {
    const engine = new GameEngine()
    engine.state.lastWaveStats.byLane[0]!.leaks = 2
    engine.state.lastWaveStats.byLane[0]!.destroyedBuildings = 1
    engine.state.lastWaveStats.byLane[3]!.destroyedBuildings = 1
    engine.state.plants = [
      createPlant({
        id: 'energy-lane-0',
        type: 'energy_core',
        components: ['energy_core'],
        row: 0,
        col: 0,
        hp: buildingDefinitions.energy_core.hp,
        maxHp: buildingDefinitions.energy_core.hp
      }),
      createPlant({
        id: 'wall-lane-0',
        type: 'lava_wall',
        components: ['lava_wall'],
        row: 0,
        col: 4,
        hp: 220,
        maxHp: buildingDefinitions.lava_wall.hp
      }),
      createPlant({
        id: 'turret-lane-2',
        type: 'melee_turret',
        components: ['melee_turret'],
        row: 2,
        col: 2,
        hp: buildingDefinitions.melee_turret.hp,
        maxHp: buildingDefinitions.melee_turret.hp
      }),
      createPlant({
        id: 'turret-lane-4',
        type: 'ranged_turret',
        components: ['ranged_turret'],
        row: 4,
        col: 2,
        hp: buildingDefinitions.ranged_turret.hp,
        maxHp: buildingDefinitions.ranged_turret.hp,
        upgraded: true
      })
    ]

    const snapshot = createBattleSnapshot(engine.state)

    expect(snapshot.lanePressure).toHaveLength(lawn.rows)
    expect(snapshot.lanePressure[0]).toEqual(
      expect.objectContaining({
        lane: 0,
        leaksLastWave: 2,
        destroyedBuildingsLastWave: 1,
        economyValue: 25,
        blockHp: 220
      })
    )
    expect(snapshot.lanePressure[2]).toEqual(
      expect.objectContaining({
        lane: 2,
        groundDps: buildingDefinitions.melee_turret.attackPower,
        flyingDps: 0
      })
    )
    expect(snapshot.lanePressure[4]?.pressureScore).toBeGreaterThanOrEqual(0)
    expect(snapshot.lanePressure[0]!.pressureScore).toBeGreaterThan(snapshot.lanePressure[2]!.pressureScore)
  })

  it('reports anti-air shortages when flying enemies end the run', () => {
    const engine = new GameEngine()
    const flyingZombie = createZombie({
      type: 'ash_wing',
      category: 'flying',
      flying: true,
      blockable: false,
      baseDamage: 10,
      buildingDamage: 0,
      x: lawn.houseLineX - 1
    })
    engine.state.baseHp = 1
    engine.state.zombies = [flyingZombie]

    engine.step(0.1)

    expect(engine.state.phase).toBe('lost')
    expect(engine.state.resultReason).toBe('对空不足')
  })
})

function createPlant(overrides: Partial<Plant> = {}): Plant {
  const row = overrides.row ?? 2
  const col = overrides.col ?? 3
  const center = cellCenter(row, col)

  return {
    id: 'plant-test',
    type: 'energy_core',
    components: ['energy_core'],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: 130,
    maxHp: 130,
    shootCooldown: 0,
    sunTimer: 0,
    ...overrides,
    attackDirection: overrides.attackDirection ?? 'up',
    upgraded: overrides.upgraded ?? false
  }
}

function createZombie(overrides: Partial<Zombie> = {}): Zombie {
  const row = overrides.row ?? 2
  const center = cellCenter(row, lawn.cols - 1)

  return {
    id: 'zombie-test',
    type: 'ember_grunt',
    category: 'normal',
    row,
    x: lawn.spawnX,
    y: center.y,
    hp: 84,
    maxHp: 84,
    speed: 0.75,
    buildingDamage: 12,
    baseDamage: 1,
    attackCooldown: 0,
    attackInterval: 1.2,
    blockable: true,
    flying: false,
    state: 'walking',
    ...overrides
  }
}

function clearCurrentWave(engine: GameEngine) {
  for (const group of engine.state.wave.groups) {
    group.spawned = group.count
    group.spawnTimer = Number.POSITIVE_INFINITY
  }
  engine.state.zombies = []
  engine.step(0.1)
}

function hydrateRecommendations(engine: GameEngine) {
  const snapshot = engine.state.lastBattleSnapshot

  expect(snapshot).toBeDefined()
  engine.dispatch({
    type: 'hydrateStrategyRecommendations',
    recommendations: recommendStrategyCards(snapshot!)
  })
}
