# CLI reference

Binary: `medusa-wallet`. In this repo, run it from source with `pnpm medusa <args>`.

## Output contract

- Results go to **stdout** as JSON, so they can be piped to `jq`.
- Logs, progress and errors go to **stderr**.
- Exit code `0` means success; any failure exits non-zero, and errors include the counterparty's response where there is one.

## Global options

| Option          | Description                     |
| --------------- | ------------------------------- |
| `-V, --version` | print the CLI and core versions |
| `-h, --help`    | show help                       |

## Commands

None yet. `offer inspect`, `receive` and `credentials` arrive with the OpenID4VCI pre-authorized flow. Document each command here in the same PR that adds it.
