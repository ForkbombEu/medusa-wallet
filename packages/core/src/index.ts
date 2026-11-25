/**
 * Public API of the medusa headless wallet.
 *
 * Everything exported here is the contract with frontends (the CLI, tests,
 * other tools). Credo types stay internal: map them to medusa domain types.
 */
import { createRequire } from 'node:module'

const pkg = createRequire(import.meta.url)('../package.json') as { version: string }

export const coreVersion: string = pkg.version
