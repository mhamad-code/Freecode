import { openProfileDb, type KeyValueDB } from './db';
import { Vault } from './vault';

/**
 * Why a key could not be stored. Each code maps to a precise i18n message and
 * a fix, instead of a generic "could not save".
 */
export type VaultFailureCode =
  | 'no-crypto'
  | 'insecure-context'
  | 'keygen'
  | 'no-indexeddb'
  | 'blocked'
  | 'quota'
  | 'write'
  | 'readback';

export class VaultSaveError extends Error {
  readonly code: VaultFailureCode;

  constructor(code: VaultFailureCode, message: string) {
    super(message);
    this.name = 'VaultSaveError';
    this.code = code;
  }
}

const errorName = (err: unknown): string => {
  if (err instanceof DOMException) return err.name;
  if (err instanceof Error) return err.name;
  return '';
};

/** Runs the storage/crypto checks the save path depends on and reports the exact blocker. */
export async function inspectVaultStorage(
  probe = true,
  options: { checkIndexedDb?: boolean } = {},
): Promise<{ ok: true } | { ok: false; code: VaultFailureCode; message: string }> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      ok: false,
      code: typeof window !== 'undefined' && !window.isSecureContext ? 'insecure-context' : 'no-crypto',
      message: 'WebCrypto (crypto.subtle) is unavailable.',
    };
  }
  try {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    if (!key) return { ok: false, code: 'keygen', message: 'Could not generate a vault key.' };
  } catch (err) {
    return { ok: false, code: 'keygen', message: `Could not generate a vault key: ${errorName(err)}` };
  }
  if ((options.checkIndexedDb ?? true) && typeof indexedDB === 'undefined') {
    return { ok: false, code: 'no-indexeddb', message: 'IndexedDB is unavailable.' };
  }
  if (!probe) return { ok: true };
  try {
    const db = await openProfileDb('__vault_probe__');
    await db.put('vaultItems', { id: 'probe', payload: { iv: 'x', ct: 'x' } }, 'probe');
    await db.delete('vaultItems', 'probe');
  } catch (err) {
    const name = errorName(err);
    if (name === 'SecurityError' || /denied|blocked|private/i.test(String(err))) {
      return {
        ok: false,
        code: 'blocked',
        message: 'The browser blocked storage (private mode or blocked site data).',
      };
    }
    if (name === 'QuotaExceededError' || /quota/i.test(String(err))) {
      return { ok: false, code: 'quota', message: 'This device has no storage quota left.' };
    }
    return { ok: false, code: 'write', message: `Could not write to IndexedDB: ${name || String(err)}` };
  }
  return { ok: true };
}

/** Stores a secret and reads it back through a fresh Vault handle (the reload path). */
export async function storeSecret(
  profileId: string,
  id: string,
  value: string,
  deps: { db?: KeyValueDB } = {},
): Promise<void> {
  if (!value) throw new VaultSaveError('write', 'Empty value');
  const check = await inspectVaultStorage(false, { checkIndexedDb: !deps.db });
  if (!check.ok) throw new VaultSaveError(check.code, check.message);
  try {
    const vault = await Vault.open(profileId, deps);
    await vault.put(id, value);
    const readback = await Vault.open(profileId, deps);
    const stored = await readback.get(id);
    if (stored !== value) throw new VaultSaveError('readback', 'The stored value could not be read back.');
  } catch (err) {
    if (err instanceof VaultSaveError) throw err;
    const name = errorName(err);
    if (name === 'SecurityError' || /denied|blocked/i.test(String(err))) {
      throw new VaultSaveError('blocked', 'The browser blocked storage.');
    }
    if (name === 'QuotaExceededError' || /quota/i.test(String(err))) {
      throw new VaultSaveError('quota', 'No storage quota left.');
    }
    throw new VaultSaveError('write', err instanceof Error ? err.message : String(err));
  }
}
