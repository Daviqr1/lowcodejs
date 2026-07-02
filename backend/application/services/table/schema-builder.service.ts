/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type {
  IField,
  IGroupConfiguration,
  ITableSchema,
  ValueOf,
} from '@application/core/entity.core';
import {
  E_FIELD_TYPE,
  E_RELATIONSHIP_STORAGE,
  E_SCHEMA_TYPE,
} from '@application/core/entity.core';
import { RelationshipStorage } from '@application/services/relationship/relationship.service';

import { FieldGroupBuilderContractService } from './field-group-builder-contract.service';
import MongooseFieldGroupBuilder from './field-group-builder.service';
import { SchemaBuilderContractService } from './schema-builder-contract.service';

@Service()
export default class MongooseSchemaBuilder implements SchemaBuilderContractService {
  // Seam puro/stateless da fatia FIELD_GROUP. Em producao o DI injeta o impl
  // registrado; o default mantem a construcao manual (e2e specs) funcionando sem
  // wiring extra. Como o seam nao tem estado nem dependencias, ambos sao
  // equivalentes em comportamento.
  constructor(
    private readonly fieldGroup: FieldGroupBuilderContractService = new MongooseFieldGroupBuilder(),
  ) {}

  private static readonly FieldTypeMapper: Record<
    keyof typeof E_FIELD_TYPE,
    ValueOf<typeof E_SCHEMA_TYPE>
  > = {
    [E_FIELD_TYPE.TEXT_SHORT]: E_SCHEMA_TYPE.STRING,
    [E_FIELD_TYPE.TEXT_LONG]: E_SCHEMA_TYPE.STRING,
    [E_FIELD_TYPE.DROPDOWN]: E_SCHEMA_TYPE.STRING,
    [E_FIELD_TYPE.FILE]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.DATE]: E_SCHEMA_TYPE.DATE,
    [E_FIELD_TYPE.RELATIONSHIP]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.FIELD_GROUP]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.EVALUATION]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.REACTION]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.CATEGORY]: E_SCHEMA_TYPE.STRING,
    [E_FIELD_TYPE.USER]: E_SCHEMA_TYPE.OBJECT_ID,

    // NATIVE
    [E_FIELD_TYPE.IDENTIFIER]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.CREATOR]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.CREATED_AT]: E_SCHEMA_TYPE.DATE,
    [E_FIELD_TYPE.UPDATED_AT]: E_SCHEMA_TYPE.DATE,
    [E_FIELD_TYPE.UPDATER]: E_SCHEMA_TYPE.OBJECT_ID,
    [E_FIELD_TYPE.TRASHED_AT]: E_SCHEMA_TYPE.DATE,
    [E_FIELD_TYPE.STATUS]: E_SCHEMA_TYPE.STRING,

    // HTML_CONTENT e display-only — nao grava dados em row
    [E_FIELD_TYPE.HTML_CONTENT]: E_SCHEMA_TYPE.STRING,
  };

  // Schema do path RELATIONSHIP por role. OWNS_FK grava FK single na propria row
  // (populate nativo). REVERSE/PIVOT (e fallback legado) declaram array
  // transiente — vazio em disco, preenchido so pelo hydrate na leitura. O role e
  // derivado do proprio `field.relationship` (sem lookup no DB).
  private relationshipSchema(field: IField): ITableSchema {
    const FieldTypeMapper = MongooseSchemaBuilder.FieldTypeMapper;
    const ref = field?.relationship?.table?._id?.toString() ?? undefined;
    const role = RelationshipStorage.roleOfField(field);

    if (role === E_RELATIONSHIP_STORAGE.OWNS_FK) {
      return {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: false,
          ref,
        },
      };
    }

    return {
      [field.slug]: [
        {
          type: FieldTypeMapper[field.type] || 'String',
          required: false,
          ref,
        },
      ],
    };
  }

  private mapperSchema(
    field: IField,
    groups?: IGroupConfiguration[],
  ): ITableSchema {
    const FieldTypeMapper = MongooseSchemaBuilder.FieldTypeMapper;

    const mapper = {
      [E_FIELD_TYPE.TEXT_SHORT]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.TEXT_LONG]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.DROPDOWN]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: Boolean(field.required || false),
          },
        ],
      },

      [E_FIELD_TYPE.FILE]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: Boolean(field.required || false),
            ref: 'Storage',
          },
        ],
      },

      // RELATIONSHIP nao usa `required` no schema: a obrigatoriedade por endpoint
      // e enforcada no use-case via RowPayloadValidator. A forma do path depende
      // do storage role (FK single para OWNS_FK; array transiente p/ REVERSE/PIVOT).
      [E_FIELD_TYPE.RELATIONSHIP]: this.relationshipSchema(field),

      [E_FIELD_TYPE.FIELD_GROUP]: this.fieldGroup.buildEmbeddedSchema(
        field,
        groups,
      ),

      [E_FIELD_TYPE.DATE]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'Date',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.CATEGORY]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: Boolean(field.required || false),
          },
        ],
      },

      [E_FIELD_TYPE.EVALUATION]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'Number',
            required: false,
            ref: 'Evaluation',
          },
        ],
      },

      [E_FIELD_TYPE.REACTION]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: false,
            ref: 'Reaction',
          },
        ],
      },

      [E_FIELD_TYPE.USER]: {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: Boolean(field.required || false),
            ref: 'User',
          },
        ],
      },

      // NATIVE
      [E_FIELD_TYPE.IDENTIFIER]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.CREATOR]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
          ref: 'User',
        },
      },

      [E_FIELD_TYPE.CREATED_AT]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'Date',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.UPDATED_AT]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'Date',
          required: Boolean(field.required || false),
        },
      },

      [E_FIELD_TYPE.UPDATER]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
          ref: 'User',
        },
      },

      [E_FIELD_TYPE.STATUS]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
          default: 'published',
        },
      },

      [E_FIELD_TYPE.TRASHED_AT]: {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'Date',
          required: Boolean(field.required || false),
          default: null,
        },
      },
    };

    if (!(field.type in mapper) && !field?.multiple) {
      return {
        [field.slug]: {
          type: FieldTypeMapper[field.type] || 'String',
          required: Boolean(field.required || false),
        },
      };
    }

    if (!(field.type in mapper) && field?.multiple) {
      return {
        [field.slug]: [
          {
            type: FieldTypeMapper[field.type] || 'String',
            required: Boolean(field.required || false),
          },
        ],
      };
    }

    // Os guardas `field.type in mapper` acima garantem a chave; o TS não
    // estreita a chave do índice a partir do operador `in`.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return mapper[field.type as keyof typeof mapper];
  }

  build(fields: IField[], groups?: IGroupConfiguration[]): ITableSchema {
    const schema: ITableSchema = {};

    for (const field of fields) {
      if (
        field.type === E_FIELD_TYPE.IDENTIFIER ||
        field.type === E_FIELD_TYPE.CREATED_AT ||
        field.type === E_FIELD_TYPE.UPDATED_AT ||
        field.type === E_FIELD_TYPE.HTML_CONTENT
      ) {
        continue;
      }
      Object.assign(schema, this.mapperSchema(field, groups));
    }

    return schema;
  }
}
