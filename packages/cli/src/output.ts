// mdoc claims can hold CBOR bytes, maps and big integers; render them as plain JSON.
function toJsonValue(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) return Buffer.from(value).toString('base64url')
  if (value instanceof Map) return Object.fromEntries(value)
  if (typeof value === 'bigint') return value.toString()
  return value
}

export const toJson = (value: unknown): string => `${JSON.stringify(value, toJsonValue, 2)}\n`
