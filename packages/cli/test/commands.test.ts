import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from './support/run-cli.js'

describe('cli commands', () => {
  let dir: string
  let env: Record<string, string>

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-cli-test-'))
    env = { MEDUSA_WALLET_DIR: dir, MEDUSA_WALLET_KEY: 'secret' }
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('lists an empty wallet as a JSON array', async () => {
    expect(await runCli(['credentials', 'list'], env)).toEqual({ code: 0, stdout: '[]\n', stderr: '' })
  })

  it('requires the wallet key from the environment', async () => {
    const result = await runCli(['credentials', 'list'], { MEDUSA_WALLET_DIR: dir })

    expect(result.code).toBe(2)
    expect(result.stderr).toContain('MEDUSA_WALLET_KEY')
  })

  it('reports an unresolvable offer as an operation failure', async () => {
    const result = await runCli(['offer', 'inspect', 'not-an-offer'], env)

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toMatch(/^error: OfferResolutionError: /)
  })

  it('reports an unknown credential id', async () => {
    const result = await runCli(['credentials', 'show', 'missing'], env)

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('CredentialNotFoundError')
  })

  it('rejects an import from stdin that is not a credential', async () => {
    const result = await runCli(['credentials', 'import'], env, 'garbage')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('UnsupportedCredentialError')
  })

  it('exits with a usage error on an unknown command', async () => {
    const result = await runCli(['frobnicate'], env)

    expect(result.code).toBe(2)
    expect(result.stderr).toContain("unknown command 'frobnicate'")
  })
})
