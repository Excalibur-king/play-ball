import { readdir, mkdir, copyFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

const sourceDir = resolve(
  process.env.CARD_ICON_SOURCE_DIR ??
    'C:/Users/Administrator/.cursor/projects/e-cursor-project-AI-code-202605052354/assets'
)
const targetDir = resolve(repoRoot, 'apps/web/public/assets/game/cards')
const targetEdge = Number(process.env.CARD_ICON_EDGE ?? 512)

async function main() {
  await mkdir(targetDir, { recursive: true })

  const files = (await readdir(sourceDir)).filter(
    (name) => name.startsWith('card_') && name.toLowerCase().endsWith('.png')
  )

  if (files.length === 0) {
    console.warn(`No card_*.png files found in ${sourceDir}`)
    return
  }

  let processed = 0

  for (const file of files) {
    const sourcePath = join(sourceDir, file)
    const finalName = file.replace(/^card_/, '')
    const targetPath = join(targetDir, finalName)

    const image = sharp(sourcePath)
    const metadata = await image.metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    if (!width || !height) {
      console.warn(`Skipped ${file}: unable to read dimensions`)
      continue
    }

    if (width === height && width === targetEdge) {
      await copyFile(sourcePath, targetPath)
      processed += 1
      console.log(`copied ${file} -> ${finalName} (already ${width}x${height})`)
      continue
    }

    const edge = Math.min(width, height)
    const left = Math.floor((width - edge) / 2)
    const top = Math.floor((height - edge) / 2)

    await image
      .extract({ left, top, width: edge, height: edge })
      .resize(targetEdge, targetEdge, { kernel: sharp.kernel.nearest })
      .png({ compressionLevel: 9 })
      .toFile(targetPath)

    processed += 1
    console.log(
      `cropped ${file} (${width}x${height}) -> ${finalName} (${targetEdge}x${targetEdge})`
    )
  }

  console.log(`\nDone. Processed ${processed} card icons -> ${targetDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
