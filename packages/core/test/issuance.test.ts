import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { OpenId4VciResolvedCredentialOffer } from '@credo-ts/openid4vc'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IssuanceError, OfferResolutionError, openWallet, TxCodeRequiredError, type Wallet } from '../src/index.js'
import { toResolvedOffer } from '../src/issuance/offer.js'

// Just enough of Credo's resolved offer for medusa's mapping and pre-flight checks.
function credoOffer(grants: Record<string, unknown>): OpenId4VciResolvedCredentialOffer {
  return {
    credentialOfferPayload: {
      credential_issuer: 'https://issuer.medusa.test',
      credential_configuration_ids: ['pid-sd-jwt'],
      grants,
    },
    offeredCredentialConfigurations: { 'pid-sd-jwt': { format: 'dc+sd-jwt', vct: 'urn:eudi:pid:1' } },
    metadata: {},
  } as unknown as OpenId4VciResolvedCredentialOffer
}

const PRE_AUTHORIZED = 'urn:ietf:params:oauth:grant-type:pre-authorized_code'

describe('issuance', () => {
  let dir: string
  let wallet: Wallet

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-issuance-test-'))
    wallet = await openWallet({ path: join(dir, 'wallet.db'), key: 'secret' })
  })
  afterEach(async () => {
    await wallet.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('maps offered configurations and grants into a ResolvedOffer', () => {
    const offer = toResolvedOffer(
      credoOffer({
        [PRE_AUTHORIZED]: {
          'pre-authorized_code': 'code',
          tx_code: { input_mode: 'numeric', length: 6, description: 'PIN from the email' },
        },
        authorization_code: { issuer_state: 'state-1' },
      }),
    )

    expect(offer).toEqual({
      credentialIssuer: 'https://issuer.medusa.test',
      credentialConfigurations: [{ id: 'pid-sd-jwt', format: 'dc+sd-jwt', type: 'urn:eudi:pid:1' }],
      grants: {
        preAuthorizedCode: { txCode: { inputMode: 'numeric', length: 6, description: 'PIN from the email' } },
        authorizationCode: { issuerState: 'state-1' },
      },
    })
  })

  it('rejects an offer that is not a credential offer', async () => {
    await expect(wallet.issuance.resolveOffer('not an offer')).rejects.toBeInstanceOf(OfferResolutionError)
  })

  it('asks for the transaction code before contacting the issuer', async () => {
    const offer = toResolvedOffer(credoOffer({ [PRE_AUTHORIZED]: { 'pre-authorized_code': 'code', tx_code: {} } }))

    await expect(wallet.issuance.receivePreAuthorized(offer)).rejects.toBeInstanceOf(TxCodeRequiredError)
  })

  it('refuses the pre-authorized flow when the offer has no such grant', async () => {
    const offer = toResolvedOffer(credoOffer({ authorization_code: {} }))

    await expect(wallet.issuance.receivePreAuthorized(offer)).rejects.toBeInstanceOf(IssuanceError)
  })

  it('refuses an offer that was not resolved by a wallet', async () => {
    const forged = {
      credentialIssuer: 'x',
      credentialConfigurations: [],
      grants: { preAuthorizedCode: { txCode: undefined } },
    }

    await expect(wallet.issuance.receivePreAuthorized(forged)).rejects.toBeInstanceOf(TypeError)
  })
})
