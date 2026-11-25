import type { OpenId4VciResolvedCredentialOffer } from '@credo-ts/openid4vc'
import type { TxCodeSpec } from '../errors.js'

const PRE_AUTHORIZED_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code'

export interface OfferedCredentialConfiguration {
  id: string
  format: string
  /** `vct` or `doctype`, when the configuration declares one. */
  type: string | undefined
}

/** A credential offer with its issuer metadata resolved. */
export interface ResolvedOffer {
  credentialIssuer: string
  credentialConfigurations: OfferedCredentialConfiguration[]
  grants: {
    preAuthorizedCode?: { txCode: TxCodeSpec | undefined }
    authorizationCode?: { issuerState: string | undefined }
  }
}

// Credo's resolved offer stays private to core: frontends only see ResolvedOffer.
const credoOffers = new WeakMap<ResolvedOffer, OpenId4VciResolvedCredentialOffer>()

export function toResolvedOffer(credo: OpenId4VciResolvedCredentialOffer): ResolvedOffer {
  const grants = credo.credentialOfferPayload.grants ?? {}
  const preAuthorized = grants[PRE_AUTHORIZED_GRANT]
  const authorizationCode = grants.authorization_code
  const offer: ResolvedOffer = {
    credentialIssuer: credo.credentialOfferPayload.credential_issuer,
    credentialConfigurations: Object.entries(credo.offeredCredentialConfigurations).map(([id, configuration]) => {
      const typed = configuration as { vct?: unknown; doctype?: unknown }
      const type = typed.vct ?? typed.doctype
      return { id, format: configuration.format, type: typeof type === 'string' ? type : undefined }
    }),
    grants: {
      ...(preAuthorized && {
        preAuthorizedCode: {
          txCode: preAuthorized.tx_code && {
            ...(preAuthorized.tx_code.input_mode && { inputMode: preAuthorized.tx_code.input_mode }),
            ...(preAuthorized.tx_code.length !== undefined && { length: preAuthorized.tx_code.length }),
            ...(preAuthorized.tx_code.description && { description: preAuthorized.tx_code.description }),
          },
        },
      }),
      ...(authorizationCode && { authorizationCode: { issuerState: authorizationCode.issuer_state } }),
    },
  }
  credoOffers.set(offer, credo)
  return offer
}

export function credoOfferFor(offer: ResolvedOffer): OpenId4VciResolvedCredentialOffer {
  const credo = credoOffers.get(offer)
  if (!credo) throw new TypeError('ResolvedOffer must come from this wallet: use issuance.resolveOffer()')
  return credo
}
