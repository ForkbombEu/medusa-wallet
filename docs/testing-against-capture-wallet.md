# Testing against capture-wallet

[capture-wallet](https://capture-wallet.credimi.io) ([source](https://github.com/ForkbombEu/credimi-capture-wallet)) is medusa's reference counterparty. Despite the name it is **not a wallet**: it is a stateful OpenID4VCI 1.0 issuer and OpenID4VP 1.0 verifier that records what the wallet sent, for conformance testing. No PID is needed beforehand; it issues the Credimi Demo PID itself.

## Pointing medusa at it

E2E tests read `CAPTURE_WALLET_URL` and are skipped when it is unset. CI sets it to the hosted instance, so every pull request and every push to `main` runs the e2e suite against `https://capture-wallet.credimi.io`.

```sh
# hosted
CAPTURE_WALLET_URL=https://capture-wallet.credimi.io pnpm test:e2e

# local (in a credimi-capture-wallet checkout)
pnpm install && cp env.example .env
pnpm capture-services init --services-base-url http://localhost:8080 --data-dir ./data \
  --credential-configuration-id urn:eu.europa.ec.eudi:pid:1
pnpm dev                       # serves http://localhost:8080
CAPTURE_WALLET_URL=http://localhost:8080 pnpm test:e2e   # back in medusa
```

## Driving a flow

Create a session, hand the `deeplink` to medusa, then read what the service captured:

```sh
curl -s -X POST "$CAPTURE_WALLET_URL/sessions" -H 'Content-Type: application/json' -d '{
  "issuer_configuration_id": "eu-pid-jwt-proof-only",
  "credential_configuration_id": "<id from the issuer metadata>",
  "flow": "pre_authorized_code"
}' | jq -r .deeplink

curl -s "$CAPTURE_WALLET_URL/sessions/<session_id>/events"   # what medusa sent
```

- List the credential configuration IDs from `$CAPTURE_WALLET_URL/.well-known/openid-credential-issuer/issuers/<issuer_configuration_id>`. A configuration must belong to the selected issuer.
- `flow` defaults to `authorization_code`. Its authorization server **auto-approves** valid requests, so medusa completes it headless. It requires PAR, PKCE S256 and DPoP.
- `credential_offer_mode: "credential_offer_uri"` makes the deeplink carry a URI to fetch instead of the embedded offer. Test both modes.
- Presentation sessions: `POST /openid4vp/sessions`, then the evidence at `/openid4vp/sessions/<id>/events`.
- The full API reference is at `$CAPTURE_WALLET_URL/docs`.

## Issuers and what they demand

| `issuer_configuration_id`       | Proof                                     | Notes                                 |
| ------------------------------- | ----------------------------------------- | ------------------------------------- |
| `eu-pid-jwt-proof-only`         | `jwt` with `header.jwk`                   | Start here: no key attestation needed |
| `eu-pid-jwt-key-attestation`    | `jwt` + `header.key_attestation`          | Needs key attestation                 |
| `eu-pid-device-bound` (default) | `jwt` + key attestation, or `attestation` | Needs key attestation                 |
| `attestbook-experimental`       | `jwt` + key attestation, or `attestation` | Experimental; needs key attestation   |

Wallet attestation client auth (`attest_jwt_client_auth`) is optional; anonymous pre-authorized token requests are accepted. The service trusts the last certificate in an attestation's `x5c` chain, so self-signed test attesters work.

## Automatic per-issuer suite

`packages/core/test/issuers.e2e.test.ts` discovers what to test instead of hardcoding it:

1. `GET /issuers` lists the issuers. Each entry carries `credential_configuration_ids` and its metadata URLs.
2. The issuer metadata gives each configuration's format and proof types. The authorization server's `grant_types_supported` gives the flows (`pre_authorized_code`, `authorization_code`).
3. Each issuer × configuration × flow becomes its own test. It creates a session with `POST /sessions`, runs the deeplink through medusa core, then asserts:
   - what medusa stored: format and type (`vct` / `doctype`)
   - the session status `credential_issued`
   - the last Credo issuer state `Completed`

`unsupportedReason` in `packages/core/test/support/issuer-matrix.ts` decides from the metadata which combinations medusa cannot run yet. Those are reported as skipped, with the reason in the test name. The skip list doubles as the backlog:

```sh
CAPTURE_WALLET_URL=https://capture-wallet.credimi.io pnpm vitest run --project e2e --reporter=verbose packages/core
# ↓ … urn:eu.europa.ec.eudi:pid:1.sd-jwt.key-attestation-required via pre_authorized_code: key attestation not implemented
# ✓ … urn:eu.europa.ec.eudi:pid:1.mdoc.jwt-proof via pre_authorized_code
```

A new issuer or configuration on capture-wallet is covered with no test changes. When medusa gains a capability (auth code, key attestation), relax the matching rule in `unsupportedReason` and its unit test, and the suite starts running those combinations.

## Writing an e2e test

Name it `*.e2e.test.ts`. Assert both sides: what medusa stored (the decoded claims) and what capture-wallet recorded in `/events`. Assert on the session status rather than on log text.
