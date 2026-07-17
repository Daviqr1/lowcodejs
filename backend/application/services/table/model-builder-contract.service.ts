import type mongoose from 'mongoose';

import type { ITable, Optional } from '@application/core/entity.core';

import type { Entity } from './model-builder.service';

export abstract class ModelBuilderContractService {
  abstract build(
    table: Optional<
      ITable,
      '_id' | 'createdAt' | 'updatedAt' | 'trashed' | 'trashedAt'
    >,
  ): Promise<mongoose.Model<Entity>>;
}
