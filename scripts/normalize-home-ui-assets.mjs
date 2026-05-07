import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const assetDir = path.resolve('apps/web/public/assets/home-ui')
const passthroughFiles = new Set(['background-sky.png', 'hero-focus.png'])

const GRAY_TOLERANCE = 18
const BRIGHTNESS_FLOOR = 220
const COLOR_DISTANCE_LIMIT = 36

const files = (await fs.readdir(assetDir))
  .filter((file) => file.endsWith('.png'))
  .filter((file) => !passthroughFiles.has(file))

for (const file of files) {
  const absolutePath = path.join(assetDir, file)
  const input = sharp(absolutePath).ensureAlpha()
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true })
  const visited = new Uint8Array(info.width * info.height)
  const queue = []
  let head = 0

  const candidateColors = collectCandidateColors(data, info)

  for (let x = 0; x < info.width; x += 1) {
    maybeQueue(x, 0)
    maybeQueue(x, info.height - 1)
  }

  for (let y = 1; y < info.height - 1; y += 1) {
    maybeQueue(0, y)
    maybeQueue(info.width - 1, y)
  }

  while (head < queue.length) {
    const index = queue[head]
    head += 1

    const x = index % info.width
    const y = Math.floor(index / info.width)

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nextX = x + dx
      const nextY = y + dy

      if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) {
        continue
      }

      maybeQueue(nextX, nextY)
    }
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index] === 1) {
      data[index * info.channels + 3] = 0
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .trim()
    .png()
    .toFile(absolutePath)

  console.log(`normalized ${file}`)

  function maybeQueue(x, y) {
    const index = y * info.width + x

    if (visited[index] !== 0) {
      return
    }

    const color = readColor(data, info.channels, index)

    if (!isCheckerboardBackground(color, candidateColors)) {
      visited[index] = 2
      return
    }

    visited[index] = 1
    queue.push(index)
  }
}

function collectCandidateColors(data, info) {
  const candidates = []

  for (let x = 0; x < info.width; x += 1) {
    addCandidate(readColor(data, info.channels, x))
    addCandidate(readColor(data, info.channels, (info.height - 1) * info.width + x))
  }

  for (let y = 1; y < info.height - 1; y += 1) {
    addCandidate(readColor(data, info.channels, y * info.width))
    addCandidate(readColor(data, info.channels, y * info.width + info.width - 1))
  }

  return candidates

  function addCandidate(color) {
    const [r, g, b] = color
    const brightness = (r + g + b) / 3
    const spread = Math.max(r, g, b) - Math.min(r, g, b)

    if (brightness < BRIGHTNESS_FLOOR || spread > GRAY_TOLERANCE) {
      return
    }

    if (!candidates.some((candidate) => colorDistance(candidate, color) <= 8)) {
      candidates.push(color)
    }
  }
}

function readColor(data, channels, pixelIndex) {
  const offset = pixelIndex * channels
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]
}

function isCheckerboardBackground(color, candidateColors) {
  const [r, g, b, a] = color

  if (a === 0) {
    return true
  }

  const brightness = (r + g + b) / 3
  const spread = Math.max(r, g, b) - Math.min(r, g, b)

  if (brightness >= BRIGHTNESS_FLOOR && spread <= GRAY_TOLERANCE) {
    return true
  }

  return candidateColors.some((candidate) => colorDistance(candidate, color) <= COLOR_DISTANCE_LIMIT)
}

function colorDistance(left, right) {
  return Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2])
}
