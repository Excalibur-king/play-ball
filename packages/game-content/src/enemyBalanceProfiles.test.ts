import { describe, expect, it } from 'vitest'
import { enemyDefinitions, getEnemyDefinitionsForProfile } from './index'

describe('enemy balance profiles', () => {
  it('keeps the standard profile aligned with the base enemy table', () => {
    const standard = getEnemyDefinitionsForProfile('standard')

    expect(standard.ember_grunt).toEqual(enemyDefinitions.ember_grunt)
    expect(standard.basalt_smasher).toEqual(enemyDefinitions.basalt_smasher)
    expect(standard.volcano_core_beast).toEqual(enemyDefinitions.volcano_core_beast)
  })

  it('supports easier and harder variants without duplicating the enemy table', () => {
    const easy = getEnemyDefinitionsForProfile('easy')
    const hard = getEnemyDefinitionsForProfile('hard')

    expect(easy.ember_grunt.hp).toBeLessThan(enemyDefinitions.ember_grunt.hp)
    expect(easy.ember_grunt.buildingDamage).toBeLessThan(enemyDefinitions.ember_grunt.buildingDamage)
    expect(easy.basalt_smasher.firstWave).toBeGreaterThan(enemyDefinitions.basalt_smasher.firstWave)

    expect(hard.spark_runner.speed).toBeGreaterThan(enemyDefinitions.spark_runner.speed)
    expect(hard.basalt_smasher.buildingDamage).toBeGreaterThan(enemyDefinitions.basalt_smasher.buildingDamage)
    expect(hard.basalt_smasher.firstWave).toBeLessThan(enemyDefinitions.basalt_smasher.firstWave)
    expect(hard.volcano_core_beast.hp).toBeGreaterThan(enemyDefinitions.volcano_core_beast.hp)
  })
})
