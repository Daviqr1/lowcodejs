import { injectablesHolder } from 'fastify-decorators';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Env } from '@start/env';

/**
 * Registro dinâmico de dependências (Contract -> Implementation).
 *
 * Espelha `controllers.ts`: varre o filesystem em vez de manter uma lista
 * manual. Convenção única — para cada `<base>-contract.<kind>.ts` o scanner
 * pareia com `<base>.<kind>.ts`:
 *
 *   - Contract  = export nomeado cujo nome casa /Contract(Repository|Service)$/
 *   - Impl      = `export default` do arquivo irmão `<base>.<kind>.ts`
 *
 * Arquivos `in-memory-*`, `*.worker`, drivers (`local-*`/`s3-*`) e `*.schema.ts`
 * nunca colidem: o impl é *derivado* do base do contract, não adivinhado por
 * exclusão. Criar repo/service novo = só seguir a nomenclatura; nada a editar
 * aqui. Para trocar a implementação, troque o arquivo `<base>.<kind>.ts`.
 */

const isDevOrTest = ['development'].includes(Env.NODE_ENV);

const CONTRACT_PATTERN = {
  repository: /-contract\.repository\.(ts|js)$/,
  service: /-contract\.service\.(ts|js)$/,
} as const;

type Kind = keyof typeof CONTRACT_PATTERN;

const CONTRACT_NAME_PATTERN = /Contract(Repository|Service)$/;

async function importModule(path: string): Promise<Record<string, unknown>> {
  return import(path);
}

async function registerFromRoot(root: string, kind: Kind): Promise<number> {
  if (!existsSync(root)) return 0;

  const contractPattern = CONTRACT_PATTERN[kind];
  const files = await readdir(root, { recursive: true });
  const contractFiles = files
    .filter((file) => contractPattern.test(String(file)))
    .sort((a, b) => String(a).localeCompare(String(b)));

  let registered = 0;

  for (const file of contractFiles) {
    const relative = String(file);
    const implPath = join(
      root,
      relative.replace(contractPattern, `.${kind}.$1`),
    );

    if (!existsSync(implPath)) {
      console.warn(`⚠️  DI [${kind}] impl ausente para ${relative}, ignorado`);
      continue;
    }

    const contractModule = await importModule(join(root, relative));
    const Contract = Object.values(contractModule).find(
      (value): value is { name: string } =>
        typeof value === 'function' && CONTRACT_NAME_PATTERN.test(value.name),
    );

    const Implementation = (await importModule(implPath)).default;

    if (!Contract || typeof Implementation !== 'function') {
      console.warn(
        `⚠️  DI [${kind}] par incompleto em ${relative} (contract ou default export ausente), ignorado`,
      );
      continue;
    }

    injectablesHolder.injectService(Contract, Implementation);
    registered += 1;

    if (isDevOrTest) {
      console.info(`✅ DI [${kind}] ${Contract.name} → ${Implementation.name}`);
    }
  }

  return registered;
}

export async function registerDependencies(): Promise<void> {
  const roots: Array<{ root: string; kinds: Kind[] }> = [
    {
      root: join(process.cwd(), 'application/repositories'),
      kinds: ['repository'],
    },
    {
      root: join(process.cwd(), 'application/services'),
      kinds: ['service'],
    },
    {
      root: join(process.cwd(), 'extensions'),
      kinds: ['repository', 'service'],
    },
  ];

  let total = 0;

  for (const { root, kinds } of roots) {
    for (const kind of kinds) {
      total += await registerFromRoot(root, kind);
    }
  }

  if (isDevOrTest) {
    console.info(`✅ ${total} dependências registradas no DI`);
  }
}
