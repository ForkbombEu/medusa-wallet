import { Kms } from '@credo-ts/core'
import type { OpenId4VciCredentialBindingResolver } from '@credo-ts/openid4vc'

/**
 * Binds each credential to a fresh P-256 key in the wallet KMS, sent as a `jwk`
 * (HAIP mandates ES256). Credo turns it into a COSE key for mdoc.
 */
export const p256JwkBinding: OpenId4VciCredentialBindingResolver = async ({ agentContext }) => {
  const kms = agentContext.resolve(Kms.KeyManagementApi)
  const { publicJwk } = await kms.createKey({ type: { kty: 'EC', crv: 'P-256' } })
  return { method: 'jwk', keys: [Kms.PublicJwk.fromPublicJwk(publicJwk)] }
}
