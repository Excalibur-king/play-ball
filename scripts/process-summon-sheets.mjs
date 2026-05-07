import { readdir, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

const sourceDir = resolve(
  process.env.SUMMON_SHEET_SOURCE_DIR ??
    'C:/Users/Administrator/.cursor/projects/e-cursor-project-AI-code-202605052354/assets'
)
const targetDir = resolve(repoRoot, 'apps/web/public/assets/game/summons/sheets')

// chroma-key magenta background (#FF00FF) used in the generated sheets so the
// user can later key it out or crop it. We keep the SAME color when padding
// the sheet to 1:1, so the bars blend with the existing background instead of
// adding a visible seam.
const CHROMA = { r: 255, g: 0, b: 255, alpha: 1 }

async function main() {
  await mkdir(targetDir, { recursive: true })

  const files = (await readdir(sourceDir)).filter(
    (name) => name.startsWith('summon_sheet_') && name.toLowerCase().endsWith('.png')
  )

  if (files.length === 0) {
    console.warn(`No summon_sheet_*.png files found in ${sourceDir}`)
    return
  }

  let processed = 0

  for (const file of files) {
    const sourcePath = join(sourceDir, file)
    const finalName = file.replace(/^summon_sheet_/, '')
    const targetPath = join(targetDir, finalName)

    const image = sharp(sourcePath)
    const metadata = await image.metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    if (!width || !height) {
      console.warn(`Skipped ${file}: unable to read dimensions`)
      continue
    }

    if (width === height) {
      await image.png({ compressionLevel: 9 }).toFile(targetPath)
      processed += 1
      console.log(`copied ${file} -> ${finalName} (already ${width}x${height})`)
      continue
    }

    const edge = Math.max(width, height)
    const padX = Math.floor((edge - width) / 2)
    const padY = Math.floor((edge - height) / 2)

    await image
      .extend({
        top: padY,
        bottom: edge - height - padY,
        left: padX,
        right: edge - width - padX,
        background: CHROMA
      })
      .png({ compressionLevel: 9 })
      .toFile(targetPath)

    processed += 1
    console.log(
      `padded ${file} (${width}x${height}) -> ${finalName} (${edge}x${edge}, magenta bars top/bottom: ${padY}px, sides: ${padX}px)`
    )
  }

  console.log(`\nDone. Processed ${processed} summon sheets -> ${targetDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
