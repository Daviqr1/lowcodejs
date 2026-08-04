import type { Namespace } from 'socket.io';

import { ImportTableSocketContractService } from './import-table-socket-contract.service';

/** Double para specs: o import roda sem namespace, os eventos sao descartados. */
export default class InMemoryImportTableSocketService implements ImportTableSocketContractService {
  init(): Namespace {
    throw new Error('InMemoryImportTableSocketService: init nao suportado');
  }

  namespace(): Namespace | null {
    return null;
  }

  emit(): void {}
}
