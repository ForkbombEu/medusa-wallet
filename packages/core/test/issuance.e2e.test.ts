import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openWallet, type Wallet } from '../src/index.js'
import { captureWalletUrl, createIssuanceSession, getSession, getSessionEvents } from './support/capture-wallet.js'

describe.skipIf(!captureWalletUrl)('OpenID4VCI pre-authorized flow against capture-wallet', () => {
  let dir: string
  let wallet: Wallet

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-e2e-'))
    wallet = await openWallet({
      path: join(dir, 'wallet.db'),
      key: 'e2e',
      allowInsecureHttp: captureWalletUrl?.startsWith('http://') ?? false,
    })
  })
  afterEach(async () => {
    await wallet.close()
    await rm(dir, { recursive: true, force: true })
  })

  it.each([
    ['urn:eu.europa.ec.eudi:pid:1.sd-jwt.jwt-proof', 'dc+sd-jwt', 'urn:eudi:pid:1'],
    ['urn:eu.europa.ec.eudi:pid:1.mdoc.jwt-proof', 'mso_mdoc', 'eu.europa.ec.eudi.pid.1'],
  ] as const)('receives and stores %s', async (configurationId, format, type) => {
    const session = await createIssuanceSession({
      issuer_configuration_id: 'eu-pid-jwt-proof-only',
      credential_configuration_id: configurationId,
      flow: 'pre_authorized_code',
    })

    const offer = await wallet.issuance.resolveOffer(session.deeplink)
    expect(offer.credentialIssuer).toBe(`${captureWalletUrl}/issuers/eu-pid-jwt-proof-only`)
    expect(offer.credentialConfigurations).toEqual([{ id: configurationId, format, type }])
    expect(offer.grants.preAuthorizedCode).toBeDefined()

    const [credential, ...rest] = await wallet.issuance.receivePreAuthorized(offer)

    expect(rest).toEqual([])
    expect(credential).toMatchObject({ format, type })
    expect(await wallet.credentials.list()).toEqual([credential])

    expect((await getSession(session.session_id)).status).toBe('credential_issued')
    const issuerStates = (await getSessionEvents(session.session_id))
      .filter((event) => event.type === 'credo_issuance_state_changed')
      .map((event) => event.detail.state)
    expect(issuerStates.at(-1)).toBe('Completed')
  })
})
