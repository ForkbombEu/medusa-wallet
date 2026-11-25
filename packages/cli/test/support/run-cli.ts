import { run } from '../../src/index.js'

export interface CliResult {
  code: number
  stdout: string
  stderr: string
}

/** Runs the CLI in-process with the given environment, capturing its output. */
export async function runCli(args: string[], env: Record<string, string>, stdin = ''): Promise<CliResult> {
  let stdout = ''
  let stderr = ''
  const code = await run(args, {
    env,
    stdout: (text) => {
      stdout += text
    },
    stderr: (text) => {
      stderr += text
    },
    readStdin: async () => stdin,
  })
  return { code, stdout, stderr }
}
