/**
 * DEV SEED — usuários de teste para validar bulk actions (status em lote).
 *
 * NÃO é executado automaticamente no boot (não termina em `.seed.ts`, logo o
 * `main.ts` não o descobre). Rode manualmente:
 *
 *   npm run seed:test-users            # cria 25 usuários demo
 *   npm run seed:test-users -- --count=50
 *
 * Idempotente: apaga e recria todos os usuários `*@demo.com` a cada execução.
 * Todos compartilham a mesma senha: Teste@123
 *
 * Status e grupos são variados (mistura ACTIVE/INACTIVE e
 * REGISTERED/MANAGER/ADMINISTRATOR) para exercitar a edição em massa.
 *
 * Variáveis de ambiente necessárias: DATABASE_URL, DB_DATABASE
 */

import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import mongoose from 'mongoose';

config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const PASSWORD = 'Teste@123';
const EMAIL_DOMAIN = '@demo.com';

function parseCount(): number {
  const arg = process.argv.find((a) => a.startsWith('--count='));
  const value = arg ? Number(arg.split('=')[1]) : 25;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 25;
}

async function main(): Promise<void> {
  if (!DATABASE_URL) throw new Error('DATABASE_URL ausente no .env');

  const count = parseCount();
  await mongoose.connect(DATABASE_URL, { dbName: DB_DATABASE });
  const db = mongoose.connection.db;
  if (!db) throw new Error('Conexão Mongo sem db');

  const groups = await db
    .collection('user-groups')
    .find({}, { projection: { slug: 1 } })
    .toArray();
  const bySlug = new Map<string, mongoose.Types.ObjectId>(
    groups.map((g) => [String(g.slug), g._id as mongoose.Types.ObjectId]),
  );

  // Distribuição de grupos (peso maior em REGISTERED), só os que existem.
  const groupPool = [
    'REGISTERED',
    'REGISTERED',
    'REGISTERED',
    'MANAGER',
    'MANAGER',
    'ADMINISTRATOR',
  ].filter((slug) => bySlug.has(slug));

  if (groupPool.length === 0) {
    throw new Error(
      'Nenhum grupo encontrado (rode `npm run seed` antes para criar os grupos)',
    );
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  // Limpa execuções anteriores (idempotente).
  const removed = await db
    .collection('users')
    .deleteMany({ email: { $regex: EMAIL_DOMAIN.replace('.', '\\.') + '$' } });

  const docs = Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    const slug = groupPool[i % groupPool.length];
    return {
      name: `Usuário Demo ${n}`,
      email: `demo${n}${EMAIL_DOMAIN}`,
      password: hash,
      // ~1/3 inativos para testar ativar/desativar em lote
      status: i % 3 === 0 ? 'INACTIVE' : 'ACTIVE',
      group: bySlug.get(slug),
      trashed: false,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  const inserted = await db.collection('users').insertMany(docs);

  console.info(
    `✅ Seed dev: removidos ${removed.deletedCount} demo antigos, criados ${inserted.insertedCount} usuários ${EMAIL_DOMAIN} (senha: ${PASSWORD})`,
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[seed:test-users][error]:', error);
  await mongoose.disconnect();
  process.exit(1);
});
