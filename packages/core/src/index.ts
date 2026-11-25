/**
 * Public API of the medusa headless wallet.
 *
 * Everything exported here is the contract with frontends (the CLI, tests,
 * other tools). Credo types stay internal: map them to medusa domain types.
 */
import { createRequire } from 'node:module'

const pkg = createRequire(import.meta.url)('../package.json') as { version: string }

export const coreVersion: string = pkg.version

export type { TrustPolicy } from './agent.js'
export type { CredentialRepository } from './credentials/repository.js'
export type { Credential, CredentialFormat } from './credentials/types.js'
export {
  CredentialNotFoundError,
  IssuanceError,
  MedusaError,
  OfferResolutionError,
  TxCodeRequiredError,
  type TxCodeSpec,
  UnsupportedCredentialError,
  WalletOpenError,
} from './errors.js'
export type { Issuance, ReceivePreAuthorizedOptions } from './issuance/issuance.js'
export type { OfferedCredentialConfiguration, ResolvedOffer } from './issuance/offer.js'
export { openWallet, type Wallet, type WalletOptions } from './wallet.js'
