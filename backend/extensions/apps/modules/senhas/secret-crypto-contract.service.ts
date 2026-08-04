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
export abstract class SecretCryptoContractService {
  /** `null` entra e sai como `null` — campo opcional nao vira ciphertext. */
  abstract encrypt(plain: string | null): string | null;

  /** Devolve `null` quando o valor esta ausente ou a decifragem falha. */
  abstract decrypt(stored: string | null | undefined): string | null;
}
