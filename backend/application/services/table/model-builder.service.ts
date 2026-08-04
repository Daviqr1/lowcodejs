import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import type {
  IField,
  IGroupConfiguration,
  IRow,
  ITable,
  Merge,
  Optional,
} from '@application/core/entity.core';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';
import type { FieldDefinition } from '@application/services/script-execution/script-execution.types';
import { getDataConnection } from '@config/database.config';

import { ModelBuilderContractService } from './model-builder-contract.service';
import { SchemaBuilderContractService } from './schema-builder-contract.service';

export type Entity = Merge<
  Merge<Omit<IRow, '_id'>, mongoose.Document>,
  { _id: mongoose.Types.ObjectId }
>;

type BuildTable = Optional<
  ITable,
  '_id' | 'createdAt' | 'updatedAt' | 'trashed' | 'trashedAt'
>;

@Service()
export default class MongooseModelBuilder implements ModelBuilderContractService {
  constructor(
    private readonly schema: SchemaBuilderContractService,
    private readonly scriptExecution: ScriptExecutionContractService,
  ) {}

  /**
   * Cache dos models dinamicos compilados, por `table._id`. Sem isto, cada
   * listagem de rows recompilava o schema (com closures dos hooks) — e o
   * populate-builder recompila por relacionamento/depth — fazendo o heap
   * crescer ate OOM. Reusa o model enquanto a `version` bater; so recompila
   * quando a tabela muda (novo `updatedAt`/assinatura do schema).
   */
  private static readonly modelCache = new Map<
    string,
    { version: string; model: mongoose.Model<Entity> }
  >();

  /**
   * Assinatura barata do que afeta o schema compilado. Prefere `updatedAt`
   * (edicao de campo/grupo persiste `_schema` no doc Table e bumpa updatedAt);
   * cai para uma assinatura derivada quando o timestamp nao vem no payload.
   */
  private static signature(table: BuildTable): string {
    if (table.updatedAt) return `t:${String(table.updatedAt)}`;
    return `s:${JSON.stringify({
      _schema: table._schema,
      groups: table.groups,
      methods: table.methods,
      slug: table.slug,
    })}`;
  }

  /**
   * Maps IField array to FieldDefinition array for sandbox execution
   * Includes all necessary data for each field type
   */
  private static mapFieldsForSandbox(fields: IField[]): FieldDefinition[] {
    return fields.map((f) => ({
      slug: f.slug,
      type: f.type,
      name: f.name,
      multiple: f.multiple ?? false,
      ...(f.relationship && { relationship: f.relationship }),
      ...(f.group && { group: f.group }),
      ...(f.dropdown?.length && { dropdown: f.dropdown }),
      ...(f.category?.length && { category: f.category }),
    }));
  }

  async build(table: BuildTable): Promise<mongoose.Model<Entity>> {
    if (!table?.slug) throw new Error('Table slug not found');

    if (!table?._schema) throw new Error('Table schema not found');

    const conn = getDataConnection();

    const modelName = table._id?.toString();
    if (!modelName) throw new Error('Table _id not found');

    // Cache hit: model ja compilado e tabela inalterada. Pula a recompilacao do
    // schema/hooks e o createCollection — corta o leak de heap nas listagens.
    const version = MongooseModelBuilder.signature(table);
    const cached = MongooseModelBuilder.modelCache.get(modelName);
    if (cached && cached.version === version && conn.models[modelName]) {
      return cached.model;
    }

    const schemaDefinition: mongoose.SchemaDefinition = {};

    for (const [key, value] of Object.entries(table._schema)) {
      if (Array.isArray(value) && value[0]?.type === 'Embedded') {
        let embeddedSchema = value[0].schema || {};

        let group: IGroupConfiguration | undefined;
        if (Array.isArray(table.groups)) {
          group = table.groups.find((g: IGroupConfiguration) => g.slug === key);
        }

        if (group && Array.isArray(group.fields) && group.fields.length > 0) {
          embeddedSchema = this.schema.build(group.fields);
        } else if (Object.keys(embeddedSchema).length === 0 && group?._schema) {
          embeddedSchema = group._schema;
        }

        const subSchemaDefinition: mongoose.SchemaDefinition = {};

        for (const [subKey, subValue] of Object.entries(embeddedSchema)) {
          subSchemaDefinition[subKey] = subValue;
        }

        const subSchema = new mongoose.Schema(subSchemaDefinition, {
          _id: true,
          timestamps: true,
          id: false,
        });
        schemaDefinition[key] = [subSchema];
      } else {
        schemaDefinition[key] = value;
      }
    }

    delete schemaDefinition['_id'];
    delete schemaDefinition['createdAt'];
    delete schemaDefinition['updatedAt'];

    // Slug nativo do registro (link de compartilhamento amigavel). Igual a
    // trashed/createdAt: propriedade-base injetada em toda build, sem migracao.
    schemaDefinition['sharedRowSlug'] = {
      type: String,
      default: null,
      index: true,
    };

    // Creator nativo: garante que o dono da row seja sempre persistido, mesmo
    // quando o _schema nao traz o campo CREATOR explicito. Sem isso o strict
    // mode do Mongoose descarta `creator` e o enforcement de OWN (contributor
    // edita apenas as suas rows) nunca casa. Nao sobrescreve definicao vinda do
    // _schema (campo nativo CREATOR ja traz ref User).
    if (!schemaDefinition['creator']) {
      schemaDefinition['creator'] = {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      };
    }

    // Auditoria nativa: quem fez a ultima alteracao (UPDATER). Propriedade-base
    // injetada em toda build (como creator) — garante o path mesmo em tabelas
    // criadas antes do recurso, sem migracao de _schema. Sem isso o Mongoose
    // (strict) descartaria o updater no $set de tabelas antigas. updatedAt ja e
    // gerado automaticamente pelo timestamps abaixo.
    if (!schemaDefinition['updater']) {
      schemaDefinition['updater'] = {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      };
    }

    const schema = new mongoose.Schema(schemaDefinition, {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
      id: false,
    });

    // ===== ADICIONA OS MIDDLEWARES AQUI =====

    // Os hooks do Mongoose sao `function` classica: `this` la dentro e o
    // documento, nao o builder. O service e capturado no closure.
    const { scriptExecution } = this;

    if (table?.methods?.beforeSave?.code) {
      schema.pre('save', async function (next): Promise<void> {
        let userAction: 'novo_registro' | 'editar_registro' = 'editar_registro';
        if (this.isNew) userAction = 'novo_registro';
        const result = await scriptExecution.execute({
          code: table?.methods?.beforeSave?.code!,
          doc: this,
          tableSlug: table.slug,
          fields: MongooseModelBuilder.mapFieldsForSandbox(table.fields ?? []),
          context: {
            userAction,
            executionMoment: 'antes_salvar',
            userId: this.creator?.toString(),
            isNew: this.isNew,
            viaSaveHook: true,
            tableInfo: {
              _id: table._id?.toString() ?? '',
              name: table.name,
              slug: table.slug,
            },
          },
        });

        if (!result.success) {
          throw new Error(`Erro no beforeSave: ${result.error?.message}`);
        }

        next();
      });
    }

    if (table?.methods?.afterSave?.code) {
      schema.post('save', async function (doc, next): Promise<void> {
        let userAction: 'novo_registro' | 'editar_registro' = 'editar_registro';
        if (doc.isNew) userAction = 'novo_registro';
        const result = await scriptExecution.execute({
          code: table?.methods?.afterSave?.code!,
          doc,
          tableSlug: table.slug,
          fields: MongooseModelBuilder.mapFieldsForSandbox(table.fields ?? []),
          context: {
            userAction,
            executionMoment: 'depois_salvar',
            userId: doc.creator?.toString(),
            isNew: doc.isNew,
            viaSaveHook: true,
            tableInfo: {
              _id: table._id?.toString() ?? '',
              name: table.name,
              slug: table.slug,
            },
          },
        });

        if (!result.success) {
          console.error(
            'Erro no afterSave (nao bloqueante):',
            result.error?.message,
          );
        }

        next();
      });
    }

    if (conn.models[modelName]) {
      conn.deleteModel(modelName);
    }
    const model = conn.model<Entity>(modelName, schema, table.slug);

    await model.createCollection();

    MongooseModelBuilder.modelCache.set(modelName, { version, model });

    return model;
  }
}
