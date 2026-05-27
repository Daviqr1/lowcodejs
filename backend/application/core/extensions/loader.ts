import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { E_EXTENSION_TYPE, type ValueOf } from '@application/core/entity.core';
import type {
  ExtensionAvailabilityKey,
  ExtensionContractRepository,
} from '@application/repositories/extension/extension-contract.repository';

import { ManifestSchema } from './manifest.schema';

type ExtensionType = ValueOf<typeof E_EXTENSION_TYPE>;

const FOLDER_TO_TYPE: Array<[string, ExtensionType]> = [
  ['plugins', E_EXTENSION_TYPE.PLUGIN],
  ['modules', E_EXTENSION_TYPE.MODULE],
  ['tools', E_EXTENSION_TYPE.TOOL],
];

function resolveExtensionsRoot(): string {
  return join(process.cwd(), 'extensions');
}

async function readDirectoryNames(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export interface LoadExtensionsResult {
  loaded: number;
  invalid: number;
  unavailable: number;
}

export async function loadExtensions(
  repository: ExtensionContractRepository,
): Promise<LoadExtensionsResult> {
  const root = resolveExtensionsRoot();

  if (!existsSync(root)) {
    console.info('[Extensions] Diretório extensions/ não encontrado, pulando.');
    return { loaded: 0, invalid: 0, unavailable: 0 };
  }

  const presentKeys: ExtensionAvailabilityKey[] = [];
  let invalid = 0;

  const pkgs = await readDirectoryNames(root);

  for (const pkg of pkgs) {
    for (const [folderName, type] of FOLDER_TO_TYPE) {
      const typeDir = join(root, pkg, folderName);
      if (!existsSync(typeDir)) continue;

      const extensionDirs = await readDirectoryNames(typeDir);

      for (const extensionId of extensionDirs) {
        const manifestPath = join(typeDir, extensionId, 'manifest.json');
        if (!existsSync(manifestPath)) continue;

        try {
          const raw = JSON.parse(await readFile(manifestPath, 'utf-8'));
          const manifest = ManifestSchema.parse({ ...raw, type });

          if (manifest.id !== extensionId) {
            console.error(
              `[Extensions] Manifest id "${manifest.id}" não bate com a pasta "${extensionId}" em ${manifestPath}`,
            );
            invalid += 1;
            continue;
          }

          await repository.upsert({
            pkg,
            type,
            extensionId,
            name: manifest.name,
            description: manifest.description ?? null,
            version: manifest.version,
            author: manifest.author ?? null,
            icon: manifest.icon ?? null,
            image: manifest.image ?? null,
            slot: manifest.placement?.slot ?? null,
            route: manifest.route ?? null,
            submenu: manifest.tool?.submenu ?? null,
            manifestSnapshot: raw as Record<string, unknown>,
            requires: manifest.requires ?? {},
          });

          presentKeys.push({ pkg, type, extensionId });
        } catch (error) {
          invalid += 1;
          console.error(
            `[Extensions] Manifest inválido em ${manifestPath}:`,
            error,
          );
        }
      }
    }
  }

  const unavailable = await repository.markUnavailableExcept(presentKeys);

  console.info(
    `[Extensions] ${presentKeys.length} carregada(s), ${invalid} inválida(s), ${unavailable} marcada(s) indisponível.`,
  );

  return {
    loaded: presentKeys.length,
    invalid,
    unavailable,
  };
}
