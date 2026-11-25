import type { Command } from 'commander'
import type { Io } from '../io.js'
import { toJson } from '../output.js'
import { type WalletFlags, withWallet } from '../wallet.js'

export function registerOffer(program: Command, io: Io): void {
  const offer = program.command('offer').description('work with OpenID4VCI credential offers')

  offer
    .command('inspect')
    .description('resolve an offer and its issuer metadata without requesting anything')
    .argument('<offer>', 'credential offer URI (openid-credential-offer://, eu-eaa-offer://, haip-vci://)')
    .action(async (uri: string) => {
      const resolved = await withWallet(io, program.opts<WalletFlags>(), (wallet) => wallet.issuance.resolveOffer(uri))
      io.stdout(toJson(resolved))
    })

  program
    .command('receive')
    .description('receive the credentials of an offer (pre-authorized code flow) and store them')
    .argument('<offer>', 'credential offer URI')
    .option('--tx-code <code>', 'transaction code, when the offer requires one')
    .option('--config <id...>', 'request only these credential configuration ids')
    .action(async (uri: string, options: { txCode?: string; config?: string[] }) => {
      const credentials = await withWallet(io, program.opts<WalletFlags>(), async (wallet) =>
        wallet.issuance.receivePreAuthorized(await wallet.issuance.resolveOffer(uri), {
          ...(options.txCode !== undefined && { txCode: options.txCode }),
          ...(options.config && { credentialConfigurationIds: options.config }),
        }),
      )
      io.stdout(toJson(credentials))
    })
}
