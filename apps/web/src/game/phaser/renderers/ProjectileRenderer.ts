import type { Projectile } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { assetManifest } from '../../assets/assetManifest'
import { gardenPalette } from '../theme'

type ProjectileView = {
  aura: Phaser.GameObjects.Arc
  body: Phaser.GameObjects.Sprite
}

// Renders active projectiles. Projectiles are cheap and fully disposable.
export class ProjectileRenderer {
  private readonly views = new Map<string, ProjectileView>()

  constructor(private readonly scene: Phaser.Scene) {}

  sync(projectiles: Projectile[]) {
    const currentIds = new Set(projectiles.map((projectile) => projectile.id))

    for (const [id, view] of this.views) {
      if (!currentIds.has(id)) {
        destroyProjectileView(view)
        this.views.delete(id)
      }
    }

    for (const projectile of projectiles) {
      this.syncProjectile(projectile)
    }
  }

  clear() {
    for (const view of this.views.values()) {
      destroyProjectileView(view)
    }
    this.views.clear()
  }

  private syncProjectile(projectile: Projectile) {
    let view = this.views.get(projectile.id)
    const visual = getProjectileVisual(projectile.visualKey)

    if (!view) {
      const body = this.scene.add
        .sprite(projectile.x, projectile.y, visual.body.textureKey, visual.body.frame)
        .setDisplaySize(visual.displayWidth, visual.displayHeight)

      if (visual.body.animationKey) {
        body.play(visual.body.animationKey)
      }

      view = {
        aura: this.scene.add.circle(projectile.x, projectile.y, visual.auraRadius, visual.auraColor ?? gardenPalette.peaSpark, visual.auraAlpha),
        body
      }
      this.views.set(projectile.id, view)
    }

    view.aura.setPosition(projectile.x, projectile.y)
    view.body.setPosition(projectile.x, projectile.y)
    if (projectile.visualKey === 'laserBeam') {
      view.body.setTint(0xb7fbff)
      view.body.setScale(1.35, 0.8)
      view.aura.setScale(1.45, 0.72)
    }
    view.aura.setDepth(31 + projectile.row)
    view.body.setDepth(32 + projectile.row)
  }
}

function getProjectileVisual(visualKey: string | undefined) {
  if (visualKey === 'laserBeam') {
    return assetManifest.projectiles.laserBeam
  }

  return assetManifest.projectiles.basicBolt
}

function destroyProjectileView(view: ProjectileView) {
  view.aura.destroy()
  view.body.destroy()
}
