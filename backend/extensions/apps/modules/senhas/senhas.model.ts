import mongoose from 'mongoose';

/**
 * Models Mongoose dedicados do módulo Senhas (DB de sistema).
 *
 * - `password_channels`: canais/vaults. Privados por padrão (`private: true`).
 * - `password_entries`: entradas de senha. Os campos `secret` e `notes` são
 *   gravados CIFRADOS (ver senhas.crypto.ts) — o schema só vê ciphertext.
 *
 * Guard `mongoose.models?.X || mongoose.model(...)` evita re-registro em dev
 * (hot reload), igual aos demais models de extensão (ver doc-transcription).
 */

const ObjectId = mongoose.Schema.Types.ObjectId;

const PasswordChannelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    // Privado por padrão (passbolt-like). Público = visível a qualquer usuário
    // autenticado (somente leitura para não-membros).
    private: { type: Boolean, default: true },
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    members: { type: [{ type: ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true },
);

const PasswordEntrySchema = new mongoose.Schema(
  {
    channel: {
      type: ObjectId,
      ref: 'PasswordChannel',
      required: true,
      index: true,
    },
    // Metadados em claro (necessários para listar/buscar/exibir).
    title: { type: String, required: true, trim: true },
    username: { type: String, default: null },
    url: { type: String, default: null },
    // Campos sensíveis: persistidos como ciphertext AES-256-GCM.
    secret: { type: String, required: true },
    notes: { type: String, default: null },
    author: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

type ChannelDoc = mongoose.InferSchemaType<typeof PasswordChannelSchema>;
type EntryDoc = mongoose.InferSchemaType<typeof PasswordEntrySchema>;

export const PasswordChannelModel: mongoose.Model<ChannelDoc> =
  mongoose?.models?.PasswordChannel ||
  mongoose.model<ChannelDoc>(
    'PasswordChannel',
    PasswordChannelSchema,
    'password_channels',
  );

export const PasswordEntryModel: mongoose.Model<EntryDoc> =
  mongoose?.models?.PasswordEntry ||
  mongoose.model<EntryDoc>(
    'PasswordEntry',
    PasswordEntrySchema,
    'password_entries',
  );
