import { InMemoryQueueBase } from '@application/services/queue-worker/in-memory-queue.base';

import {
  CsvImportQueueContractService,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';

export default class InMemoryCsvImportQueueService
  extends InMemoryQueueBase<CsvImportJobPayload>
  implements CsvImportQueueContractService {}
