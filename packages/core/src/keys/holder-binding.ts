import { Kms } from '@credo-ts/core'
import type { OpenId4VciCredentialBindingResolver } from '@credo-ts/openid4vc'
import { createKeyAttestation, type KeyAttester } from './key-attestation.js'

/**
 * Binds each credential to a fresh P-256 key in the wallet KMS (HAIP mandates ES256); Credo
 * turns it into a COSE key for mdoc. When the configuration's `jwt` proof requires key
 * attestations (`key_attestations_required`, even an empty object), the key is attested by
 * `attester` and Credo puts the attestation in the proof's `key_attestation` header.
 */
export function p256JwkBinding(attester: () => Promise<KeyAttester>): OpenId4VciCredentialBindingResolver {
  return async ({ agentContext, proofTypes }) => {
    const kms = agentContext.resolve(Kms.KeyManagementApi)
    const { keyId, publicJwk } = await kms.createKey({ type: { kty: 'EC', crv: 'P-256' } })
    const holderKey = Kms.PublicJwk.fromPublicJwk(publicJwk)
    if (proofTypes.jwt?.keyAttestationsRequired === undefined) return { method: 'jwk', keys: [holderKey] }

    holderKey.keyId = keyId
    const keyAttestationJwt = await createKeyAttestation(agentContext, await attester(), holderKey)
    return { method: 'attestation', keyAttestationJwt }
  }
}
