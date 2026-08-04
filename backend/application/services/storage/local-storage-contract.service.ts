import { StorageContractService } from './storage-contract.service';

/**
 * Driver de filesystem local (`_storage/`). Tem contrato proprio para que o
 * scanner do DI o registre — antes so a fachada `StorageService` era
 * registrada, e os drivers chegavam nela pelo tipo concreto.
 */
export abstract class LocalStorageContractService extends StorageContractService {}
