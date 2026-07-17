import type {
  IEmbeddedSchema,
  ISchema,
  ITable,
  ITableSchema,
} from '@application/core/entity.core';

/**
 * Constroi uma copia da tabela com TODOS os campos marcados como
 * `required: false`, usada exclusivamente pelo auto-save para persistir
 * rascunhos parciais sem disparar os validators de obrigatoriedade do Mongoose.
 *
 * O core (`schema-builder`/`model-builder`) permanece intocado: a tabela
 * original continua gerando o schema com `required` real para create/update
 * normais. Como `buildTable` reconstroi o model a cada chamada, este schema
 * relaxado vive apenas durante a request do auto-save.
 */
export class DraftTable {
  private static isEmbeddedSchemaArray(
    value: ISchema | ISchema[] | IEmbeddedSchema[],
  ): value is IEmbeddedSchema[] {
    return Array.isArray(value) && value[0]?.type === 'Embedded';
  }

  private static relaxTableSchema(schema: ITableSchema): void {
    for (const value of Object.values(schema)) {
      if (DraftTable.isEmbeddedSchemaArray(value)) {
        for (const entry of value) {
          entry.required = false;
          DraftTable.relaxTableSchema(entry.schema);
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

  static from(table: ITable): ITable {
    const draft = structuredClone(table);
    // Sentinel: força cache miss no ModelBuilder. O cache usa updatedAt como
    // versão; um timestamp diferente garante que o draft model (required: false
    // em todos os campos) nunca reutilize o model original (required: true).
    draft.updatedAt = new Date(0);

    if (draft._schema) {
      DraftTable.relaxTableSchema(draft._schema);
    }

    if (Array.isArray(draft.groups)) {
      for (const group of draft.groups) {
        if (Array.isArray(group.fields)) {
          for (const field of group.fields) {
            field.required = false;
          }
        }

        if (group._schema) {
          DraftTable.relaxTableSchema(group._schema);
        }
      }
    }

    return draft;
  }
}
