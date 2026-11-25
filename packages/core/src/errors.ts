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
