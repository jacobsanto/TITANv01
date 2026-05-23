import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface GoogleToken {
  access_token: string
  refresh_token: string
  expiry?: number
}

// AES-256-GCM encryption using Web Crypto API available in Deno
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(secret.slice(0, 32).padEnd(32, '0')), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('titan-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptToken(token: GoogleToken, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(token))
  )
  const combined = new Uint8Array([...iv, ...new Uint8Array(ciphertext)])
  return btoa(String.fromCharCode(...combined))
}

export async function decryptToken(encrypted: string, secret: string): Promise<GoogleToken> {
  const key = await deriveKey(secret)
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export async function getGoogleToken(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<GoogleToken> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('setting_key', 'google_token')
    .maybeSingle()

  if (error || !data?.setting_value) {
    throw new Error('Google token not found — user must reconnect Google account')
  }

  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = await decryptToken(data.setting_value, secret)
  return refreshIfExpired(token)
}

export async function refreshIfExpired(token: GoogleToken): Promise<GoogleToken> {
  const nowMs = Date.now()
  // Refresh if expiry is within 5 minutes
  if (token.expiry && token.expiry > nowMs + 5 * 60 * 1000) {
    return token
  }
  if (!token.refresh_token) return token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return token // return existing token if refresh fails

  const refreshed = await res.json()
  return {
    access_token: refreshed.access_token,
    refresh_token: token.refresh_token,
    expiry: nowMs + refreshed.expires_in * 1000,
  }
}

export async function driveRequest(
  token: GoogleToken,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${DRIVE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

export async function gmailRequest(
  token: GoogleToken,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${GMAIL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

export interface GeminiResult {
  extracted: Record<string, unknown>
  confidence: number
  raw: string
}

export async function geminiExtract(
  apiKey: string,
  prompt: string,
  base64Content: string,
  mimeType: string
): Promise<GeminiResult> {
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Content } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  }

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let extracted: Record<string, unknown> = {}
  try { extracted = JSON.parse(raw) } catch { /* leave empty */ }

  // Confidence: ratio of non-null fields to total expected fields
  const values = Object.values(extracted)
  const filled = values.filter(v => v !== null && v !== '' && v !== undefined).length
  const confidence = values.length > 0 ? filled / values.length : 0

  return { extracted, confidence, raw }
}

// Download a Drive file as base64
export async function downloadDriveFile(
  token: GoogleToken,
  fileId: string
): Promise<{ base64: string; mimeType: string }> {
  // Get metadata first
  const metaRes = await driveRequest(token, `/files/${fileId}?fields=mimeType,name`)
  if (!metaRes.ok) throw new Error(`Failed to get file metadata: ${metaRes.status}`)
  const meta = await metaRes.json()

  // Download content
  const contentRes = await driveRequest(token, `/files/${fileId}?alt=media`)
  if (!contentRes.ok) throw new Error(`Failed to download file: ${contentRes.status}`)

  const buffer = await contentRes.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

  return { base64, mimeType: meta.mimeType }
}

// Upload a file to Drive
export async function uploadToDrive(
  token: GoogleToken,
  filename: string,
  content: Uint8Array,
  mimeType: string,
  parentFolderId: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = { name: filename, parents: [parentFolderId] }
  const boundary = 'titan_boundary'
  const metaPart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`
  const contentPart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  const ending = `\r\n--${boundary}--`

  const metaBytes = new TextEncoder().encode(metaPart)
  const contentHeaderBytes = new TextEncoder().encode(contentPart)
  const endingBytes = new TextEncoder().encode(ending)

  const body = new Uint8Array([
    ...metaBytes, ...contentHeaderBytes, ...content, ...endingBytes,
  ])

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`)
  return res.json()
}
