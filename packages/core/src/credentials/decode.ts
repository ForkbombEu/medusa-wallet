import { type MdocRecord, type SdJwtVcRecord, X509Certificate } from '@credo-ts/core'
import type { Credential } from './types.js'

// Registered JWT and SD-JWT VC claims that Credential surfaces as fields (or that bind the holder).
const SD_JWT_METADATA_CLAIMS = new Set(['iss', 'iat', 'nbf', 'exp', 'vct', 'vct#integrity', 'cnf', '_sd_alg'])

const fromEpochSeconds = (value: unknown): Date | undefined =>
  typeof value === 'number' ? new Date(value * 1000) : undefined

export function decodeSdJwtVcRecord(record: SdJwtVcRecord): Credential {
  const sdJwtVc = record.firstCredential
  const payload = sdJwtVc.prettyClaims as Record<string, unknown>
  return {
    id: record.id,
    format: 'dc+sd-jwt',
    type: String(payload.vct),
    issuer: typeof payload.iss === 'string' ? payload.iss : undefined,
    claims: Object.fromEntries(Object.entries(payload).filter(([name]) => !SD_JWT_METADATA_CLAIMS.has(name))),
    issuedAt: fromEpochSeconds(payload.iat),
    validFrom: fromEpochSeconds(payload.nbf),
    expiresAt: fromEpochSeconds(payload.exp),
    storedAt: record.createdAt,
    raw: sdJwtVc.compact,
  }
}

export function decodeMdocRecord(record: MdocRecord): Credential {
  const mdoc = record.firstCredential
  const { signed, validFrom, validUntil } = mdoc.validityInfo
  return {
    id: record.id,
    format: 'mso_mdoc',
    type: mdoc.docType,
    issuer: X509Certificate.fromRawCertificate(mdoc.signingCertificate).subject,
    claims: mdoc.issuerSignedNamespaces,
    issuedAt: signed,
    validFrom,
    expiresAt: validUntil,
    storedAt: record.createdAt,
    raw: mdoc.base64Url,
  }
}
