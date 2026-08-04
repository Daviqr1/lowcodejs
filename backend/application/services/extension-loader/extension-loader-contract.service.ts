export type LoadExtensionsResult = {
  loaded: number;
  invalid: number;
  unavailable: number;
};

/**
 * Carga do registro de extensoes no boot: varre `extensions/`, valida cada
 * `manifest.json` e faz upsert na collection. Manifests que sumiram do disco
 * sao marcados como indisponiveis.
 */
export abstract class ExtensionLoaderContractService {
  abstract load(): Promise<LoadExtensionsResult>;
}
