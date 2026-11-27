# Standards

medusa is a holder wallet for testing issuers and verifiers. It claims no conformance; it targets the standards below. Status: **implemented** means covered by tests in this repository, **targeted** means planned but not yet implemented.

| Standard                                        | Identifier / version                                                           | URL                                                                         | Status                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OpenID for Verifiable Credential Issuance       | OpenID4VCI 1.0                                                                 | <https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html> | pre-authorized code flow and key attestations implemented (e2e vs capture-wallet); auth code targeted |
| OpenID for Verifiable Presentations (with DCQL) | OpenID4VP 1.0                                                                  | <https://openid.net/specs/openid-4-verifiable-presentations-1_0.html>       | targeted                                                                                              |
| OAuth 2.0 Demonstrating Proof of Possession     | RFC 9449 (DPoP)                                                                | <https://www.rfc-editor.org/rfc/rfc9449>                                    | targeted                                                                                              |
| OAuth 2.0 Pushed Authorization Requests         | RFC 9126 (PAR)                                                                 | <https://www.rfc-editor.org/rfc/rfc9126>                                    | targeted                                                                                              |
| Proof Key for Code Exchange                     | RFC 7636 (PKCE, `S256`)                                                        | <https://www.rfc-editor.org/rfc/rfc7636>                                    | targeted                                                                                              |
| Mobile driving licence / mdoc data model        | ISO/IEC 18013-5 (`mso_mdoc`)                                                   | <https://www.iso.org/standard/69084.html>                                   | receive, verify and decode implemented via Credo                                                      |
| SD-JWT-based Verifiable Credentials             | IETF `draft-ietf-oauth-sd-jwt-vc` (`dc+sd-jwt`), as implemented by Credo 0.7.5 | <https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/>              | receive, verify and decode implemented via Credo                                                      |

## Normative requirements in scope

- OpenID4VCI: credential offer by value and by reference; schemes `openid-credential-offer://`, `eu-eaa-offer://`, `haip-vci://`; `pre-authorized_code` grant with optional `tx_code`; `authorization_code` grant with PAR, PKCE `S256` and DPoP; the nonce endpoint; `proofs.jwt` with exactly one proof entry; key attestations: when a configuration's `jwt` proof type has `key_attestations_required` (an empty object included), the proof carries a `key-attestation+jwt` in its `key_attestation` header, signed by a self-signed test attester (`x5c`), listing the holder key in `attested_keys`.
- OpenID4VP: DCQL queries; response modes `direct_post` and `direct_post.jwt`; signed request objects by value and by reference; `request_uri_method=post` with `wallet_metadata`.

## To confirm before relying on them

- The exact EUDI Architecture and Reference Framework (ARF) version and the OpenID4VC High Assurance Interoperability Profile (HAIP) version that apply.
- The final SD-JWT VC draft or RFC number that Credo 0.7.5 implements.
- The key attestation profile (ARF/HAIP): which `key_storage` and `user_authentication` values issuers expect. medusa claims `iso_18045_moderate` for both; capture-wallet accepts it.
- The `attestation` proof type (key attestation carrying the `c_nonce`) is not implemented; medusa always sends `jwt` proofs.
- The wallet attestation profile (`attest_jwt_client_auth`), not implemented.
