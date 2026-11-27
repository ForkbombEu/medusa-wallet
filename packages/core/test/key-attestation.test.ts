import { verify, X509Certificate } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { OpenId4VciCredentialBindingOptions } from '@credo-ts/openid4vc'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAgent, type MedusaAgent } from '../src/agent.js'
import { p256JwkBinding } from '../src/keys/holder-binding.js'
import { loadKeyAttester } from '../src/keys/key-attestation.js'

const decodePart = (part: string | undefined) => JSON.parse(Buffer.from(part ?? '', 'base64url').toString('utf8'))

describe('key attestation', () => {
  let dir: string
  let agent: MedusaAgent

  async function open(): Promise<MedusaAgent> {
    const opened = createAgent({ path: join(dir, 'wallet.db'), key: 'secret' })
    await opened.initialize()
    return opened
  }

  // Just enough of Credo's binding options for medusa's resolver.
  function bindingOptions(keyAttestationsRequired?: object): OpenId4VciCredentialBindingOptions {
    return {
      agentContext: agent.context,
      proofTypes: { jwt: { supportedSignatureAlgorithms: ['ES256'], keyAttestationsRequired } },
    } as unknown as OpenId4VciCredentialBindingOptions
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-key-attestation-test-'))
    agent = await open()
  })
  afterEach(async () => {
    await agent.shutdown()
    await rm(dir, { recursive: true, force: true })
  })

  it('keeps one attester per wallet across reopening', async () => {
    const first = await loadKeyAttester(agent)
    expect(await loadKeyAttester(agent)).toEqual(first)

    await agent.shutdown()
    agent = await open()

    expect(await loadKeyAttester(agent)).toEqual(first)
  })

  it('binds a plain jwk when the issuer does not require key attestation', async () => {
    const binding = await p256JwkBinding(() => loadKeyAttester(agent))(bindingOptions())

    expect(binding).toMatchObject({ method: 'jwk' })
  })

  it('attests the holder key when the issuer requires key attestation, even with no level', async () => {
    const attester = await loadKeyAttester(agent)
    const binding = await p256JwkBinding(async () => attester)(bindingOptions({}))

    expect(binding.method).toBe('attestation')
    const jwt = binding.method === 'attestation' ? binding.keyAttestationJwt : ''
    const [header, payload, signature] = jwt.split('.')
    expect(decodePart(header)).toEqual({ alg: 'ES256', typ: 'key-attestation+jwt', x5c: [attester.certificate] })

    const claims = decodePart(payload)
    expect(claims.exp - claims.iat).toBe(3600)
    expect(claims.key_storage).toEqual(['iso_18045_moderate'])
    // Credo signs the proof with the attested key, which it finds in the KMS by kid.
    const [attestedKey] = claims.attested_keys
    expect(attestedKey).toMatchObject({ kty: 'EC', crv: 'P-256', kid: expect.any(String) })
    await expect(agent.kms.getPublicKey({ keyId: attestedKey.kid })).resolves.toMatchObject({ x: attestedKey.x })

    const certificate = new X509Certificate(Buffer.from(attester.certificate, 'base64'))
    expect(certificate.subject).toContain('CN=Medusa Test Key Attester')
    const signed = verify(
      'sha256',
      Buffer.from(`${header}.${payload}`),
      { key: certificate.publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature ?? '', 'base64url'),
    )
    expect(signed).toBe(true)
  })
})
