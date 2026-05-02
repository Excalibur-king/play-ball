export type Point = {
  x: number
  y: number
}

export type PlantType = 'pea-shooter' | 'sunflower' | 'wall-nut'
export type ZombieType = 'shambler' | 'conehead'
export type ZombieCategory = 'normal' | 'dangerous'
export type PlantFusionKey = 'pea-shooter+sunflower' | 'pea-shooter+wall-nut' | 'sunflower+wall-nut'

export type PlantDefinition = {
  type: PlantType
  name: string
  cost: number
  cooldown: number
  hp: number
  damage?: number
  fireInterval?: number
  projectileSpeed?: number
  sunInterval?: number
  sunAmount?: number
  role: 'damage' | 'economy' | 'blocker'
}

export type ZombieDefinition = {
  type: ZombieType
  name: string
  category: ZombieCategory
  hp: number
  speed: number
  damage: number
  attackInterval: number
}

export type PlantFusionDefinition = {
  key: PlantFusionKey
  name: string
  components: [PlantType, PlantType]
  artDirection: string
}

export type WaveDefinition = {
  totalZombies: number
  spawnInterval: number
  zombieHpMultiplier: number
  mix: Array<{
    type: ZombieType
    weight: number
  }>
}

export const lawn = {
  rows: 5,
  cols: 9,
  originX: 176,
  originY: 132,
  cellWidth: 104,
  cellHeight: 96,
  houseLineX: 104,
  spawnX: 1188
}

export const plantTypes: PlantType[] = ['pea-shooter', 'sunflower', 'wall-nut']

export const plantDefinitions: Record<PlantType, PlantDefinition> = {
  'pea-shooter': {
    type: 'pea-shooter',
    name: 'Pea Shooter',
    cost: 100,
    cooldown: 5.5,
    hp: 130,
    damage: 24,
    fireInterval: 1.25,
    projectileSpeed: 360,
    role: 'damage'
  },
  sunflower: {
    type: 'sunflower',
    name: 'Sunflower',
    cost: 50,
    cooldown: 6,
    hp: 110,
    sunInterval: 7,
    sunAmount: 25,
    role: 'economy'
  },
  'wall-nut': {
    type: 'wall-nut',
    name: 'Wall-nut',
    cost: 50,
    cooldown: 9,
    hp: 420,
    role: 'blocker'
  }
}

export const plantFusionDefinitions: Record<PlantFusionKey, PlantFusionDefinition> = {
  'pea-shooter+sunflower': {
    key: 'pea-shooter+sunflower',
    name: 'Solar Pea',
    components: ['pea-shooter', 'sunflower'],
    artDirection: 'green shooter body with a warm sunflower halo and small golden motes'
  },
  'pea-shooter+wall-nut': {
    key: 'pea-shooter+wall-nut',
    name: 'Bulwark Pea',
    components: ['pea-shooter', 'wall-nut'],
    artDirection: 'pea shooter silhouette wrapped with nut-shell armor and a sturdy shield rim'
  },
  'sunflower+wall-nut': {
    key: 'sunflower+wall-nut',
    name: 'Solar Nut',
    components: ['sunflower', 'wall-nut'],
    artDirection: 'sunflower center set into a round nut shell with amber defensive glow'
  }
}

const plantFusionKeys: Record<string, PlantFusionKey> = {
  'pea-shooter|sunflower': 'pea-shooter+sunflower',
  'sunflower|pea-shooter': 'pea-shooter+sunflower',
  'pea-shooter|wall-nut': 'pea-shooter+wall-nut',
  'wall-nut|pea-shooter': 'pea-shooter+wall-nut',
  'sunflower|wall-nut': 'sunflower+wall-nut',
  'wall-nut|sunflower': 'sunflower+wall-nut'
}

export const zombieDefinitions: Record<ZombieType, ZombieDefinition> = {
  shambler: {
    type: 'shambler',
    name: 'Shambler',
    category: 'normal',
    hp: 84,
    speed: 19,
    damage: 18,
    attackInterval: 1.05
  },
  conehead: {
    type: 'conehead',
    name: 'Conehead',
    category: 'dangerous',
    hp: 165,
    speed: 16,
    damage: 22,
    attackInterval: 1.1
  }
}

export const waves: WaveDefinition[] = [
  {
    totalZombies: 6,
    spawnInterval: 4.2,
    zombieHpMultiplier: 1,
    mix: [{ type: 'shambler', weight: 1 }]
  },
  {
    totalZombies: 9,
    spawnInterval: 3.4,
    zombieHpMultiplier: 1.08,
    mix: [
      { type: 'shambler', weight: 4 },
      { type: 'conehead', weight: 1 }
    ]
  },
  {
    totalZombies: 13,
    spawnInterval: 2.75,
    zombieHpMultiplier: 1.18,
    mix: [
      { type: 'shambler', weight: 3 },
      { type: 'conehead', weight: 2 }
    ]
  },
  {
    totalZombies: 18,
    spawnInterval: 2.25,
    zombieHpMultiplier: 1.32,
    mix: [
      { type: 'shambler', weight: 2 },
      { type: 'conehead', weight: 2 }
    ]
  }
]

export function cellCenter(row: number, col: number): Point {
  return {
    x: lawn.originX + col * lawn.cellWidth + lawn.cellWidth / 2,
    y: lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
  }
}

export function getPlantFusionKey(first: PlantType, second: PlantType): PlantFusionKey | undefined {
  return plantFusionKeys[`${first}|${second}`]
}
