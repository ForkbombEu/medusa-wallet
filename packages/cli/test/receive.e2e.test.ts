import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { captureWalletUrl, createIssuanceSession, getSession } from '../../core/test/support/capture-wallet.js'
import { runCli } from './support/run-cli.js'

describe.skipIf(!captureWalletUrl)('medusa-wallet receive against capture-wallet', () => {
  let dir: string
  let env: Record<string, string>
  const httpFlags = captureWalletUrl?.startsWith('http://') ? ['--insecure-http'] : []

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'medusa-cli-e2e-'))
    env = { MEDUSA_WALLET_DIR: dir, MEDUSA_WALLET_KEY: 'e2e' }
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('receives a PID, persists it, and shows its claims', async () => {
    const session = await createIssuanceSession({
      issuer_configuration_id: 'eu-pid-jwt-proof-only',
      credential_configuration_id: 'urn:eu.europa.ec.eudi:pid:1.sd-jwt.jwt-proof',
      flow: 'pre_authorized_code',
    })

    const received = await runCli([...httpFlags, 'receive', session.deeplink], env)
    expect(received.stderr).toBe('')
    expect(received.code).toBe(0)
    const [credential] = JSON.parse(received.stdout) as Array<{ id: string; type: string }>
    expect(credential?.type).toBe('urn:eudi:pid:1')
    expect((await getSession(session.session_id)).status).toBe('credential_issued')

    // A fresh process opens the same SQLite wallet and finds the credential.
    const listed = JSON.parse((await runCli(['credentials', 'list'], env)).stdout) as Array<{ id: string }>
    expect(listed.map(({ id }) => id)).toEqual([credential?.id])

    const shown = JSON.parse((await runCli(['credentials', 'show', credential?.id ?? ''], env)).stdout)
    expect(shown.claims).toEqual(expect.objectContaining({ family_name: expect.any(String) }))
  })
})
