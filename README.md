# medusa-wallet

A headless EUDI-ARF holder wallet for testing and conformance. It receives credentials over OpenID4VCI and presents them over OpenID4VP. You drive it from a CLI or from code, and it shows every protocol step.

Built in TypeScript on [Credo](https://github.com/openwallet-foundation/credo-ts). The wallet logic (`@medusa-wallet/core`) is a library; the CLI (`@medusa-wallet/cli`) is a thin frontend on top of it.

> Status: early development. See [docs/architecture.md](docs/architecture.md) for the target design.

## Quick start

Requires Node.js ≥ 22.12 and pnpm 11 (`mise install` sets both up).

```sh
pnpm install
pnpm medusa --help
```

## Development

```sh
pnpm lint        # Biome
pnpm typecheck   # tsc over sources and tests
pnpm test        # unit tests (vitest)
pnpm test:e2e    # flows against capture-wallet; needs CAPTURE_WALLET_URL
pnpm build       # emit dist/ for each package
```

- [Architecture](docs/architecture.md)
- [CLI reference](docs/cli.md)
- [Testing against capture-wallet](docs/testing-against-capture-wallet.md)
- [Agent instructions](AGENTS.md)
