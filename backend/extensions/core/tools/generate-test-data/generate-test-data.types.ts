import type { Either } from '@application/core/either.core';
import type HTTPException from '@application/core/exception.core';

export type GenerateTestDataPayload = {
  tableId: string;
  quantity: number;
};

export type GenerateTestDataResponse = Either<
  HTTPException,
  {
    jobId: string;
    message: string;
  }
>;

export type JobProgress = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed: number;
  total: number;
  error: string | null;
};
