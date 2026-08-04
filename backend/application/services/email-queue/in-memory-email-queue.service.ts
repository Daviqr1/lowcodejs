import { InMemoryQueueBase } from '@application/services/queue-worker/in-memory-queue.base';

import {
  EmailQueueContractService,
  type EmailJobPayload,
} from './email-queue-contract.service';

export default class InMemoryEmailQueueService
  extends InMemoryQueueBase<EmailJobPayload>
  implements EmailQueueContractService {}
