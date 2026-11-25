import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'

export interface AgentOptions {
  /** SQLite file holding the encrypted Askar store. */
  path: string
  key: string
}

export function createAgent({ path, key }: AgentOptions) {
  return new Agent({
    config: { logger: new ConsoleLogger(LogLevel.Off) },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        askar: askarNodeJS,
        store: { id: 'medusa', key, database: { type: 'sqlite', config: { path } } },
      }),
    },
  })
}
