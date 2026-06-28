const ITERATIONS = 600000
const SCHEMA_VERSION = 1

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes.buffer as ArrayBuffer
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  salt: string
  iv: string
  ciphertext: string
  schemaVersion: number
}

export interface ExportData {
  schemaVersion: number
  exportedAt: number
  data: {
    patient: Record<string, unknown>[]
    medicine: Record<string, unknown>[]
    doseRecord: Record<string, unknown>[]
    vitalsRecord: Record<string, unknown>[]
  }
}

export async function encryptData(data: ExportData, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer
  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer
  const key = await deriveKey(password, salt)

  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  return {
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    ciphertext: bufToHex(ciphertext),
    schemaVersion: SCHEMA_VERSION,
  }
}

export async function decryptData(
  payload: EncryptedPayload,
  password: string,
): Promise<ExportData> {
  const salt = hexToBuf(payload.salt)
  const iv = hexToBuf(payload.iv)
  const ciphertext = hexToBuf(payload.ciphertext)
  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decrypted)) as ExportData
}
