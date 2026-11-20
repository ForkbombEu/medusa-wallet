import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { AskarModule } from '@credo-ts/askar'
import { agentDependencies } from '@credo-ts/node'
import { NativeAskar } from '@openwallet-foundation/askar-nodejs'

const cli = new URL('../src/cli.js', import.meta.url).pathname

function run(args, env, input) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    input,
  })
}

test('CLI validates arguments and wallet configuration', () => {
  assert.match(run(['--help'], {}).stdout, /credential-import/)
  assert.notEqual(run(['unknown'], {}).status, 0)
  assert.notEqual(run(['init', 'extra'], {}).status, 0)
  assert.match(run(['init'], { MEDUSA_WALLET_KEY: '' }).stderr, /MEDUSA_WALLET_KEY/)
  assert.match(run(['init'], { MEDUSA_WALLET_KEY: 'test', MEDUSA_WALLET_ID: '../bad' }).stderr, /MEDUSA_WALLET_ID/)
})

test('wallet persists DIDs and SD-JWT VCs and rejects a wrong key', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'medusa-test-'))
  const env = { MEDUSA_WALLET_DIR: directory, MEDUSA_WALLET_KEY: 'test-wallet-key', MEDUSA_WALLET_ID: 'test' }
  const issuer = new Agent({
    config: { logger: new ConsoleLogger(LogLevel.Off) },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        askar: NativeAskar,
        store: { id: 'issuer', key: 'test-issuer-key', database: { type: 'sqlite', config: { inMemory: true } } },
      }),
    },
  })
  try {
    function success(args, input) {
      const result = run(args, env, input)
      assert.equal(result.status, 0, result.stderr)
      return JSON.parse(result.stdout)
    }

    assert.deepEqual(success(['init']), { wallet: 'test' })
    const { did } = success(['did-create'])
    assert.match(did, /^did:key:/)
    assert.deepEqual(success(['did-list']), [did])
    assert.notEqual(run(['init'], { ...env, MEDUSA_WALLET_KEY: 'wrong' }).status, 0)
    assert.deepEqual(success(['credential-list']), [])
    assert.notEqual(run(['credential-import'], env, 'invalid').status, 0)

    await issuer.initialize()
    const { didState } = await issuer.dids.create({
      method: 'key',
      options: { createKey: { type: { kty: 'OKP', crv: 'Ed25519' } } },
    })
    assert.equal(didState.state, 'finished')
    const issuerDid = didState.did
    const credential = await issuer.sdJwtVc.sign({
      issuer: { method: 'did', didUrl: `${issuerDid}#${issuerDid.split(':')[2]}` },
      payload: { vct: 'https://example.com/credential', name: 'Alice' },
      disclosureFrame: { _sd: ['name'] },
    })
    const { id } = success(['credential-import'], credential.compact)
    assert.deepEqual(success(['credential-list']), [{ id }])
    assert.equal(success(['credential-export', id]).credential, credential.compact)
    assert.deepEqual(success(['credential-delete', id]), { deleted: id })
    assert.deepEqual(success(['credential-list']), [])
    assert.notEqual(run(['credential-export', id], env).status, 0)
  } finally {
    if (issuer.isInitialized) await issuer.shutdown()
    await rm(directory, { recursive: true, force: true })
  }
})
