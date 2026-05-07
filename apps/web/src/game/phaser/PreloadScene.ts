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

    for (const image of assetManifest.images) {
      this.load.image(image.key, image.url)
    }

    // Load through the manifest only. Renderers should reference stable keys
    // like "building:energy_core:base", never raw asset URLs.
    for (const asset of assetManifest.textures) {
      this.load.svg(asset.key, asset.url, {
        width: asset.width,
        height: asset.height
      })
    }

    for (const sheet of assetManifest.spritesheets) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight
      })
    }
  }

  create() {
    this.registerAnimations()
    this.registerSpritesheetAnimations()
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

  private registerSpritesheetAnimations() {
    for (const animation of assetManifest.spritesheetAnimations) {
      if (this.anims.exists(animation.key)) {
        continue
      }

      const sheet = assetManifest.spritesheets.find((s) => s.key === animation.spritesheet)
      if (!sheet) {
        continue
      }

      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(animation.spritesheet, {
          start: animation.startFrame ?? 0,
          end: animation.endFrame ?? sheet.frameCount - 1
        }),
        frameRate: animation.frameRate,
        repeat: animation.repeat
      })
    }
  }
}
