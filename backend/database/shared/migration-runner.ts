/**
 * Esqueleto das migrations de boot, identico nas 29: carregar o `.env`, abrir a
 * conexao (a do sistema e, quando a migration mexe em collection dinamica, a de
 * dados), ler o marker no Setting singleton, pular se ja aplicado, rodar,
 * gravar o marker, fechar a conexao no `finally` e reportar a falha (o
 * `.catch()` de topo que cada migration repetia).
 *
 * Roda como script standalone, fora do kernel — mesmo escape documentado de
 * funcao solta das migrations e do `TaskLogger`.
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from './task-logger';

config({ path: '.env', quiet: true });

export type MigrationContext = {
  /** Database do sistema (`DB_DATABASE`). */
  db: mongoose.mongo.Db;
  /** O mesmo logger que imprime titulo, itens e resumo. */
  logger: TaskLogger;
  /** Database das collections dinamicas; so quando `withDataConnection`. */
  dataDb: mongoose.mongo.Db | null;
  connection: mongoose.Connection;
  dataConnection: mongoose.Connection | null;
  /** `--force` na linha de comando. */
  force: boolean;
};

/**
 * Resumo impresso pelo logger. `keepPending` deixa o marker sem gravar, para a
 * migration reprocessar no proximo boot (usado pela familia relationship
 * quando sobra campo pendente).
 */
export type MigrationOutcome =
  | string
  | { summary: string; keepPending?: boolean };

export async function runMigration(options: {
  title: string;
  /**
   * Campo do Setting singleton, ex.: `MIGRATION_MENU_VISIBILITY_AT`. Quando a
   * migration tem mais de um marker (re-rodadas com escopo diferente), passe a
   * lista: o skip so acontece com todos presentes e a gravacao seta todos.
   */
  marker: string | string[];
  withDataConnection?: boolean;
  run: (context: MigrationContext) => Promise<MigrationOutcome>;
}): Promise<void> {
  const logger = new TaskLogger(options.title);

  const DATABASE_URL = process.env.DATABASE_URL;
  const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
  const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
  const force = process.argv.includes('--force');

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const connection = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await connection.asPromise();

  let dataConnection: mongoose.Connection | null = null;
  if (options.withDataConnection) {
    dataConnection = mongoose.createConnection(DATABASE_URL, {
      dbName: DB_DATA_DATABASE,
    });
    await dataConnection.asPromise();
  }

  const markers = [options.marker].flat();
  const MarkerSchema = new mongoose.Schema(
    Object.fromEntries(
      markers.map((marker) => [marker, { type: Date, default: null }]),
    ),
    { strict: false, collection: 'settings' },
  );
  const Marker = connection.model<Record<string, Date | null | undefined>>(
    'SettingMarker',
    MarkerSchema,
  );

  let failure: unknown = null;

  try {
    const setting = await Marker.findOne({}).lean();
    const appliedAt = setting?.[markers[0]];
    const alreadyDone = markers.every((marker) => setting?.[marker]);

    if (alreadyDone && !force) {
      logger.skipped(appliedAt ?? undefined);
      return;
    }

    logger.running();

    const outcome = await options.run({
      db: connection.db!,
      logger,
      dataDb: dataConnection?.db ?? null,
      connection,
      dataConnection,
      force,
    });

    let summary = outcome;
    let keepPending = false;
    if (typeof outcome !== 'string') {
      summary = outcome.summary;
      keepPending = outcome.keepPending === true;
    }

    logger.done(String(summary));

    if (keepPending) return;

    const now = new Date();
    await Marker.findOneAndUpdate(
      {},
      { $set: Object.fromEntries(markers.map((marker) => [marker, now])) },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    failure = error;
  } finally {
    await connection.close();
    await dataConnection?.close();
  }

  // Reporta depois do `finally` para as conexoes fecharem antes do
  // `process.exit(1)` — o mesmo que o `.catch()` de topo fazia nas migrations.
  if (failure) reportMigrationFailure(options.title, failure);
}

/** Encerra o processo com o log de falha padrao das migrations. */
export function reportMigrationFailure(title: string, error: unknown): never {
  new TaskLogger(title).failed(error);
  process.exit(1);
}
