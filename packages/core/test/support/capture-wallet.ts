import {
  type AuthorizationServerMetadata,
  type CredentialConfigurationMetadata,
  type Flow,
  flowsFor,
  unsupportedReason,
} from './issuer-matrix.js'

/** Minimal client for capture-wallet's session API, used by e2e tests to create flows and read evidence. */
export const captureWalletUrl = process.env.CAPTURE_WALLET_URL?.replace(/\/$/, '')

export interface IssuanceSessionOptions {
  issuer_configuration_id: string
  credential_configuration_id: string
  flow?: Flow
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

/** capture-wallet's browser page for an issuance session: what the issuer saw, live. */
export function sessionPageUrl(sessionId: string): string {
  return `${baseUrl()}/ui/sessions/${encodeURIComponent(sessionId)}`
}

/** Creates a session and prints its browser page, so a run can be inspected in capture-wallet's UI. */
export async function createIssuanceSession(options: IssuanceSessionOptions): Promise<IssuanceSession> {
  const session = await json<IssuanceSession>(
    await fetch(`${baseUrl()}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(options),
    }),
  )
  // biome-ignore lint/suspicious/noConsole: printing the session page is the point, so runs can be inspected in a browser.
  console.log(`capture-wallet session ${session.session_id}: ${sessionPageUrl(session.session_id)}`)
  return session
}

export async function getSession(sessionId: string): Promise<IssuanceSession> {
  return json(await fetch(`${baseUrl()}/sessions/${sessionId}`))
}

export async function getSessionEvents(sessionId: string): Promise<CaptureEvent[]> {
  return json(await fetch(`${baseUrl()}/sessions/${sessionId}/events`))
}

export interface CaptureIssuer {
  id: string
  credential_issuer: string
  credential_issuer_metadata: string
  authorization_server_metadata: string
  credential_configuration_ids: string[]
}

export interface IssuerCase {
  issuerId: string
  credentialIssuer: string
  configurationId: string
  configuration: CredentialConfigurationMetadata
  flow: Flow
  skipReason: string | undefined
}

export async function listIssuers(): Promise<CaptureIssuer[]> {
  return json(await fetch(`${baseUrl()}/issuers`))
}

/** Every issuer × credential configuration × flow capture-wallet publishes, classified by `unsupportedReason`. */
export async function discoverIssuerCases(): Promise<IssuerCase[]> {
  const cases: IssuerCase[] = []
  for (const issuer of await listIssuers()) {
    const [issuerMetadata, authorizationServerMetadata] = await Promise.all([
      json<{ credential_configurations_supported: Record<string, CredentialConfigurationMetadata> }>(
        await fetch(issuer.credential_issuer_metadata),
      ),
      json<AuthorizationServerMetadata>(await fetch(issuer.authorization_server_metadata)),
    ])
    const flows = flowsFor(authorizationServerMetadata)
    for (const configurationId of issuer.credential_configuration_ids) {
      const configuration = issuerMetadata.credential_configurations_supported[configurationId]
      if (!configuration) throw new Error(`${issuer.id} lists ${configurationId} but its metadata does not define it`)
      for (const flow of flows) {
        cases.push({
          issuerId: issuer.id,
          credentialIssuer: issuer.credential_issuer,
          configurationId,
          configuration,
          flow,
          skipReason: unsupportedReason(configuration, flow),
        })
      }
    }
  }
  return cases
}
