/** Minimal client for capture-wallet's session API, used by e2e tests to create flows and read evidence. */
export const captureWalletUrl = process.env.CAPTURE_WALLET_URL?.replace(/\/$/, '')

export interface IssuanceSessionOptions {
  issuer_configuration_id: string
  credential_configuration_id: string
  flow?: 'pre_authorized_code' | 'authorization_code'
  credential_offer_mode?: 'credential_offer' | 'credential_offer_uri'
}

export interface IssuanceSession {
  session_id: string
  deeplink: string
  status: string
}

export interface CaptureEvent {
  at: string
  type: string
  detail: Record<string, unknown>
}

function baseUrl(): string {
  if (!captureWalletUrl) throw new Error('CAPTURE_WALLET_URL is not set')
  return captureWalletUrl
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`capture-wallet ${response.url}: HTTP ${response.status} ${await response.text()}`)
  return (await response.json()) as T
}

export async function createIssuanceSession(options: IssuanceSessionOptions): Promise<IssuanceSession> {
  return json(
    await fetch(`${baseUrl()}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(options),
    }),
  )
}

export async function getSession(sessionId: string): Promise<IssuanceSession> {
  return json(await fetch(`${baseUrl()}/sessions/${sessionId}`))
}

export async function getSessionEvents(sessionId: string): Promise<CaptureEvent[]> {
  return json(await fetch(`${baseUrl()}/sessions/${sessionId}/events`))
}
