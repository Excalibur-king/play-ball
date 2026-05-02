import Phaser from 'phaser'
import { assetManifest } from '../assets/assetManifest'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload')
  }

  preload() {
    for (const atlas of assetManifest.atlases) {
      this.load.atlas(atlas.key, atlas.textureUrl, atlas.atlasUrl)
    }

    // Load through the manifest only. Renderers should reference stable keys
    // like "plant-sunflower", never raw asset URLs.
    for (const asset of assetManifest.svg) {
      this.load.svg(asset.key, asset.url, {
        width: asset.width,
        height: asset.height
      })
    }
  }

  create() {
    this.registerAnimations()
    this.scene.start('battle')
  }

  private registerAnimations() {
    for (const animation of assetManifest.animations) {
      if (this.anims.exists(animation.key)) {
        continue
      }

      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNames(animation.atlas, {
          prefix: animation.prefix,
          start: 1,
          end: animation.frames,
          zeroPad: 4
        }),
        frameRate: animation.frameRate,
        repeat: animation.repeat
      })
    }
  }
}
