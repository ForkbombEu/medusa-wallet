# medusa-wallet

A headless EUDI-ARF holder wallet for testing issuers and verifiers.

Testing a credential issuer or verifier normally means a phone, a wallet app, and someone tapping through screens. That is slow, hard to repeat, and hides what went over the wire. medusa is a wallet you drive from a terminal or from code instead: every exchange can be scripted, repeated in CI, and inspected.

Main functionalities:

- a persistent, encrypted credential store (SQLite through Askar) holding SD-JWT VC (`dc+sd-jwt`) and mdoc (`mso_mdoc`) credentials, decoded into readable claims;
- receiving credentials over OpenID4VCI 1.0 (in progress);
- presenting credentials over OpenID4VP 1.0 with DCQL (planned);
- automated runs against [capture-wallet](https://capture-wallet.credimi.io), Credimi's test issuer and verifier (in progress).

## Technical specs

- **TypeScript** on Node.js, as a pnpm workspace of two packages:
  - `@medusa-wallet/core`: the wallet domain library. It wraps Credo-TS and exposes medusa's own types.
  - `@medusa-wallet/cli`: the `medusa-wallet` command, a thin frontend over core.
- **[Credo-TS](https://github.com/openwallet-foundation/credo-ts)** 0.7.5 provides protocols, credential formats and key management. **Askar** provides encrypted storage and the KMS.
- **commander** for the CLI, **vitest** for tests, **Biome** for lint and format, **Task** + **mise** for the developer harness.

See [SPECS.md](SPECS.md) for the full specification, [STANDARDS.md](STANDARDS.md) for the standards targeted, and [docs/](docs/) for architecture and testing guides.

## How to run

Requires [mise](https://mise.jdx.dev), which installs Node.js, pnpm and Task.

```sh
mise install
task install
task run -- --help        # run the CLI from source
task lint && task test    # validate
task build                # emit packages/*/dist
```

E2E tests run against capture-wallet:

```sh
CAPTURE_WALLET_URL=https://capture-wallet.credimi.io task test:e2e
```

## CLI examples

| Function     | Example                 |
| ------------ | ----------------------- |
| Show help    | `task run -- --help`    |
| Show version | `task run -- --version` |

## License

[Apache-2.0](LICENSE)
