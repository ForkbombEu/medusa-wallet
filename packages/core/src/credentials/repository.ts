import { type Agent, Mdoc, MdocRecord, RecordNotFoundError, SdJwtVcRecord } from '@credo-ts/core'
import { CredentialNotFoundError, UnsupportedCredentialError } from '../errors.js'
import { decodeMdocRecord, decodeSdJwtVcRecord } from './decode.js'
import type { Credential } from './types.js'

export interface CredentialRepository {
  list(): Promise<Credential[]>
  get(id: string): Promise<Credential>
  delete(id: string): Promise<void>
  /**
   * Stores a credential obtained outside an issuance flow. The signature, issuer
   * trust, validity and status are NOT checked: medusa is a test instrument.
   */
  import(raw: string): Promise<Credential>
}

export function createCredentialRepository(agent: Agent): CredentialRepository {
  // Credo keeps each format in its own record type; ids are UUIDs, unique across both.
  async function findRecord(id: string): Promise<SdJwtVcRecord | MdocRecord> {
    for (const lookup of [() => agent.sdJwtVc.getById(id), () => agent.mdoc.getById(id)]) {
      try {
        return await lookup()
      } catch (error) {
        if (!(error instanceof RecordNotFoundError)) throw error
      }
    }
    throw new CredentialNotFoundError(id)
  }

  const decode = (record: SdJwtVcRecord | MdocRecord): Credential =>
    record instanceof SdJwtVcRecord ? decodeSdJwtVcRecord(record) : decodeMdocRecord(record)

  return {
    async list() {
      const records = [...(await agent.sdJwtVc.getAll()), ...(await agent.mdoc.getAll())]
      return records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map(decode)
    },

    async get(id) {
      return decode(await findRecord(id))
    },

    async delete(id) {
      const record = await findRecord(id)
      if (record instanceof SdJwtVcRecord) await agent.sdJwtVc.deleteById(id)
      else await agent.mdoc.deleteById(id)
    },

    async import(raw) {
      const input = raw.trim()
      // A compact SD-JWT always contains the `~` disclosure separator; base64url IssuerSigned never does.
      if (input.includes('~')) {
        let record: SdJwtVcRecord
        try {
          record = SdJwtVcRecord.fromSdJwtVc(agent.sdJwtVc.fromCompact(input))
        } catch (cause) {
          throw new UnsupportedCredentialError('Input looks like an SD-JWT but could not be parsed', { cause })
        }
        return decodeSdJwtVcRecord(await agent.sdJwtVc.store({ record }))
      }
      let record: MdocRecord
      try {
        record = MdocRecord.fromMdoc(Mdoc.fromBase64Url(input))
      } catch (cause) {
        throw new UnsupportedCredentialError('Input is neither a compact SD-JWT VC nor a base64url mdoc', { cause })
      }
      return decodeMdocRecord(await agent.mdoc.store({ record }))
    },
  }
}
