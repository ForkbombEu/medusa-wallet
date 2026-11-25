/** Base class for every error core throws, so frontends can tell expected failures from bugs. */
export class MedusaError extends Error {
  override name = 'MedusaError'
}

/** The wallet store could not be opened or created, e.g. because the key is wrong. */
export class WalletOpenError extends MedusaError {
  override name = 'WalletOpenError'
}

export class CredentialNotFoundError extends MedusaError {
  override name = 'CredentialNotFoundError'

  constructor(readonly credentialId: string) {
    super(`No credential with id ${credentialId}`)
  }
}

/** The input is not a credential format medusa can parse (SD-JWT VC or mdoc). */
export class UnsupportedCredentialError extends MedusaError {
  override name = 'UnsupportedCredentialError'
}

/** The credential offer could not be parsed, fetched, or its issuer metadata resolved. */
export class OfferResolutionError extends MedusaError {
  override name = 'OfferResolutionError'
}

/** The offer requires a transaction code (tx_code) and none was given. */
export class TxCodeRequiredError extends MedusaError {
  override name = 'TxCodeRequiredError'

  constructor(readonly txCode: TxCodeSpec) {
    super(`The offer requires a transaction code${txCode.description ? `: ${txCode.description}` : ''}`)
  }
}

/** A token or credential request was rejected; `response` holds what the issuer sent, when known. */
export class IssuanceError extends MedusaError {
  override name = 'IssuanceError'

  constructor(
    message: string,
    readonly response: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export interface TxCodeSpec {
  inputMode?: 'numeric' | 'text'
  length?: number
  description?: string
}
