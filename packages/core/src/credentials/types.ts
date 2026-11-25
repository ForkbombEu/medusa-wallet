export type CredentialFormat = 'dc+sd-jwt' | 'mso_mdoc'

/** A credential held by the wallet, decoded into format-independent fields. */
export interface Credential {
  id: string
  format: CredentialFormat
  /** `vct` for SD-JWT VC, `docType` for mdoc. */
  type: string
  /** `iss` for SD-JWT VC, the signing certificate subject for mdoc. */
  issuer: string | undefined
  /**
   * Subject claims. SD-JWT VC: the disclosed payload without the
   * registered/metadata claims surfaced as fields here. mdoc: elements grouped by namespace.
   */
  claims: Record<string, unknown>
  issuedAt: Date | undefined
  validFrom: Date | undefined
  expiresAt: Date | undefined
  /** When the wallet stored the credential. */
  storedAt: Date
  /** The credential as issued: compact SD-JWT VC or base64url IssuerSigned. */
  raw: string
}
