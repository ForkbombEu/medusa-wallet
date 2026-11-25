import { createRequire } from 'node:module'
import { coreVersion, IssuanceError, MedusaError } from '@medusa-wallet/core'
import { Command, CommanderError } from 'commander'
import { banner } from './banner.js'
import { registerCredentials } from './commands/credentials.js'
import { registerOffer } from './commands/offer.js'
import { type Io, processIo } from './io.js'
import { toJson } from './output.js'
import { UsageError } from './wallet.js'

const pkg = createRequire(import.meta.url)('../package.json') as { version: string }

export function createProgram(io: Io = processIo): Command {
  const program = new Command()
    .name('medusa-wallet')
    .description('Headless EUDI-ARF holder wallet for testing issuers and verifiers')
    .version(`${pkg.version} (core ${coreVersion})`)
    .addHelpText('beforeAll', banner)
    .option('--wallet-dir <dir>', 'wallet storage directory (env MEDUSA_WALLET_DIR, default ~/.medusa-wallet)')
    .option('--insecure-http', 'allow plain-http issuer URLs, e.g. a local capture-wallet')
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr })
    .exitOverride()
  registerOffer(program, io)
  registerCredentials(program, io)
  return program
}

/** Runs the CLI and returns the process exit code: 0 ok, 1 operation failed, 2 usage error. */
export async function run(argv: string[], io: Io = processIo): Promise<number> {
  try {
    await createProgram(io).parseAsync(argv, { from: 'user' })
    return 0
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2
    if (error instanceof UsageError) {
      io.stderr(`error: ${error.message}\n`)
      return 2
    }
    if (error instanceof MedusaError) {
      io.stderr(`error: ${error.name}: ${error.message}\n`)
      if (error instanceof IssuanceError && error.response !== undefined)
        io.stderr(toJson({ response: error.response }))
      return 1
    }
    throw error
  }
}
