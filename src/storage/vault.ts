import { openProfileDb, type KeyValueDB } from './db';

export interface EncryptedPayload {
  iv: string;
  ct: string;
}

export const PBKDF2_ITERATIONS = 600000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toB64(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out);
}

export function fromB64(value: string): Uint8Array {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptText(key: CryptoKey, text: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(text),
  );
  return { iv: toB64(iv), ct: toB64(new Uint8Array(cipher)) };
}

export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(payload.iv) as unknown as BufferSource },
    key,
    fromB64(payload.ct) as unknown as BufferSource,
  );
  return decoder.decode(plain);
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase) as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface Verifier {
  salt: string;
  iterations: number;
  check: EncryptedPayload;
}

export async function createVerifier(
  passphrase: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<Verifier> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt, iterations);
  const check = await encryptText(key, 'freecode-vault');
  return { salt: toB64(salt), iterations, check };
}

/** Returns the derived key when the passphrase matches, otherwise null. */
export async function verifyPassphrase(
  passphrase: string,
  verifier: Verifier,
): Promise<CryptoKey | null> {
  const key = await deriveKey(passphrase, fromB64(verifier.salt), verifier.iterations);
  try {
    const text = await decryptText(key, verifier.check);
    return text === 'freecode-vault' ? key : null;
  } catch {
    return null;
  }
}

interface VaultItem {
  id: string;
  payload: EncryptedPayload;
}

export class Vault {
  private constructor(
    private readonly db: KeyValueDB,
    private readonly key: CryptoKey,
  ) {}

  static async open(profileId: string): Promise<Vault> {
    const db = await openProfileDb(profileId);
    const stored = (await db.get('vaultKeys', 'master')) as CryptoKey | undefined;
    if (stored) return new Vault(db, stored);
    const key = await generateVaultKey();
    await db.put('vaultKeys', key, 'master');
    return new Vault(db, key);
  }

  async put(id: string, value: string): Promise<void> {
    const payload = await encryptText(this.key, value);
    await this.db.put('vaultItems', { id, payload } satisfies VaultItem, id);
  }

  async get(id: string): Promise<string | undefined> {
    const record = (await this.db.get('vaultItems', id)) as VaultItem | undefined;
    if (!record) return undefined;
    return decryptText(this.key, record.payload);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete('vaultItems', id);
  }

  async list(prefix: string): Promise<{ id: string; value: string }[]> {
    const all = (await this.db.getAll('vaultItems')) as VaultItem[];
    const out: { id: string; value: string }[] = [];
    for (const item of all) {
      if (item.id.startsWith(prefix)) {
        out.push({ id: item.id, value: await decryptText(this.key, item.payload) });
      }
    }
    return out;
  }

  async status(): Promise<{ mode: 'device'; items: number }> {
    const all = (await this.db.getAll('vaultItems')) as VaultItem[];
    return { mode: 'device', items: all.length };
  }
}
