import { glob } from 'glob';
import mongoose from 'mongoose';
import path from 'path';

import { MongooseConnect } from '@config/database.config';

const FILENAME_PATTERN = /^\d{10,}-[a-z0-9-]+\.seed\.(ts|js)$/;

async function discoverSeeders(): Promise<string[]> {
  const base = process.cwd().replace(/\\/g, '/');
  const [ts, js] = await Promise.all([
    glob(base + '/database/seeders/*.seed.ts'),
    glob(base + '/database/seeders/*.seed.js'),
  ]);
  return [...ts, ...js].sort((a, b) => a.localeCompare(b));
}

function validateFilenames(paths: string[]): void {
  const invalid: string[] = [];
  for (const fullPath of paths) {
    const filename = path.basename(fullPath);
    if (!FILENAME_PATTERN.test(filename)) {
      invalid.push(filename);
    }
  }
  if (invalid.length > 0) {
    throw new Error(
      `Seeders com nome fora do padrão '<timestamp>-<nome>.seed.(ts|js)':\n` +
        invalid.map((name) => `  - ${name}`).join('\n'),
    );
  }
}

async function seed(): Promise<void> {
  const started = Date.now();
  await MongooseConnect();
  try {
    const seeders = await discoverSeeders();
    validateFilenames(seeders);

    let ok = 0;

    for (const seederPath of seeders) {
      try {
        const { default: run } = await import(seederPath);
        await run();
        ok++;
      } catch (err) {
        console.error(`  ✗ ${path.basename(seederPath)} — falhou`);
        console.error(err);
        throw err;
      }
    }

    const elapsed = Date.now() - started;
    console.info(`✓ ${ok}/${seeders.length} seeders em ${elapsed}ms`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch(() => process.exit(1));
