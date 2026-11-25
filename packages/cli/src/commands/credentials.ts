import { readFile } from 'node:fs/promises'
import type { Credential } from '@medusa-wallet/core'
import type { Command } from 'commander'
import type { Io } from '../io.js'
import { toJson } from '../output.js'
import { type WalletFlags, withWallet } from '../wallet.js'

const summary = ({ id, format, type, issuer, storedAt, expiresAt }: Credential) => ({
  id,
  format,
  type,
  issuer,
  storedAt,
  expiresAt,
})

export function registerCredentials(program: Command, io: Io): void {
  const credentials = program.command('credentials').description('inspect and manage stored credentials')
  const flags = () => program.opts<WalletFlags>()

  credentials
    .command('list')
    .description('list stored credentials')
    .action(async () => {
      const all = await withWallet(io, flags(), (wallet) => wallet.credentials.list())
      io.stdout(toJson(all.map(summary)))
    })

  credentials
    .command('show')
    .description('show a credential with its decoded claims')
    .argument('<id>', 'credential id')
    .option('--raw', 'print only the credential as issued')
    .action(async (id: string, options: { raw?: boolean }) => {
      const credential = await withWallet(io, flags(), (wallet) => wallet.credentials.get(id))
      io.stdout(options.raw ? `${credential.raw}\n` : toJson(credential))
    })

  credentials
    .command('import')
    .description('store a compact SD-JWT VC or base64url mdoc WITHOUT verifying it')
    .argument('[file]', 'file to read; stdin when omitted or "-"')
    .action(async (file?: string) => {
      const raw = !file || file === '-' ? await io.readStdin() : await readFile(file, 'utf8')
      const credential = await withWallet(io, flags(), (wallet) => wallet.credentials.import(raw))
      io.stdout(toJson(summary(credential)))
    })

  credentials
    .command('delete')
    .description('delete a stored credential')
    .argument('<id>', 'credential id')
    .action(async (id: string) => {
      await withWallet(io, flags(), (wallet) => wallet.credentials.delete(id))
      io.stdout(toJson({ deleted: id }))
    })
}
