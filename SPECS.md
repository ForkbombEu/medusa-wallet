# Project Specifications

## Selected backend and rationale

Node.js with TypeScript. The wallet is built on Credo-TS (`@credo-ts/*`), the TypeScript library our counterparty capture-wallet also uses, and the consuming tools are TypeScript. Go was not selected: Credo-TS has no Go equivalent for OpenID4VCI/OpenID4VP holder flows.

## Language and runtime versions

- TypeScript 7 (`typescript@7.0.2`), strict, ESM (`module`/`moduleResolution: nodenext`).
- Node.js `latest` via `mise.toml` (the template requires `node = "latest"`); `engines.node >= 22.12`.
- pnpm 11 (`packageManager` in `package.json`, `pnpm = "11"` in `mise.toml`), Task (`task = "latest"`).

## Module or package identity

pnpm workspace `medusa-wallet`:

- `@medusa-wallet/core` (`packages/core`): wallet domain logic.
- `@medusa-wallet/cli` (`packages/cli`): command-line frontend, binary `medusa-wallet`.

## Frameworks and dependencies

- Credo-TS `@credo-ts/{core,node,askar,openid4vc}` pinned to exact stable `0.7.5`. Askar storage through `@openwallet-foundation/askar-nodejs@0.6.1`.
- Upgrade Credo only when an e2e test shows the pinned version lacks a protocol feature; record the gap in `docs/architecture.md`. Interop is defined by the specs in `STANDARDS.md`, not by matching the counterparty's library version.
- CLI: `commander`. Tests: `vitest`. Lint/format: Biome. Dev runner: `tsx`.

## Application architecture

```
packages/cli ──depends on──▶ packages/core ──wraps──▶ Credo-TS
```

- core owns wallet state (keys, credentials), protocol flows and domain types (`Credential`, `Wallet`, ...). It takes configuration as arguments, returns data, and throws typed errors from `packages/core/src/errors.ts`. Credo types never cross its public API (`packages/core/src/index.ts`).
- cli parses argv and environment, calls core, and renders results.

Details: `docs/architecture.md`.

## CLI, web, and API interfaces

CLI only (`medusa-wallet`). No web UI and no API, so `DESIGN.md` branding steps for HTML pages (CREATE_PROJECT steps 5–8) do not apply. Output contract: JSON results on stdout, diagnostics on stderr, non-zero exit code on failure. The CLI prints an ASCII-art header on `--help`. Reference: `docs/cli.md`.

## Configuration

- Wallet storage is a persistent SQLite file (Askar). There is no in-memory/ephemeral mode.
- `MEDUSA_WALLET_KEY`: wallet encryption key, read only from the environment.
- `MEDUSA_WALLET_DIR` or `--wallet-dir` (default `~/.medusa-wallet`) selects the storage directory; the store is `<dir>/wallet.db`.
- `--insecure-http` allows plain-http issuer URLs (core option `allowInsecureHttp`), for a local capture-wallet.
- Issuer trust (core option `trust`) defaults to `presented-chain`: received credentials are verified, but the trust anchor is the root of the chain they carry. A pinned list of certificates is the alternative. See `docs/architecture.md`.
- `CAPTURE_WALLET_URL`: counterparty base URL for e2e tests. e2e suites are skipped when it is unset.

## Build, format, lint, and test commands

| Task                 | Runs                                                          |
| -------------------- | ------------------------------------------------------------- |
| `task install`       | `pnpm install`                                                |
| `task format`        | `biome check --write .`                                       |
| `task lint`          | Biome check, `tsc -p tsconfig.check.json`, `task lint:design` |
| `task test`          | vitest `unit` project                                         |
| `task test:e2e`      | vitest `e2e` project against `CAPTURE_WALLET_URL`             |
| `task build`         | `tsc --build` (emits `packages/*/dist`)                       |
| `task run -- <args>` | the CLI from source                                           |

## Production and Docker execution

Not yet defined: medusa runs as a local CLI. Docker and CI are pending (CREATE_PROJECT step 10).

## Important directories

- `packages/core/src`, `packages/core/test` (`test/support/` holds test-only issuers and helpers).
- `packages/cli/src`, `packages/cli/test`.
- `docs/`: architecture, CLI reference, testing against capture-wallet.
- `handoffs/`: local rolling handoffs (gitignored).

## Generated files

`packages/*/dist`, `*.tsbuildinfo`, `coverage/`, and local `*.db` wallet files are all gitignored. `pnpm-lock.yaml` is generated and committed.

## Repository-specific constraints

- **Boundary:** core never imports `commander` or the cli package and never uses the `process` or `console` globals. cli never imports `@credo-ts/*`, `@openid4vc/*` or `@openwallet-foundation/*`. Biome `noRestrictedImports` / `noRestrictedGlobals` overrides in `biome.json` enforce this. When the CLI needs a Credo capability, add it to core's public API.
- **Source resolution:** workspace packages resolve each other's TypeScript sources through the `medusa-source` export condition (`tsconfig.check.json`, `vitest.config.ts`, the `medusa` script), so development needs no build step. `tsc --build` uses `dist`.
- **Native builds:** pnpm 11 blocks dependency build scripts. Native packages are listed in `allowBuilds` in `pnpm-workspace.yaml` (Askar, koffi, esbuild); `cbor-extract` is denied because cbor-x falls back to JavaScript.
- **Template-owned files** (`AGENTS.md`, `CONTRIBUTING.md`, `DESIGN.md`, `brand/`, `directives/`, `HITL/`, `docs/CREATE_PROJECT.md`) are kept byte-identical to credimi-extras-template and excluded from Biome.
- **Tests:** unit tests in `packages/*/test/*.test.ts`. Flows against a real counterparty go in `*.e2e.test.ts` and assert both what medusa stored and what capture-wallet recorded. Target: an automatic e2e suite that lists capture-wallet's credential issuers and, for each issuer and credential configuration, creates a session and runs it through medusa (see `docs/testing-against-capture-wallet.md`).
- **Delivery:** small PRs, one branch each; ask the maintainer before pushing or opening each PR.
