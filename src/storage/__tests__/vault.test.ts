import { describe, expect, it } from 'vitest';
import {
  createVerifier,
  decryptText,
  deriveKey,
  encryptText,
  generateVaultKey,
  verifyPassphrase,
} from '../vault';
import { Redactor } from '../../engine/redact';

describe('vault crypto', () => {
  it('round-trips a secret with AES-GCM', async () => {
    const key = await generateVaultKey();
    const payload = await encryptText(key, 'sk-secret-value');
    expect(payload.ct).not.toContain('sk-secret-value');
    expect(await decryptText(key, payload)).toBe('sk-secret-value');
  });

  it('fails to decrypt with a different key', async () => {
    const a = await generateVaultKey();
    const b = await generateVaultKey();
    const payload = await encryptText(a, 'hello');
    await expect(decryptText(b, payload)).rejects.toBeDefined();
  });

  it('accepts the right passphrase and rejects the wrong one', async () => {
    const verifier = await createVerifier('correct horse', 1000);
    const good = await verifyPassphrase('correct horse', verifier);
    expect(good).not.toBeNull();
    const bad = await verifyPassphrase('wrong horse', verifier);
    expect(bad).toBeNull();
    const derived = await deriveKey('correct horse', new Uint8Array(16), 1000);
    expect(derived.type).toBe('secret');
  });
});

describe('redactor', () => {
  it('masks exact secrets and patterns', () => {
    const redactor = new Redactor();
    redactor.add('mysecretvalue');
    expect(redactor.redact('token=mysecretvalue')).toBe('token=[redacted]');
    expect(redactor.redact('ghp_abcdefghijklmnopqrstuvwxyz')).toBe('[redacted]');
    expect(redactor.redact('Authorization: Bearer abcdefghijklmnop')).toContain('[redacted]');
  });

  it('ignores secret values shorter than six characters', () => {
    const redactor = new Redactor();
    redactor.add('abc');
    expect(redactor.redact('abc')).toBe('abc');
  });

  it('redacts nested values', () => {
    const redactor = new Redactor();
    redactor.add('supersecret');
    expect(redactor.redactValue({ a: ['supersecret'], b: 1 })).toEqual({
      a: ['[redacted]'],
      b: 1,
    });
  });
});
