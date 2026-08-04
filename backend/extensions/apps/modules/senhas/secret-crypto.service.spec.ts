import { describe, expect, it } from 'vitest';

import SecretCryptoService from './secret-crypto.service';

describe('senhas.crypto (AES-256-GCM)', () => {
  const sut = new SecretCryptoService();

  it('faz roundtrip de um segredo', () => {
    const plain = 'S3nh@-muito-secreta!';
    const cipher = sut.encrypt(plain);
    expect(cipher).not.toBeNull();
    expect(cipher).not.toBe(plain);
    expect(cipher!.startsWith('enc:v1:')).toBe(true);
    expect(sut.decrypt(cipher)).toBe(plain);
  });

  it('gera ciphertext diferente a cada chamada (IV aleatório)', () => {
    const a = sut.encrypt('mesmo-valor');
    const b = sut.encrypt('mesmo-valor');
    expect(a).not.toBe(b);
    expect(sut.decrypt(a)).toBe('mesmo-valor');
    expect(sut.decrypt(b)).toBe('mesmo-valor');
  });

  it('preserva unicode e strings vazias', () => {
    expect(sut.decrypt(sut.encrypt('café ☕ 中文'))).toBe('café ☕ 中文');
    expect(sut.decrypt(sut.encrypt(''))).toBe('');
  });

  it('tolera null/undefined', () => {
    expect(sut.encrypt(null)).toBeNull();
    expect(sut.encrypt(undefined)).toBeNull();
    expect(sut.decrypt(null)).toBeNull();
  });

  it('devolve valores legados em claro sem quebrar', () => {
    expect(sut.decrypt('texto-em-claro-legado')).toBe('texto-em-claro-legado');
  });

  it('detecta adulteração do ciphertext (GCM authTag)', () => {
    const cipher = sut.encrypt('integridade')!;
    const parts = cipher.split(':');
    // corrompe 1 byte do ciphertext (último segmento)
    const corruptedData = Buffer.from(parts[4], 'base64');
    corruptedData[0] ^= 0xff;
    parts[4] = corruptedData.toString('base64');
    const tampered = parts.join(':');
    expect(() => sut.decrypt(tampered)).toThrow();
  });
});
