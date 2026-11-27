import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openWallet, type Wallet } from '../src/index.js'
import {
  captureWalletUrl,
  createIssuanceSession,
  discoverIssuerCases,
  getSession,
  getSessionEvents,
  type IssuerCase,
} from './support/capture-wallet.js'
import { expectedType } from './support/issuer-matrix.js'

// Discovered at collection time so each combination is its own test: a new capture-wallet issuer or
// configuration is exercised without touching this file.
const cases: IssuerCase[] = captureWalletUrl ? await discoverIssuerCases() : []
const issuerIds = [...new Set(cases.map((issuerCase) => issuerCase.issuerId))]

describe.skipIf(!captureWalletUrl)('capture-wallet issuers', () => {
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

  it('publishes at least one combination medusa can run', () => {
    expect(cases.filter((issuerCase) => !issuerCase.skipReason)).not.toEqual([])
  })

  describe.each(issuerIds)('%s', (issuerId) => {
    for (const issuerCase of cases.filter((candidate) => candidate.issuerId === issuerId)) {
      const name = `${issuerCase.configurationId} via ${issuerCase.flow}`
      if (issuerCase.skipReason) {
        it.skip(`${name}: ${issuerCase.skipReason}`, () => {})
        continue
      }
      it(name, () => receivesAndStores(wallet, issuerCase))
    }
  })
})

async function receivesAndStores(wallet: Wallet, issuerCase: IssuerCase): Promise<void> {
  const { format } = issuerCase.configuration
  const type = expectedType(issuerCase.configuration)
  const session = await createIssuanceSession({
    issuer_configuration_id: issuerCase.issuerId,
    credential_configuration_id: issuerCase.configurationId,
    flow: issuerCase.flow,
  })

  const offer = await wallet.issuance.resolveOffer(session.deeplink)
  expect(offer.credentialIssuer).toBe(issuerCase.credentialIssuer)
  expect(offer.credentialConfigurations).toEqual([{ id: issuerCase.configurationId, format, type }])
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
}
