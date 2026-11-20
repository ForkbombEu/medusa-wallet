# medusa-wallet

A headless Credo-TS wallet for test and conformance workflows. The CLI stores
keys, DIDs and SD-JWT VC credentials in an encrypted local Askar SQLite wallet.

## Setup

Requires Node.js 22.12 or newer and npm.

```sh
npm ci
export MEDUSA_WALLET_KEY='replace-with-a-strong-secret'
npm link
medusa-wallet init
```

Use the same secret to reopen the wallet; losing it makes the wallet inaccessible.
Provide it through a secure environment or secret manager, not a command-line
argument. `MEDUSA_WALLET_ID` defaults to `default`; set it to select another
wallet. `MEDUSA_WALLET_DIR` defaults to `~/.medusa-wallet` and must not contain
`?` or `#`. The wallet is created automatically if it does not exist. Protect
the wallet directory and back it up securely.

## Commands

Successful commands return JSON on stdout; errors go to stderr with a non-zero
exit code. `medusa-wallet --help` lists the commands.

```sh
medusa-wallet did-create
medusa-wallet did-list
medusa-wallet credential-import < credential.sdjwt
medusa-wallet credential-list
medusa-wallet credential-export <record-id>
medusa-wallet credential-delete <record-id>
```

Import parses and stores an SD-JWT VC **without verifying its signature, issuer,
expiry, or status**. Only import credentials from a trusted source and verify
them separately before relying on them. Export includes the full credential and
its disclosures; protect the output. This CLI does not implement credential
issuance, presentation, or DIDComm/OpenID4VC exchange.

Credo's transitive PEX dependencies currently include versions affected by
[GHSA-f9j6-8p6x-r9j6](https://github.com/advisories/GHSA-f9j6-8p6x-r9j6).
This CLI does not use PEX, but should be used for testing rather than as a
production credential-verification service.
