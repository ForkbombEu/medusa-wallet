/**
 * Decides, from published OpenID4VCI metadata alone, which issuer × credential configuration × flow
 * combinations medusa can run today. A new issuer is covered without test changes; a combination medusa
 * cannot handle yet is reported with the reason, which doubles as the feature backlog.
 */

export type Flow = 'pre_authorized_code' | 'authorization_code'

export interface CredentialConfigurationMetadata {
  format: string
  vct?: string
  doctype?: string
  proof_types_supported?: Record<
    string,
    { proof_signing_alg_values_supported?: string[]; key_attestations_required?: Record<string, unknown> }
  >
}

export interface AuthorizationServerMetadata {
  grant_types_supported?: string[]
}

const PRE_AUTHORIZED_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code'
const STORABLE_FORMATS = ['dc+sd-jwt', 'mso_mdoc']

/** Returns why medusa cannot run this combination yet, or undefined when it can. */
export function unsupportedReason(configuration: CredentialConfigurationMetadata, flow: Flow): string | undefined {
  if (flow === 'authorization_code') return 'authorization_code flow not implemented'
  if (!STORABLE_FORMATS.includes(configuration.format)) return `format ${configuration.format} not supported`
  const jwtProof = configuration.proof_types_supported?.jwt
  if (!jwtProof) return 'no jwt proof type offered'
  if (jwtProof.key_attestations_required) return 'key attestation not implemented'
  if (jwtProof.proof_signing_alg_values_supported && !jwtProof.proof_signing_alg_values_supported.includes('ES256')) {
    return 'jwt proof does not allow ES256'
  }
  return undefined
}

/** The `Credential.type` medusa reports: the SD-JWT VC `vct` or the mdoc `doctype`. */
export function expectedType(configuration: CredentialConfigurationMetadata): string | undefined {
  return configuration.vct ?? configuration.doctype
}

/** Flows an authorization server offers. RFC 8414 defaults `grant_types_supported` to `authorization_code`. */
export function flowsFor(metadata: AuthorizationServerMetadata): Flow[] {
  const grants = metadata.grant_types_supported ?? ['authorization_code']
  const flows: Flow[] = []
  if (grants.includes(PRE_AUTHORIZED_GRANT)) flows.push('pre_authorized_code')
  if (grants.includes('authorization_code')) flows.push('authorization_code')
  return flows
}
