/**
 * Tipos do módulo Senhas (apps/modules/senhas).
 *
 * Modelado a partir do Forum (canais + mensagens), porém:
 * - "mensagens" viram "entradas de senha" (PasswordEntry) cifradas em repouso;
 * - canais são privados por padrão (passbolt-like).
 */

export type IPasswordUserRef = {
  _id: string;
  name: string;
  email: string;
};

/** Canal (vault) — agrupa entradas de senha e controla quem acessa. */
export type IPasswordChannel = {
  _id: string;
  name: string;
  description: string | null;
  private: boolean;
  owner: IPasswordUserRef | string;
  members: Array<IPasswordUserRef | string>;
  entriesCount?: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Entrada de senha. `secret` e `notes` são devolvidos JÁ DECIFRADOS para
 * membros autorizados; no banco vivem apenas como ciphertext.
 */
export type IPasswordEntry = {
  _id: string;
  channel: string;
  title: string;
  username: string | null;
  url: string | null;
  secret: string;
  notes: string | null;
  author: IPasswordUserRef | string;
  createdAt: string;
  updatedAt: string;
};

export type CreateChannelInput = {
  name: string;
  description?: string | null;
  private?: boolean;
  members?: Array<string>;
};

export type UpdateChannelInput = {
  name?: string;
  description?: string | null;
  private?: boolean;
  members?: Array<string>;
};

export type CreateEntryInput = {
  title: string;
  username?: string | null;
  url?: string | null;
  secret: string;
  notes?: string | null;
};

export type UpdateEntryInput = {
  title?: string;
  username?: string | null;
  url?: string | null;
  secret?: string;
  notes?: string | null;
};
