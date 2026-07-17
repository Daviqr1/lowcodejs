import { Service } from 'fastify-decorators';

export const CSV_IMPORT_QUEUE_NAME = 'csv-import';

export const CSV_IMPORT_JOB = {
  IMPORT: 'import',
} as const;

export type CsvImportJobName =
  (typeof CSV_IMPORT_JOB)[keyof typeof CSV_IMPORT_JOB];

export type CsvImportJobPayload = {
  slug: string;
  userId: string;
  csvContent: string; // raw CSV string (UTF-8)
};

@Service()
export abstract class CsvImportQueueContractService {
  abstract enqueue(payload: CsvImportJobPayload): Promise<string>;
  abstract close(): Promise<void>;
}
