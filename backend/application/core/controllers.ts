import type { BootstrapConfig } from 'fastify-decorators';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Env } from '@start/env';

type Controllers = Extract<
  BootstrapConfig,
  { controllers: unknown[] }
>['controllers'];

const isDevOrTest = ['development'].includes(Env.NODE_ENV);
const controllerPattern = /^(?!.*\.spec\.).*\.controller\.(ts|js)$/;

async function collectFromRoot(
  root: string,
  controllers: Controllers,
  label: string,
): Promise<void> {
  if (!existsSync(root)) return;

  const files = await readdir(root, { recursive: true });
  const controllerFiles = files
    .filter((file) => controllerPattern.test(String(file)))
    .sort((a, b) => String(a).localeCompare(String(b)));

  for (const file of controllerFiles) {
    const module = await import(join(root, String(file)));
    controllers.push(module.default);

    if (isDevOrTest) {
      console.info(`✅ Controller [${label}] ${file} loaded`);
    }
  }
}

export async function loadControllers(): Promise<Controllers> {
  const controllers: Controllers = [];

  await collectFromRoot(
    join(process.cwd(), 'application/features'),
    controllers,
    'core',
  );

  await collectFromRoot(
    join(process.cwd(), 'extensions'),
    controllers,
    'extension',
  );

  if (isDevOrTest) {
    console.info(`✅ ${controllers.length} controllers loaded`);
  }

  return controllers;
}
