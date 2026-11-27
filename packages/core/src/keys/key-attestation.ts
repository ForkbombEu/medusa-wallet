import { type AgentContext, JwsService, JwtPayload, Kms, X509KeyUsage } from '@credo-ts/core'
import type { MedusaAgent } from '../agent.js'

/**
 * The wallet's test key attester (OpenID4VCI 1.0 key attestations): a P-256 key with a self-signed
 * certificate. It vouches for holder keys to issuers that require key attestations; it proves
 * nothing about real key storage, which is fine for a wallet that exercises issuers.
 */
export interface KeyAttester {
  /** KMS key id of the attester's private key. */
  keyId: string
  /** Base64 DER self-signed certificate, sent as the attestation's x5c. */
  certificate: string
}

const ATTESTER_RECORD_ID = 'medusa-key-attester'
const ATTESTER_VALIDITY_YEARS = 10
const ATTESTATION_LIFETIME_SECONDS = 3600
// ISO 18045 attack potential levels claimed for the attested key; the highest a software key can plausibly claim.
const CLAIMED_RESISTANCE = ['iso_18045_moderate']

function isKeyAttester(content: Record<string, unknown>): content is Record<string, unknown> & KeyAttester {
  return typeof content.keyId === 'string' && typeof content.certificate === 'string'
}

/** Loads the wallet's attester, creating and storing it on first use so issuers see one stable certificate. */
export async function loadKeyAttester(agent: MedusaAgent): Promise<KeyAttester> {
  const record = await agent.genericRecords.findById(ATTESTER_RECORD_ID)
  if (record && isKeyAttester(record.content)) {
    return { keyId: record.content.keyId, certificate: record.content.certificate }
  }

  const { keyId, publicJwk } = await agent.kms.createKey({ type: { kty: 'EC', crv: 'P-256' } })
  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + ATTESTER_VALIDITY_YEARS)
  const certificate = await agent.x509.createCertificate({
    authorityKey: Kms.PublicJwk.fromPublicJwk(publicJwk),
    issuer: { commonName: 'Medusa Test Key Attester', countryName: 'NL' },
    validity: { notAfter },
    extensions: { keyUsage: { usages: [X509KeyUsage.DigitalSignature] } },
  })
  const attester: KeyAttester = { keyId, certificate: certificate.toString('base64') }
  if (record) await agent.genericRecords.delete(record)
  await agent.genericRecords.save({ id: ATTESTER_RECORD_ID, content: { ...attester } })
  return attester
}

/**
 * Signs a `key-attestation+jwt` listing `attestedKey`. The key's `kid` must be its KMS key id:
 * Credo signs the proof with the first attested key and looks it up by `kid`.
 */
export async function createKeyAttestation(
  agentContext: AgentContext,
  attester: KeyAttester,
  attestedKey: Kms.PublicJwk,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return agentContext.resolve(JwsService).createJwsCompact(agentContext, {
    keyId: attester.keyId,
    payload: new JwtPayload({
      iat: now,
      exp: now + ATTESTATION_LIFETIME_SECONDS,
      additionalClaims: {
        attested_keys: [attestedKey.toJson({ includeKid: true })],
        key_storage: CLAIMED_RESISTANCE,
        user_authentication: CLAIMED_RESISTANCE,
      },
    }),
    protectedHeaderOptions: { alg: 'ES256', typ: 'key-attestation+jwt', x5c: [attester.certificate] },
  })
}
