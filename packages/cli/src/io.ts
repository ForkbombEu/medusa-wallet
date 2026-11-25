import { homedir } from 'node:os'

/** Everything the CLI takes from or gives to the process, injectable for tests. */
export interface Io {
  env: Record<string, string | undefined>
  stdout(text: string): void
  stderr(text: string): void
  readStdin(): Promise<string>
}

export const processIo: Io = {
  env: process.env,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  async readStdin() {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
    return Buffer.concat(chunks).toString('utf8')
  },
}

export const defaultWalletDir = (env: Io['env']) => env.MEDUSA_WALLET_DIR || `${env.HOME || homedir()}/.medusa-wallet`
