import { describe, expect, it } from 'vitest';

import { decryptSecret, encryptSecret } from './senhas.crypto';

describe('senhas.crypto (AES-256-GCM)', () => {
  it('faz roundtrip de um segredo', () => {
    const plain = 'S3nh@-muito-secreta!';
    const cipher = encryptSecret(plain);
    expect(cipher).not.toBeNull();
    expect(cipher).not.toBe(plain);
    expect(cipher!.startsWith('enc:v1:')).toBe(true);
    expect(decryptSecret(cipher)).toBe(plain);
  });

  it('gera ciphertext diferente a cada chamada (IV aleatório)', () => {
    const a = encryptSecret('mesmo-valor');
    const b = encryptSecret('mesmo-valor');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('mesmo-valor');
    expect(decryptSecret(b)).toBe('mesmo-valor');
  });

  it('preserva unicode e strings vazias', () => {
    expect(decryptSecret(encryptSecret('café ☕ 中文'))).toBe('café ☕ 中文');
    expect(decryptSecret(encryptSecret(''))).toBe('');
  });

  it('tolera null/undefined', () => {
    expect(encryptSecret(null)).toBeNull();
    expect(encryptSecret(undefined)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });

  it('devolve valores legados em claro sem quebrar', () => {
    expect(decryptSecret('texto-em-claro-legado')).toBe(
      'texto-em-claro-legado',
    );
  });

  it('detecta adulteração do ciphertext (GCM authTag)', () => {
    const cipher = encryptSecret('integridade')!;
    const parts = cipher.split(':');
    // corrompe 1 byte do ciphertext (último segmento)
    const corruptedData = Buffer.from(parts[4], 'base64');
    corruptedData[0] ^= 0xff;
    parts[4] = corruptedData.toString('base64');
    const tampered = parts.join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
