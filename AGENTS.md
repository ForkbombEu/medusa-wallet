# medusa-wallet

A headless EUDI-ARF **holder** wallet in TypeScript. It exists to exercise issuers (OpenID4VCI 1.0) and verifiers (OpenID4VP 1.0 + DCQL), and to make their behaviour observable from scripts and tests. It is a test instrument: prefer explicit, inspectable behaviour (surface the counterparty's raw error body, expose every protocol knob) over polished UX or production hardening.

## Layout and the boundary

- `packages/core` (`@medusa-wallet/core`) holds all wallet domain logic, built on Credo (`@credo-ts/*`). Its public API is `src/index.ts`; Credo types stay behind it and are mapped to medusa domain types.
- `packages/cli` (`@medusa-wallet/cli`) is a thin commander adapter: parse arguments, call core, render the result.

The boundary is one-way: the CLI depends on core and speaks only core's public API, and core takes all configuration as arguments and returns data. This keeps core usable from tests and other frontends. Biome's `noRestrictedImports` / `noRestrictedGlobals` overrides in `biome.json` enforce it. When the CLI needs something Credo can do, add it to core's public API and call that.

## Conventions

- Credo is pinned to an exact **stable** release. Move to a newer or pre-release version only when an e2e test proves the current one lacks a protocol feature, and record that gap in `docs/architecture.md`.
- Workspace packages resolve each other's TypeScript sources through the `medusa-source` export condition (set in `tsconfig.check.json`, `vitest.config.ts` and the `medusa` script), so no build is needed during development. `tsc --build` uses `dist`.
- pnpm 11 blocks dependency build scripts. Add native packages (e.g. Askar) to `allowBuilds` in `pnpm-workspace.yaml`.
- Core errors are typed classes from `packages/core/src/errors.ts` that carry the counterparty's response.
- Write tests first. Unit tests live in `packages/*/test/*.test.ts`; flows against a real counterparty live in `*.e2e.test.ts`.
- Deliver small PRs, each on its own branch. Ask the maintainer before opening each PR.

A change is done when `pnpm lint && pnpm typecheck && pnpm test` passes, and, for protocol changes, `pnpm test:e2e` passes against capture-wallet.

## Docs

- `docs/architecture.md`: read it before adding a core module or changing the public API.
- `docs/testing-against-capture-wallet.md`: read it before writing or running e2e tests, or when debugging an issuer or verifier flow.
- `docs/cli.md`: the command reference. Update it in the same PR as any CLI change.

## Specs

OpenID4VCI 1.0, OpenID4VP 1.0 (DCQL), SD-JWT VC (`dc+sd-jwt`), ISO 18013-5 mdoc (`mso_mdoc`), OAuth 2.0 DPoP / PAR / PKCE, the EUDI ARF and HAIP. When behaviour is ambiguous, cite the spec section in the code comment or test name.
