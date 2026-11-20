#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { Agent, ConsoleLogger, LogLevel, SdJwtVcRecord } from '@credo-ts/core'
import { AskarModule } from '@credo-ts/askar'
import { agentDependencies } from '@credo-ts/node'
import { NativeAskar } from '@openwallet-foundation/askar-nodejs'

const usage = `Usage: medusa-wallet <command>

Commands:
  init                     Create or open the wallet
  did-create               Create a did:key
  did-list                 List created DIDs
  credential-import        Read an SD-JWT VC from stdin and store it (unverified)
  credential-list          List stored SD-JWT VC record IDs
  credential-export <id>   Export a stored SD-JWT VC
  credential-delete <id>   Delete a stored SD-JWT VC

Set MEDUSA_WALLET_KEY to the wallet encryption key.
Optionally set MEDUSA_WALLET_ID and MEDUSA_WALLET_DIR.`

async function main(args) {
  const [command, ...parameters] = args
  if ((command === '--help' || command === '-h') && parameters.length === 0) {
    console.log(usage)
    return
  }

  const parameterCounts = {
    init: 0,
    'did-create': 0,
    'did-list': 0,
    'credential-import': 0,
    'credential-list': 0,
    'credential-export': 1,
    'credential-delete': 1,
  }
  if (!Object.hasOwn(parameterCounts, command) || parameters.length !== parameterCounts[command] || parameters.some((p) => !p)) {
    throw new Error(usage)
  }

  const key = process.env.MEDUSA_WALLET_KEY
  if (!key) throw new Error('MEDUSA_WALLET_KEY must be set to a non-empty wallet encryption key')
  const id = process.env.MEDUSA_WALLET_ID ?? 'default'
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('MEDUSA_WALLET_ID may contain only letters, numbers, underscores, and hyphens')
  const directory = resolve(process.env.MEDUSA_WALLET_DIR || join(homedir(), '.medusa-wallet'))
  if (/[?#]/.test(directory)) throw new Error('MEDUSA_WALLET_DIR cannot contain ? or #')
  process.umask(0o077)
  await mkdir(directory, { recursive: true, mode: 0o700 })

  const agent = new Agent({
    config: { logger: new ConsoleLogger(LogLevel.Off) },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        askar: NativeAskar,
        store: { id, key, database: { type: 'sqlite', config: { path: join(directory, `${id}.db`) } } },
      }),
    },
  })

  try {
    await agent.initialize()
  } catch (error) {
    throw new Error(`Could not initialize wallet: ${error.cause?.message ?? error.message}`)
  }
  try {
    let result
    switch (command) {
      case 'init':
        result = { wallet: id }
        break
      case 'did-create': {
        const { didState } = await agent.dids.create({
          method: 'key',
          options: { createKey: { type: { kty: 'OKP', crv: 'Ed25519' } } },
        })
        if (didState.state !== 'finished') throw new Error(`DID creation failed: ${didState.reason}`)
        result = { did: didState.did }
        break
      }
      case 'did-list':
        result = (await agent.dids.getCreatedDids()).map(({ did }) => did)
        break
      case 'credential-import': {
        const compact = readFileSync(0, 'utf8').trim()
        if (!compact) throw new Error('Expected an SD-JWT VC on stdin')
        const credential = agent.sdJwtVc.fromCompact(compact)
        const record = await agent.sdJwtVc.store({ record: SdJwtVcRecord.fromSdJwtVc(credential) })
        result = { id: record.id }
        break
      }
      case 'credential-list':
        result = (await agent.sdJwtVc.getAll()).map(({ id }) => ({ id }))
        break
      case 'credential-export':
        result = { credential: (await agent.sdJwtVc.getById(parameters[0])).encoded }
        break
      case 'credential-delete':
        await agent.sdJwtVc.deleteById(parameters[0])
        result = { deleted: parameters[0] }
        break
    }
    console.log(JSON.stringify(result))
  } finally {
    await agent.shutdown()
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
