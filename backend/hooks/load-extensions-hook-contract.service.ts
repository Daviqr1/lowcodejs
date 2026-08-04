/** Hook `onReady`: carrega o registro de extensoes a partir do filesystem. */
export abstract class LoadExtensionsHookContractService {
  abstract handle(): Promise<void>;
}
