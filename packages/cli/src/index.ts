import { createRequire } from 'node:module'
import { coreVersion } from '@medusa-wallet/core'
import { Command } from 'commander'
import { banner } from './banner.js'

const pkg = createRequire(import.meta.url)('../package.json') as { version: string }

export function createProgram(): Command {
  return new Command()
    .name('medusa-wallet')
    .description('Headless EUDI-ARF holder wallet for testing issuers and verifiers')
    .version(`${pkg.version} (core ${coreVersion})`)
    .addHelpText('beforeAll', banner)
}
