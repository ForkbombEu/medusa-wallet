import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  CredentialNotFoundError,
  openWallet,
  UnsupportedCredentialError,
  type Wallet,
  WalletOpenError,
} from '../src/index.js'
import { ISSUER_URL, PID_DOCTYPE, PID_VCT, TestIssuer } from './support/test-issuer.js'

let issuer: TestIssuer

beforeAll(async () => {
  issuer = await TestIssuer.create()
})
afterAll(async () => {
  await issuer.close()
})

describe('wallet', () => {
  let dir: string
  let path: string
  let wallet: Wallet

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-wallet-test-'))
    path = join(dir, 'nested', 'wallet.db')
    wallet = await openWallet({ path, key: 'secret' })
  })
  afterEach(async () => {
    await wallet.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('starts empty', async () => {
    expect(await wallet.credentials.list()).toEqual([])
  })

  it('imports an SD-JWT VC and decodes its disclosed claims', async () => {
    const raw = await issuer.sdJwtVc()

    const credential = await wallet.credentials.import(raw)

    expect(credential).toMatchObject({
      format: 'dc+sd-jwt',
      type: PID_VCT,
      issuer: ISSUER_URL,
      claims: { given_name: 'Ada', family_name: 'Lovelace' },
      issuedAt: new Date(1_700_000_000_000),
      expiresAt: new Date(2_000_000_000_000),
      raw,
    })
    expect(await wallet.credentials.list()).toEqual([credential])
    expect(await wallet.credentials.get(credential.id)).toEqual(credential)
  })

  it('imports an mdoc and groups its claims by namespace', async () => {
    const raw = await issuer.mdoc()

    const credential = await wallet.credentials.import(raw)

    expect(credential).toMatchObject({
      format: 'mso_mdoc',
      type: PID_DOCTYPE,
      issuer: expect.stringContaining('Medusa Test Issuer'),
      claims: { [PID_DOCTYPE]: { given_name: 'Ada', family_name: 'Lovelace' } },
      issuedAt: new Date('2026-01-01T00:00:00Z'),
      validFrom: new Date('2026-01-01T00:00:00Z'),
      expiresAt: new Date('2036-01-01T00:00:00Z'),
      raw,
    })
  })

  it('deletes a credential', async () => {
    const { id } = await wallet.credentials.import(await issuer.sdJwtVc())

    await wallet.credentials.delete(id)

    expect(await wallet.credentials.list()).toEqual([])
    await expect(wallet.credentials.get(id)).rejects.toBeInstanceOf(CredentialNotFoundError)
    await expect(wallet.credentials.delete(id)).rejects.toBeInstanceOf(CredentialNotFoundError)
  })

  it('rejects input that is neither an SD-JWT VC nor an mdoc', async () => {
    await expect(wallet.credentials.import('not a credential')).rejects.toBeInstanceOf(UnsupportedCredentialError)
  })

  it('persists credentials across reopen and rejects a wrong key', async () => {
    const stored = await wallet.credentials.import(await issuer.sdJwtVc())
    await wallet.close()

    wallet = await openWallet({ path, key: 'secret' })
    expect(await wallet.credentials.list()).toEqual([stored])

    await expect(openWallet({ path, key: 'wrong' })).rejects.toBeInstanceOf(WalletOpenError)
  })
})
