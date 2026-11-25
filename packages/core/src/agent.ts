import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  ConsoleLogger,
  type GetTrustedIssuersForVerification,
  LogLevel,
  type VerificationSigner,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { OpenId4VcModule } from '@credo-ts/openid4vc'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'

/**
 * How issuer X.509 certificate chains are trusted when a credential is verified.
 * - `presented-chain`: trust the root of whatever chain the credential carries. Signatures and
 *   chain consistency are still checked; only the trust anchor is taken from the credential itself.
 *   This lets a test wallet receive from any issuer.
 * - `{ certificates }`: trust only these base64 DER or PEM certificates.
 */
export type TrustPolicy = 'presented-chain' | { certificates: string[] }

export interface AgentOptions {
  /** SQLite file holding the encrypted Askar store. */
  path: string
  key: string
  /** Defaults to `presented-chain`. */
  trust?: TrustPolicy
  /** Allow plain-http issuer and verifier URLs, e.g. a local capture-wallet. Defaults to false. */
  allowInsecureHttp?: boolean
}

// `{ type: string }` admits the verification types other modules (openid4vc) add to the context.
function trustedIssuers(trust: TrustPolicy): GetTrustedIssuersForVerification<VerificationSigner, { type: string }> {
  return async (_agentContext, { signer }) => {
    // DID-signed credentials fall through to Credo's DID resolution.
    if (signer.method !== 'x509') return undefined
    const issuance =
      trust === 'presented-chain'
        ? signer.certificateChain.slice(-1).map((certificate) => certificate.toString('base64'))
        : trust.certificates
    return { trustedIssuers: [{ method: 'x509', issuance }] }
  }
}

export function createAgent({ path, key, trust = 'presented-chain', allowInsecureHttp = false }: AgentOptions) {
  return new Agent({
    config: {
      logger: new ConsoleLogger(LogLevel.Off),
      allowInsecureHttpUrls: allowInsecureHttp,
      getTrustedIssuersForVerification: trustedIssuers(trust),
    },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        askar: askarNodeJS,
        store: { id: 'medusa', key, database: { type: 'sqlite', config: { path } } },
      }),
      openid4vc: new OpenId4VcModule(),
    },
  })
}

export type MedusaAgent = ReturnType<typeof createAgent>
