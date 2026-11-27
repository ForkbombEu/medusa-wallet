import { describe, expect, it } from 'vitest'
import {
  type CredentialConfigurationMetadata,
  expectedType,
  flowsFor,
  unsupportedReason,
} from './support/issuer-matrix.js'

const sdJwt: CredentialConfigurationMetadata = {
  format: 'dc+sd-jwt',
  vct: 'urn:eudi:pid:1',
  proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['ES256'] } },
}

describe('issuer matrix', () => {
  it('accepts a jwt-proof SD-JWT VC over the pre-authorized flow', () => {
    expect(unsupportedReason(sdJwt, 'pre_authorized_code')).toBeUndefined()
  })

  it('accepts a jwt-proof mdoc', () => {
    const { vct: _vct, ...rest } = sdJwt
    const mdoc = { ...rest, format: 'mso_mdoc', doctype: 'eu.europa.ec.eudi.pid.1' }
    expect(unsupportedReason(mdoc, 'pre_authorized_code')).toBeUndefined()
  })

  it('skips the authorization code flow', () => {
    expect(unsupportedReason(sdJwt, 'authorization_code')).toMatch(/authorization_code/)
  })

  it('runs configurations that require key attestation', () => {
    const attested = {
      ...sdJwt,
      proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['ES256'], key_attestations_required: {} } },
    }
    expect(unsupportedReason(attested, 'pre_authorized_code')).toBeUndefined()
  })

  it('skips configurations without a jwt proof type', () => {
    const attestationOnly = { ...sdJwt, proof_types_supported: { attestation: {} } }
    expect(unsupportedReason(attestationOnly, 'pre_authorized_code')).toMatch(/jwt proof/)
  })

  it('skips configurations whose jwt proof does not allow ES256', () => {
    const edOnly = { ...sdJwt, proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA'] } } }
    expect(unsupportedReason(edOnly, 'pre_authorized_code')).toMatch(/ES256/)
  })

  it('skips formats the wallet cannot store', () => {
    expect(unsupportedReason({ ...sdJwt, format: 'jwt_vc_json' }, 'pre_authorized_code')).toMatch(/jwt_vc_json/)
  })

  it('derives the expected credential type from vct or doctype', () => {
    expect(expectedType(sdJwt)).toBe('urn:eudi:pid:1')
    expect(expectedType({ format: 'mso_mdoc', doctype: 'eu.europa.ec.eudi.pid.1' })).toBe('eu.europa.ec.eudi.pid.1')
  })

  it('maps authorization server grant types to capture-wallet flows', () => {
    expect(
      flowsFor({
        grant_types_supported: [
          'authorization_code',
          'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'refresh_token',
        ],
      }),
    ).toEqual(['pre_authorized_code', 'authorization_code'])
    expect(flowsFor({})).toEqual(['authorization_code'])
  })
})
