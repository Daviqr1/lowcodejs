import { Service } from 'fastify-decorators';

import type {
  IEmbeddedSchema,
  ISchema,
  ITable,
  ITableSchema,
} from '@application/core/entity.core';

import { DraftTableContractService } from './draft-table-contract.service';

@Service()
export default class DraftTableService implements DraftTableContractService {
  private isEmbeddedSchemaArray(
    value: ISchema | ISchema[] | IEmbeddedSchema[],
  ): value is IEmbeddedSchema[] {
    return Array.isArray(value) && value[0]?.type === 'Embedded';
  }

  private relaxTableSchema(schema: ITableSchema): void {
    for (const value of Object.values(schema)) {
      if (this.isEmbeddedSchemaArray(value)) {
        for (const entry of value) {
          entry.required = false;
          this.relaxTableSchema(entry.schema);
        }
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          entry.required = false;
        }
        continue;
      }

      value.required = false;
    }
  }

  from(table: ITable): ITable {
    const draft = structuredClone(table);
    // Sentinel: força cache miss no ModelBuilder. O cache usa updatedAt como
    // versão; um timestamp diferente garante que o draft model (required: false
    // em todos os campos) nunca reutilize o model original (required: true).
    draft.updatedAt = new Date(0);

    if (draft._schema) {
      this.relaxTableSchema(draft._schema);
    }

    if (Array.isArray(draft.groups)) {
      for (const group of draft.groups) {
        if (Array.isArray(group.fields)) {
          for (const field of group.fields) {
            field.required = false;
          }
        }

        if (group._schema) {
          this.relaxTableSchema(group._schema);
        }
      }
    }

    return draft;
  }
}
