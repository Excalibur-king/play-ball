import type { Projectile } from '@tower-rogue/game-core'
import Phaser from 'phaser'
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

    if (!view) {
      view = {
        aura: this.scene.add.circle(projectile.x, projectile.y, 14, gardenPalette.peaSpark, 0.18),
        body: this.scene.add
          .sprite(projectile.x, projectile.y, 'fx-premium', 'pea-projectile/fly/0001')
          .setDisplaySize(46, 30)
          .play('pea-projectile-fly')
      }
      this.views.set(projectile.id, view)
    }

    view.aura.setPosition(projectile.x, projectile.y)
    view.body.setPosition(projectile.x, projectile.y)
    view.aura.setDepth(31 + projectile.row)
    view.body.setDepth(32 + projectile.row)
  }
}

function destroyProjectileView(view: ProjectileView) {
  view.aura.destroy()
  view.body.destroy()
}
