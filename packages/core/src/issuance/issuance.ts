import { MdocRecord, SdJwtVcRecord } from '@credo-ts/core'
import type { MedusaAgent } from '../agent.js'
import { decodeMdocRecord, decodeSdJwtVcRecord } from '../credentials/decode.js'
import type { Credential } from '../credentials/types.js'
import { IssuanceError, OfferResolutionError, TxCodeRequiredError, UnsupportedCredentialError } from '../errors.js'
import { p256JwkBinding } from '../keys/holder-binding.js'
import { type KeyAttester, loadKeyAttester } from '../keys/key-attestation.js'
import { credoOfferFor, type ResolvedOffer, toResolvedOffer } from './offer.js'

export interface ReceivePreAuthorizedOptions {
  txCode?: string
  /** Subset of the offered configurations to request; defaults to all of them. */
  credentialConfigurationIds?: string[]
}

export interface Issuance {
  /** Parses an offer (by value or by reference, any offer scheme) and resolves the issuer metadata. */
  resolveOffer(offerUri: string): Promise<ResolvedOffer>
  /** Runs the pre-authorized code flow and stores every credential the issuer returns. */
  receivePreAuthorized(offer: ResolvedOffer, options?: ReceivePreAuthorizedOptions): Promise<Credential[]>
}

// Credo's OAuth/OpenID4VCI client errors carry the server's error body under one of these keys.
function issuerResponse(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as Record<string, unknown>
  return candidate.errorResponse ?? candidate.response ?? candidate.body
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function createIssuance(agent: MedusaAgent): Issuance {
  const holder = agent.openid4vc.holder
  // Loaded once per wallet session; the resolver runs per credential configuration.
  let keyAttester: Promise<KeyAttester> | undefined
  const credentialBindingResolver = p256JwkBinding(() => {
    keyAttester ??= loadKeyAttester(agent).catch((error: unknown) => {
      keyAttester = undefined
      throw error
    })
    return keyAttester
  })

  async function store(record: unknown): Promise<Credential> {
    if (record instanceof SdJwtVcRecord) return decodeSdJwtVcRecord(await agent.sdJwtVc.store({ record }))
    if (record instanceof MdocRecord) return decodeMdocRecord(await agent.mdoc.store({ record }))
    throw new UnsupportedCredentialError('The issuer returned a credential format medusa does not store yet')
  }

  return {
    async resolveOffer(offerUri) {
      try {
        return toResolvedOffer(await holder.resolveCredentialOffer(offerUri.trim()))
      } catch (cause) {
        throw new OfferResolutionError(`Could not resolve the credential offer: ${errorMessage(cause)}`, { cause })
      }
    },

    async receivePreAuthorized(offer, options = {}) {
      const resolvedCredentialOffer = credoOfferFor(offer)
      const preAuthorized = offer.grants.preAuthorizedCode
      if (!preAuthorized) throw new IssuanceError('The offer has no pre-authorized_code grant', undefined)
      if (preAuthorized.txCode && options.txCode === undefined) throw new TxCodeRequiredError(preAuthorized.txCode)

      let token: Awaited<ReturnType<typeof holder.requestToken>>
      try {
        token = await holder.requestToken({
          resolvedCredentialOffer,
          ...(options.txCode !== undefined && { txCode: options.txCode }),
        })
      } catch (cause) {
        throw new IssuanceError(`Token request failed: ${errorMessage(cause)}`, issuerResponse(cause), { cause })
      }

      let response: Awaited<ReturnType<typeof holder.requestCredentials>>
      try {
        response = await holder.requestCredentials({
          resolvedCredentialOffer,
          accessToken: token.accessToken,
          ...(token.cNonce !== undefined && { cNonce: token.cNonce }),
          ...(token.dpop !== undefined && { dpop: token.dpop }),
          ...(options.credentialConfigurationIds && { credentialConfigurationIds: options.credentialConfigurationIds }),
          allowedProofOfPossessionSignatureAlgorithms: ['ES256'],
          credentialBindingResolver,
        })
      } catch (cause) {
        throw new IssuanceError(`Credential request failed: ${errorMessage(cause)}`, issuerResponse(cause), { cause })
      }

      const credentials: Credential[] = []
      for (const { record } of response.credentials) credentials.push(await store(record))
      return credentials
    },
  }
}
