// Asset keys are the public contract used by Phaser renderers.
// Keep paths private to this manifest so artists can reorganize files without
// forcing gameplay/rendering code changes.
export const assetManifest = {
  atlases: [
    {
      key: 'plants-premium',
      textureUrl: '/assets/game/atlases/plants-premium.webp',
      atlasUrl: '/assets/game/atlases/plants-premium.json'
    },
    {
      key: 'zombies-premium',
      textureUrl: '/assets/game/atlases/zombies-premium.webp',
      atlasUrl: '/assets/game/atlases/zombies-premium.json'
    },
    {
      key: 'fx-premium',
      textureUrl: '/assets/game/atlases/fx-premium.webp',
      atlasUrl: '/assets/game/atlases/fx-premium.json'
    }
  ],
  animations: [
    {
      key: 'pea-shooter-idle',
      atlas: 'plants-premium',
      prefix: 'pea-shooter/idle/',
      frames: 8,
      frameRate: 8,
      repeat: -1
    },
    {
      key: 'pea-shooter-shoot',
      atlas: 'plants-premium',
      prefix: 'pea-shooter/shoot/',
      frames: 6,
      frameRate: 18,
      repeat: 0
    },
    {
      key: 'pea-shooter-hit',
      atlas: 'plants-premium',
      prefix: 'pea-shooter/hit/',
      frames: 4,
      frameRate: 14,
      repeat: 0
    },
    {
      key: 'shambler-walk',
      atlas: 'zombies-premium',
      prefix: 'shambler/walk/',
      frames: 10,
      frameRate: 9,
      repeat: -1
    },
    {
      key: 'shambler-bite',
      atlas: 'zombies-premium',
      prefix: 'shambler/bite/',
      frames: 6,
      frameRate: 12,
      repeat: -1
    },
    {
      key: 'shambler-hit',
      atlas: 'zombies-premium',
      prefix: 'shambler/hit/',
      frames: 4,
      frameRate: 14,
      repeat: 0
    },
    {
      key: 'shambler-die',
      atlas: 'zombies-premium',
      prefix: 'shambler/die/',
      frames: 8,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'conehead-walk',
      atlas: 'zombies-premium',
      prefix: 'conehead/walk/',
      frames: 10,
      frameRate: 9,
      repeat: -1
    },
    {
      key: 'conehead-bite',
      atlas: 'zombies-premium',
      prefix: 'conehead/bite/',
      frames: 6,
      frameRate: 12,
      repeat: -1
    },
    {
      key: 'conehead-hit',
      atlas: 'zombies-premium',
      prefix: 'conehead/hit/',
      frames: 4,
      frameRate: 14,
      repeat: 0
    },
    {
      key: 'conehead-die',
      atlas: 'zombies-premium',
      prefix: 'conehead/die/',
      frames: 8,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'pea-projectile-fly',
      atlas: 'fx-premium',
      prefix: 'pea-projectile/fly/',
      frames: 4,
      frameRate: 12,
      repeat: -1
    },
    {
      key: 'pea-hit-burst',
      atlas: 'fx-premium',
      prefix: 'pea-hit/burst/',
      frames: 6,
      frameRate: 18,
      repeat: 0
    }
  ],
  svg: [
    {
      key: 'plant-sunflower',
      url: '/assets/units/garden-sunflower.svg',
      width: 86,
      height: 86
    },
    {
      key: 'plant-wall-nut',
      url: '/assets/units/garden-wall-nut.svg',
      width: 82,
      height: 88
    }
  ]
} as const
