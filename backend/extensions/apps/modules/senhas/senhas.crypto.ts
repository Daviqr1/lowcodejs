import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import { Env } from '@start/env';

/**
 * Criptografia simétrica AES-256-GCM para os segredos do módulo Senhas.
 *
 * Objetivo: "se invadirem o banco, não acessam nada". Os campos sensíveis
 * (senha e anotações) são gravados apenas como ciphertext. A chave NUNCA vive
 * no banco — é derivada de `PASSWORDS_ENCRYPTION_KEY` (ou, em dev, do
 * `COOKIE_SECRET`) por SHA-256, produzindo 32 bytes determinísticos.
 *
 * Formato persistido: `enc:v1:<ivBase64>:<authTagBase64>:<cipherBase64>`.
 * GCM autentica o conteúdo: adulteração no banco quebra a decifragem.
 *
 * NOTA: não é criptografia ponta-a-ponta (E2E). O servidor vê o plaintext em
 * runtime para exibir o segredo a um membro autorizado. O requisito atendido é
 * proteção em repouso (dump do Mongo = ilegível sem a chave).
 */

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'enc:v1';
const IV_BYTES = 12; // recomendado para GCM

function getKey(): Buffer {
  const secret = Env.PASSWORDS_ENCRYPTION_KEY ?? Env.COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      'Chave de criptografia ausente: defina PASSWORDS_ENCRYPTION_KEY (ou COOKIE_SECRET).',
    );
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

function isEncrypted(value: string): boolean {
  return value.startsWith(`${VERSION}:`);
}

/**
 * Cifra um texto. Retorna `null` quando a entrada é `null`/`undefined`.
 * Strings vazias são cifradas normalmente (preserva o valor "vazio explícito").
 */
export function encryptSecret(
  plaintext: string | null | undefined,
): string | null {
  if (plaintext === null || plaintext === undefined) return null;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decifra um valor previamente cifrado por {@link encryptSecret}.
 * Tolerante: `null`/`undefined` → `null`; valores não cifrados (legado/plaintext)
 * são devolvidos como estão, para não quebrar leitura de dados antigos.
 */
export function decryptSecret(
  payload: string | null | undefined,
): string | null {
  if (payload === null || payload === undefined) return null;
  if (!isEncrypted(payload)) return payload;

  const [, , ivB64, tagB64, dataB64] = payload.split(':');
  // `dataB64` pode ser string vazia (ciphertext de um plaintext vazio) — por
  // isso checamos `undefined` (segmento ausente), não falsy.
  if (ivB64 === undefined || tagB64 === undefined || dataB64 === undefined) {
    return payload;
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
