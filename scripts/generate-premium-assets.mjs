import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const atlasDir = path.resolve('apps/web/public/assets/game/atlases')

const framePad = (index) => String(index + 1).padStart(4, '0')

function wrapSvg(width, height, body) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#25401b" flood-opacity="0.22"/>
    </filter>
    <filter id="warmShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#49311b" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="peaSkin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b9ed74"/>
      <stop offset="0.45" stop-color="#68bf49"/>
      <stop offset="1" stop-color="#347d35"/>
    </linearGradient>
    <linearGradient id="leafSkin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9adf57"/>
      <stop offset="1" stop-color="#2f8133"/>
    </linearGradient>
    <linearGradient id="zombieSkin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c9df8d"/>
      <stop offset="0.55" stop-color="#8fb16e"/>
      <stop offset="1" stop-color="#587b61"/>
    </linearGradient>
    <linearGradient id="jacket" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#748ba1"/>
      <stop offset="1" stop-color="#3f586d"/>
    </linearGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd46b"/>
      <stop offset="0.55" stop-color="#f08a28"/>
      <stop offset="1" stop-color="#b85524"/>
    </linearGradient>
    <radialGradient id="peaGlow" cx="42%" cy="32%" r="70%">
      <stop offset="0" stop-color="#f3ffd2"/>
      <stop offset="0.5" stop-color="#8ce65e"/>
      <stop offset="1" stop-color="#3f9a3f"/>
    </radialGradient>
  </defs>
  ${body}
</svg>`
}

function peaShooterSvg(action, frame, total) {
  const t = frame / total
  const wave = Math.sin(t * Math.PI * 2)
  const hitJolt = action === 'hit' ? [0, -6, 5, -2][frame] ?? 0 : 0
  const shootCurve = action === 'shoot' ? Math.sin((frame / Math.max(1, total - 1)) * Math.PI) : 0
  const bodyBob = action === 'hit' ? 0 : wave * 2.4
  const headDx = hitJolt + shootCurve * 5
  const headScaleX = action === 'shoot' ? 1 - shootCurve * 0.06 : 1
  const muzzleScaleX = action === 'shoot' ? 1 + shootCurve * 0.26 : 1
  const leafLift = action === 'shoot' ? shootCurve * 4 : wave * 1.8
  const flash = action === 'hit' && frame % 2 === 1 ? 0.55 : 0

  return wrapSvg(
    160,
    144,
    `
  <ellipse cx="80" cy="122" rx="44" ry="11" fill="#203817" opacity="0.20"/>
  <g filter="url(#softShadow)" transform="translate(${headDx.toFixed(2)} ${bodyBob.toFixed(2)})">
    <path d="M72 112 C67 95 68 82 76 66" fill="none" stroke="#3a8c38" stroke-width="9" stroke-linecap="round"/>
    <path d="M73 106 C48 92 38 98 28 119 C50 120 64 117 73 106Z" fill="url(#leafSkin)" stroke="#2b6c2f" stroke-width="4"/>
    <path d="M84 110 C112 99 122 105 132 124 C107 125 94 121 84 110Z" fill="url(#leafSkin)" stroke="#2b6c2f" stroke-width="4"/>
    <path d="M55 ${101 - leafLift} C39 ${88 - leafLift} 22 ${93 - leafLift} 17 ${109 - leafLift} C35 ${112 - leafLift} 48 ${111 - leafLift} 55 ${101 - leafLift}Z" fill="#7fc64e" opacity="0.88"/>
    <g transform="translate(74 58) scale(${headScaleX.toFixed(3)} 1)">
      <circle cx="0" cy="0" r="31" fill="url(#peaSkin)" stroke="#276a33" stroke-width="5"/>
      <ellipse cx="-10" cy="-12" rx="10" ry="6" fill="#dff7a1" opacity="0.74"/>
      <circle cx="-13" cy="-2" r="4" fill="#16391f"/>
      <circle cx="-15" cy="-4" r="1.3" fill="#fffbd3"/>
      <g transform="translate(23 -3) scale(${muzzleScaleX.toFixed(3)} 1)">
        <ellipse cx="19" cy="0" rx="26" ry="18" fill="url(#peaSkin)" stroke="#276a33" stroke-width="5"/>
        <ellipse cx="31" cy="0" rx="11" ry="10" fill="#9fe76a" stroke="#276a33" stroke-width="4"/>
        <ellipse cx="34" cy="-3" rx="4" ry="2.3" fill="#e5ffc0" opacity="0.65"/>
      </g>
    </g>
  </g>
  <ellipse cx="${82 + headDx}" cy="${58 + bodyBob}" rx="48" ry="38" fill="#fff8bb" opacity="${flash}"/>
`
  )
}

function zombieSvg(kind, action, frame, total) {
  const t = frame / total
  const cycle = Math.sin(t * Math.PI * 2)
  const opposite = Math.sin(t * Math.PI * 2 + Math.PI)
  const bite = action === 'bite' ? Math.sin((frame / Math.max(1, total - 1)) * Math.PI) : 0
  const hit = action === 'hit' ? [0, -8, 5, -2][frame] ?? 0 : 0
  const dieProgress = action === 'die' ? frame / Math.max(1, total - 1) : 0
  const bodyLean = action === 'walk' ? cycle * 2 : action === 'bite' ? -12 * bite : action === 'die' ? -78 * dieProgress : hit * 0.7
  const bob = action === 'walk' ? Math.abs(cycle) * 3 : bite * 2
  const armReach = action === 'bite' ? 15 * bite : 0
  const alpha = action === 'die' ? Math.max(0.15, 1 - dieProgress * 0.5) : 1
  const bodyY = action === 'die' ? 18 * dieProgress : bob
  const bodyX = hit
  const leftLeg = action === 'walk' ? cycle * 13 : action === 'die' ? -30 * dieProgress : 0
  const rightLeg = action === 'walk' ? opposite * 13 : action === 'die' ? 35 * dieProgress : 0
  const leftArm = action === 'walk' ? opposite * 10 - armReach : -18 - armReach
  const rightArm = action === 'walk' ? cycle * 10 - armReach : -26 - armReach
  const mouthOpen = action === 'bite' ? 5 + bite * 8 : 4
  const flash = action === 'hit' && frame % 2 === 1 ? 0.45 : 0
  const cone = kind === 'conehead'
  const frameOpacity = alpha.toFixed(2)

  return wrapSvg(
    160,
    176,
    `
  <ellipse cx="82" cy="157" rx="39" ry="10" fill="#1d2a21" opacity="0.18"/>
  <g opacity="${frameOpacity}" transform="translate(${bodyX.toFixed(2)} ${bodyY.toFixed(2)}) rotate(${bodyLean.toFixed(2)} 78 126)" filter="url(#warmShadow)">
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="67" y1="118" x2="${58 + leftLeg}" y2="151" stroke="#3b4853" stroke-width="13"/>
      <line x1="92" y1="118" x2="${102 + rightLeg}" y2="151" stroke="#3b4853" stroke-width="13"/>
      <path d="M${48 + leftLeg} 155 L${68 + leftLeg} 155" stroke="#27333f" stroke-width="8"/>
      <path d="M${92 + rightLeg} 155 L${115 + rightLeg} 155" stroke="#27333f" stroke-width="8"/>
    </g>
    <path d="M55 73 C61 58 98 58 107 74 L105 122 C95 133 63 132 53 121Z" fill="url(#jacket)" stroke="#2d3d4a" stroke-width="5"/>
    <path d="M73 74 L67 123" stroke="#263847" stroke-width="3" opacity="0.75"/>
    <path d="M89 73 L95 123" stroke="#263847" stroke-width="3" opacity="0.75"/>
    <path d="M57 83 C40 87 34 99 ${29 - armReach} 111" fill="none" stroke="#7e9f70" stroke-width="12" stroke-linecap="round"/>
    <path d="M104 84 C119 89 125 101 ${129 - armReach} 114" fill="none" stroke="#7e9f70" stroke-width="12" stroke-linecap="round"/>
    <path d="M${28 - armReach} 112 L${22 - armReach} 118" stroke="#4e6d58" stroke-width="5" stroke-linecap="round"/>
    <path d="M${130 - armReach} 114 L${136 - armReach} 121" stroke="#4e6d58" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(0 ${action === 'bite' ? -bite * 3 : 0})">
      <path d="M50 43 C50 21 71 12 91 19 C112 27 121 51 110 68 C98 88 65 87 54 70 C50 64 49 55 50 43Z" fill="url(#zombieSkin)" stroke="#455d47" stroke-width="5"/>
      <path d="M56 27 C64 13 83 12 96 19 C83 20 70 24 56 37Z" fill="#dce6a4" opacity="0.65"/>
      <circle cx="70" cy="47" r="6" fill="#f5f0c6" stroke="#405844" stroke-width="3"/>
      <circle cx="94" cy="50" r="6" fill="#f5f0c6" stroke="#405844" stroke-width="3"/>
      <circle cx="72" cy="48" r="2.5" fill="#253225"/>
      <circle cx="92" cy="51" r="2.5" fill="#253225"/>
      <path d="M74 ${66 - mouthOpen * 0.2} C84 ${70 + mouthOpen} 94 ${70 + mouthOpen} 103 ${64}" fill="none" stroke="#334135" stroke-width="4" stroke-linecap="round"/>
      <path d="M54 34 C44 32 43 22 50 18" fill="none" stroke="#29352a" stroke-width="4" stroke-linecap="round"/>
      <path d="M72 20 C68 10 75 6 82 14" fill="none" stroke="#29352a" stroke-width="4" stroke-linecap="round"/>
      ${
        cone
          ? `<path d="M70 21 L86 -17 L106 30Z" fill="url(#cone)" stroke="#8f4a1e" stroke-width="5"/>
             <path d="M75 17 L101 25" stroke="#ffe58c" stroke-width="5" opacity="0.75"/>
             <path d="M80 4 L96 10" stroke="#ffe58c" stroke-width="4" opacity="0.75"/>`
          : ''
      }
    </g>
  </g>
  <ellipse cx="${82 + bodyX}" cy="${76 + bodyY}" rx="52" ry="60" fill="#fff1a6" opacity="${flash}"/>
`
  )
}

function peaProjectileSvg(frame, total) {
  const pulse = Math.sin((frame / total) * Math.PI * 2)
  const glow = 0.22 + Math.abs(pulse) * 0.12

  return wrapSvg(
    96,
    64,
    `
  <ellipse cx="46" cy="32" rx="35" ry="13" fill="#9cf266" opacity="${glow}"/>
  <path d="M10 32 C23 22 37 22 54 28 C43 32 29 38 10 32Z" fill="#d9ff96" opacity="0.45"/>
  <ellipse cx="54" cy="32" rx="${18 + pulse * 1.5}" ry="${15 - pulse}" fill="url(#peaGlow)" stroke="#2f8837" stroke-width="4"/>
  <ellipse cx="47" cy="26" rx="6" ry="3" fill="#f4ffd0" opacity="0.78"/>
`
  )
}

function peaHitSvg(frame, total) {
  const p = frame / Math.max(1, total - 1)
  const radius = 10 + p * 22
  const alpha = 1 - p * 0.9
  const spokes = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8
    const x1 = 48 + Math.cos(angle) * (radius * 0.35)
    const y1 = 32 + Math.sin(angle) * (radius * 0.35)
    const x2 = 48 + Math.cos(angle) * radius
    const y2 = 32 + Math.sin(angle) * radius
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ecffd0" stroke-width="${Math.max(2, 7 - p * 5).toFixed(1)}" stroke-linecap="round" opacity="${alpha.toFixed(2)}"/>`
  }).join('')

  return wrapSvg(
    96,
    64,
    `
  <circle cx="48" cy="32" r="${radius.toFixed(1)}" fill="#8bed52" opacity="${(alpha * 0.45).toFixed(2)}"/>
  <circle cx="48" cy="32" r="${(8 + p * 9).toFixed(1)}" fill="#fff6a6" opacity="${alpha.toFixed(2)}"/>
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
      app: 'Garden Defense local asset generator',
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

  const plantFrames = []
  addSequence(plantFrames, 'pea-shooter/idle', 8, (frame, total) => peaShooterSvg('idle', frame, total))
  addSequence(plantFrames, 'pea-shooter/shoot', 6, (frame, total) => peaShooterSvg('shoot', frame, total))
  addSequence(plantFrames, 'pea-shooter/hit', 4, (frame, total) => peaShooterSvg('hit', frame, total))

  const zombieFrames = []
  for (const kind of ['shambler', 'conehead']) {
    addSequence(zombieFrames, `${kind}/walk`, 10, (frame, total) => zombieSvg(kind, 'walk', frame, total))
    addSequence(zombieFrames, `${kind}/bite`, 6, (frame, total) => zombieSvg(kind, 'bite', frame, total))
    addSequence(zombieFrames, `${kind}/hit`, 4, (frame, total) => zombieSvg(kind, 'hit', frame, total))
    addSequence(zombieFrames, `${kind}/die`, 8, (frame, total) => zombieSvg(kind, 'die', frame, total))
  }

  const fxFrames = []
  addSequence(fxFrames, 'pea-projectile/fly', 4, (frame, total) => peaProjectileSvg(frame, total))
  addSequence(fxFrames, 'pea-hit/burst', 6, (frame, total) => peaHitSvg(frame, total))

  const results = await Promise.all([
    writeAtlas({ name: 'plants-premium', slotWidth: 160, slotHeight: 144, columns: 8, frames: plantFrames }),
    writeAtlas({ name: 'zombies-premium', slotWidth: 160, slotHeight: 176, columns: 8, frames: zombieFrames }),
    writeAtlas({ name: 'fx-premium', slotWidth: 96, slotHeight: 64, columns: 8, frames: fxFrames })
  ])

  for (const result of results) {
    console.log(`${path.basename(result.texturePath)} ${result.size}, ${result.frames} frames`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
