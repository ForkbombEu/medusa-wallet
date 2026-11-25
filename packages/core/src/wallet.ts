import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { type AgentOptions, createAgent } from './agent.js'
import { type CredentialRepository, createCredentialRepository } from './credentials/repository.js'
import { WalletOpenError } from './errors.js'
import { createIssuance, type Issuance } from './issuance/issuance.js'

export type WalletOptions = AgentOptions

export interface Wallet {
  readonly credentials: CredentialRepository
  readonly issuance: Issuance
  close(): Promise<void>
}

/** Opens the persistent SQLite wallet store, creating it on first use. Call `close()` when done. */
export async function openWallet(options: WalletOptions): Promise<Wallet> {
  await mkdir(dirname(options.path), { recursive: true, mode: 0o700 })
  const agent = createAgent(options)
  try {
    await agent.initialize()
  } catch (cause) {
    throw new WalletOpenError('Could not open the wallet store: is the key correct?', { cause })
  }
  return {
    credentials: createCredentialRepository(agent),
    issuance: createIssuance(agent),
    close: () => agent.shutdown(),
  }
}
