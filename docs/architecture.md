# Architecture

medusa is a headless EUDI-ARF holder wallet. Its job is to exercise issuers and verifiers and make every step of the exchange observable.

## Packages

```
packages/cli  ──depends on──▶  packages/core  ──wraps──▶  Credo (@credo-ts/*)
 commander adapter               domain + flows             protocol + storage
```

- **core** owns wallet state (keys, credentials), the protocol flows, and the domain types frontends see. It takes configuration as arguments, returns data, and throws typed errors. It reads no environment, prints nothing, and does no argument parsing.
- **cli** turns argv and environment into core calls and renders the results: JSON on stdout, diagnostics on stderr, non-zero exit codes on failure.

Credo types never cross core's public API (`packages/core/src/index.ts`). Frontends see medusa types such as `Credential`, `ResolvedOffer` and `Wallet`. That lets us upgrade Credo, or swap a flow to `@openid4vc/*` directly, without touching frontends.

## Core modules (target shape)

| Module          | Responsibility                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallet.ts`     | `openWallet({ path, key })`: persistent Askar SQLite store; owns the Credo agent lifecycle                                                              |
| `agent.ts`      | Credo agent factory (Askar + OpenID4VC holder). Internal; also the hook point for attestation providers                                                 |
| `keys/`         | holder binding keys (P-256 JWK per HAIP, `did:key` optional); key/wallet attestation for test issuers                                                   |
| `issuance/`     | offer resolution (`openid-credential-offer://`, `eu-eaa-offer://`, `haip-vci://`); pre-authorized and authorization-code (PAR + PKCE S256 + DPoP) flows |
| `presentation/` | OpenID4VP request resolution, DCQL matching, response submission (`direct_post`, `direct_post.jwt`)                                                     |
| `credentials/`  | domain `Credential` type, decoding of SD-JWT VC and mdoc records, repository (list/get/delete/import)                                                   |
| `errors.ts`     | typed errors carrying the counterparty's HTTP status and body                                                                                           |

`credentials.import` stores a credential obtained outside an issuance flow **without** verifying its signature, issuer trust, validity or status.

### Authorization-code flow without a browser

`startAuthorization` returns the authorization URL plus a session (PKCE verifier, DPoP key, issuer state). When the authorization server auto-approves, as capture-wallet's does, core follows the redirects itself until it reaches the wallet's `redirect_uri` and extracts the code. When a human step is needed, the frontend shows the URL and passes the final redirect URL to `completeAuthorization`.

## Trust

Credo verifies every credential it receives. medusa's default `trust: 'presented-chain'` makes the root of the X.509 chain carried by the credential its trust anchor: signatures, validity and chain consistency are still checked, but any issuer is accepted. That is the right default for a wallet that exists to test arbitrary issuers. Pass `trust: { certificates: [...] }` to `openWallet` to require specific anchors. DID-signed credentials fall through to Credo's DID resolution.

## Dependency policy

See `SPECS.md` (Frameworks and dependencies). Record here each Credo gap found by an e2e test.

## Known gaps

- The OpenID4VCI Notification Endpoint is not called after storing a credential. capture-wallet advertises one and records `notification_issued`.
- `receive` does not prompt for a tx_code on a TTY; pass `--tx-code`.
- Only `dc+sd-jwt` and `mso_mdoc` responses are stored; W3C formats raise `UnsupportedCredentialError`.
