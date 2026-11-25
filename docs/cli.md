# CLI reference

Binary: `medusa-wallet`. In this repo, run it from source with `task run -- <args>` (or `pnpm medusa <args>`).

## Output contract

- Results go to **stdout** as JSON (`credentials show --raw` prints the raw credential). mdoc byte values are rendered as base64url.
- Errors go to **stderr** as `error: <ErrorName>: <message>`. Issuer error bodies follow as JSON under `response`.
- Exit codes: `0` success, `1` the operation failed (issuer rejected, credential not found, ...), `2` usage error (bad arguments, missing `MEDUSA_WALLET_KEY`).

## Configuration

| Setting            | Source                                      | Default            |
| ------------------ | ------------------------------------------- | ------------------ |
| Wallet key         | `MEDUSA_WALLET_KEY` (environment only)      | required           |
| Wallet directory   | `--wallet-dir <dir>` or `MEDUSA_WALLET_DIR` | `~/.medusa-wallet` |
| Plain-http issuers | `--insecure-http`                           | off                |

The wallet is a persistent SQLite file, `<wallet-dir>/wallet.db`, created on first use. Issuer X.509 chains are trusted as presented (see `docs/architecture.md`, Trust).

## Commands

| Command                                                 | Description                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `offer inspect <offer>`                                 | Resolve an offer and its issuer metadata without requesting anything                       |
| `receive <offer> [--tx-code <code>] [--config <id...>]` | Run the pre-authorized code flow and store every credential returned                       |
| `credentials list`                                      | List stored credentials (id, format, type, issuer, dates)                                  |
| `credentials show <id> [--raw]`                         | Show a credential with decoded claims, or print it as issued                               |
| `credentials import [file]`                             | Store a compact SD-JWT VC or base64url mdoc from a file or stdin, **without verification** |
| `credentials delete <id>`                               | Delete a stored credential                                                                 |

Offers are accepted by value or by reference, with the schemes `openid-credential-offer://`, `eu-eaa-offer://` and `haip-vci://`. The authorization-code flow is not supported yet.
