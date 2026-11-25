import { join } from 'node:path'
import { openWallet, type Wallet } from '@medusa-wallet/core'
import { defaultWalletDir, type Io } from './io.js'

export interface WalletFlags {
  walletDir?: string
  insecureHttp?: boolean
}

export class UsageError extends Error {
  override name = 'UsageError'
}

/** Opens the wallet selected by flags and environment, runs `use`, and always closes it. */
export async function withWallet<T>(io: Io, flags: WalletFlags, use: (wallet: Wallet) => Promise<T>): Promise<T> {
  const key = io.env.MEDUSA_WALLET_KEY
  if (!key) throw new UsageError('MEDUSA_WALLET_KEY must be set to the wallet encryption key')
  const wallet = await openWallet({
    path: join(flags.walletDir ?? defaultWalletDir(io.env), 'wallet.db'),
    key,
    allowInsecureHttp: flags.insecureHttp ?? false,
  })
  try {
    return await use(wallet)
  } finally {
    await wallet.close()
  }
}
