import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'

const currentDir = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(currentDir, '..')

const envFilesInPriorityOrder = ['.env.local', '.env', '.env.example']

for (const envFile of envFilesInPriorityOrder) {
  const fullPath = resolve(apiRoot, envFile)

  if (!existsSync(fullPath)) {
    continue
  }

  // Do not override values already provided by the shell or a higher-priority file.
  loadDotenv({
    path: fullPath,
    override: false,
    quiet: true
  })
}
