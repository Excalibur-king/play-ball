import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const atlasDir = path.resolve('apps/web/public/assets/game/atlases')

const framePad = (index) => String(index + 1).padStart(4, '0')

function wrapSvg(width, height, body) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="emberGlow" cx="42%" cy="32%" r="70%">
      <stop offset="0" stop-color="#fff7d5"/>
      <stop offset="0.45" stop-color="#ffc55d"/>
      <stop offset="1" stop-color="#ff6a1f"/>
    </radialGradient>
  </defs>
  ${body}
</svg>`
}

function basicBoltSvg(frame, total) {
  const pulse = Math.sin((frame / total) * Math.PI * 2)
  const glow = 0.22 + Math.abs(pulse) * 0.12

  return wrapSvg(
    96,
    64,
    `
  <ellipse cx="46" cy="32" rx="35" ry="13" fill="#ff9a41" opacity="${glow}"/>
  <path d="M10 32 C23 22 37 22 54 28 C43 32 29 38 10 32Z" fill="#ffd790" opacity="0.45"/>
  <ellipse cx="54" cy="32" rx="${18 + pulse * 1.5}" ry="${15 - pulse}" fill="url(#emberGlow)" stroke="#8f2f16" stroke-width="4"/>
  <ellipse cx="47" cy="26" rx="6" ry="3" fill="#fff4d5" opacity="0.78"/>
`
  )
}

function projectileImpactSvg(frame, total) {
  const p = frame / Math.max(1, total - 1)
  const radius = 10 + p * 22
  const alpha = 1 - p * 0.9
  const spokes = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8
    const x1 = 48 + Math.cos(angle) * (radius * 0.35)
    const y1 = 32 + Math.sin(angle) * (radius * 0.35)
    const x2 = 48 + Math.cos(angle) * radius
    const y2 = 32 + Math.sin(angle) * radius
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff0c4" stroke-width="${Math.max(2, 7 - p * 5).toFixed(1)}" stroke-linecap="round" opacity="${alpha.toFixed(2)}"/>`
  }).join('')

  return wrapSvg(
    96,
    64,
    `
  <circle cx="48" cy="32" r="${radius.toFixed(1)}" fill="#ff8b39" opacity="${(alpha * 0.45).toFixed(2)}"/>
  <circle cx="48" cy="32" r="${(8 + p * 9).toFixed(1)}" fill="#fff6be" opacity="${alpha.toFixed(2)}"/>
  ${spokes}
`
  )
}

function addSequence(frames, prefix, count, factory) {
  for (let index = 0; index < count; index += 1) {
    frames.push({
      name: `${prefix}/${framePad(index)}`,
      svg: factory(index, count)
    })
  }
}

async function renderFrame(frame, width, height) {
  return sharp(Buffer.from(frame.svg)).resize(width, height, { fit: 'contain' }).png().toBuffer()
}

async function writeAtlas({ name, slotWidth, slotHeight, columns, frames }) {
  const rows = Math.ceil(frames.length / columns)
  const width = columns * slotWidth
  const height = rows * slotHeight
  const rendered = await Promise.all(frames.map((frame) => renderFrame(frame, slotWidth, slotHeight)))
  const composites = rendered.map((input, index) => ({
    input,
    left: (index % columns) * slotWidth,
    top: Math.floor(index / columns) * slotHeight
  }))
  const textureFile = `${name}.webp`
  const texturePath = path.join(atlasDir, textureFile)
  const jsonPath = path.join(atlasDir, `${name}.json`)

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .webp({ quality: 96, lossless: true, effort: 6 })
    .toFile(texturePath)

  const atlas = {
    frames: Object.fromEntries(
      frames.map((frame, index) => [
        frame.name,
        {
          frame: {
            x: (index % columns) * slotWidth,
            y: Math.floor(index / columns) * slotHeight,
            w: slotWidth,
            h: slotHeight
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: slotWidth, h: slotHeight },
          sourceSize: { w: slotWidth, h: slotHeight }
        }
      ])
    ),
    meta: {
      app: 'Garden Defense FX atlas generator',
      image: textureFile,
      format: 'RGBA8888',
      size: { w: width, h: height },
      scale: '1'
    }
  }

  await writeFile(jsonPath, `${JSON.stringify(atlas, null, 2)}\n`)
  return { texturePath, jsonPath, frames: frames.length, size: `${width}x${height}` }
}

async function main() {
  await mkdir(atlasDir, { recursive: true })

  const fxFrames = []
  addSequence(fxFrames, 'projectile/basic_bolt/fly', 4, (frame, total) => basicBoltSvg(frame, total))
  addSequence(fxFrames, 'fx/projectile_impact/burst', 6, (frame, total) => projectileImpactSvg(frame, total))

  const result = await writeAtlas({ name: 'fx-premium', slotWidth: 96, slotHeight: 64, columns: 8, frames: fxFrames })
  console.log(`${path.basename(result.texturePath)} ${result.size}, ${result.frames} frames`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
