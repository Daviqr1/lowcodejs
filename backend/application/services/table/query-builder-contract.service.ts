import type { SortOrder } from 'mongoose';
import type mongoose from 'mongoose';

import type {
  IField,
  IGroupConfiguration,
} from '@application/core/entity.core';

import type { Query, QueryOrder } from './query-builder.service';

export abstract class QueryBuilderContractService {
  abstract build(
    payload: Partial<Query>,
    fields?: IField[],
    groups?: IGroupConfiguration[],
    tableSlug?: string,
    conn?: mongoose.Connection,
  ): Promise<Query>;

  abstract order(
    query: Partial<QueryOrder>,
    fields?: IField[],
    tableOrder?: { field: string; direction: 'asc' | 'desc' } | null,
  ): { [key: string]: SortOrder };

  abstract normalize(search: string): string;
}
