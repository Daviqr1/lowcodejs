import { Service } from 'fastify-decorators';
import yaml from 'js-yaml';
import { z } from 'zod';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  buildDefaultTablePermissions,
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_ROLE,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type FieldCreatePayload,
  type IField,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { SlugContractService } from '@application/services/slug/slug-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type {
  SchemaImportField,
  SchemaImportTable,
} from '../_shared.validator';
import { SchemaImportPayloadValidator } from '../_shared.validator';

type Payload = {
  yaml: string;
  ownerId: string;
};

type Response = Either<
  HTTPException,
  {
    created: Array<{ name: string; slug: string; fieldCount: number }>;
    errors: Array<{ name: string; message: string }>;
  }
>;

type PendingRelationship = {
  fieldId: string;
  tableSlug: string;
  fieldSlug: string;
  order: 'asc' | 'desc';
  ownerTableName: string;
};

type CreatedTableRef = {
  _id: string;
  slug: string;
  fieldsBySlug: Map<string, { _id: string; slug: string }>;
};

@Service()
export default class SchemaImportUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      if (!payload.ownerId) {
        return left(
          HTTPException.BadRequest(
            'Proprietário é obrigatório',
            'OWNER_REQUIRED',
          ),
        );
      }

      let parsed: unknown;
      try {
        parsed = yaml.load(payload.yaml, { schema: yaml.FAILSAFE_SCHEMA });
      } catch (yamlError) {
        let message = 'YAML inválido';
        if (yamlError instanceof Error) message = yamlError.message;
        return left(
          HTTPException.BadRequest(`YAML inválido: ${message}`, 'INVALID_YAML'),
        );
      }

      const normalized = this.coercePrimitives(parsed);
      const validation = SchemaImportPayloadValidator.safeParse(normalized);

      if (!validation.success) {
        const errors = this.zodErrorsToMap(validation.error);
        return left(
          HTTPException.BadRequest('Schema inválido', 'INVALID_SCHEMA', errors),
        );
      }

      const created: Array<{ name: string; slug: string; fieldCount: number }> =
        [];
      const errors: Array<{ name: string; message: string }> = [];
      const pendingRelationships: PendingRelationship[] = [];
      const batchTables = new Map<string, CreatedTableRef>();

      // PASS 1 — cria tabelas e campos (RELATIONSHIP fica pendente)
      for (const tableDef of validation.data.tables) {
        const slug = this.slugService.normalize(tableDef.name);

        if (batchTables.has(slug)) {
          errors.push({
            name: tableDef.name,
            message: `Tabela duplicada no schema (slug '${slug}' aparece mais de uma vez)`,
          });
          continue;
        }

        const existing = await this.tableRepository.findBySlug(slug);
        if (existing) {
          errors.push({
            name: tableDef.name,
            message: `Já existe uma tabela com o slug '${slug}'`,
          });
          continue;
        }

        try {
          const { summary, tableRef } = await this.createTable(
            tableDef,
            slug,
            payload.ownerId,
            pendingRelationships,
          );
          batchTables.set(slug, tableRef);
          created.push(summary);
        } catch (err) {
          let message = 'Erro ao criar';
          if (err instanceof Error) message = err.message;
          errors.push({ name: tableDef.name, message });
        }
      }

      // PASS 2 — resolve RELATIONSHIPs cross-table
      for (const pending of pendingRelationships) {
        try {
          const resolved = await this.resolveTargetField(
            pending.tableSlug,
            pending.fieldSlug,
            batchTables,
          );

          if (!resolved) {
            errors.push({
              name: pending.ownerTableName,
              message: `Relacionamento inválido: '${pending.tableSlug}.${pending.fieldSlug}' não encontrado (verifique se a tabela e o campo existem ou foram criados neste schema)`,
            });
            continue;
          }

          await this.fieldRepository.update({
            _id: pending.fieldId,
            relationship: {
              table: { _id: resolved.tableId, slug: resolved.tableSlug },
              field: { _id: resolved.fieldId, slug: resolved.fieldSlug },
              order: pending.order,
            },
          });
        } catch (err) {
          let message = 'Erro';
          if (err instanceof Error) message = err.message;
          errors.push({
            name: pending.ownerTableName,
            message: `Falha ao resolver relacionamento: ${message}`,
          });
        }
      }

      return right({ created, errors });
    } catch (error) {
      console.error('[table-base > schema-import][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SCHEMA_IMPORT_ERROR',
        ),
      );
    }
  }

  private async createTable(
    tableDef: SchemaImportTable,
    slug: string,
    ownerId: string,
    pendingRelationships: PendingRelationship[],
  ): Promise<{
    summary: { name: string; slug: string; fieldCount: number };
    tableRef: CreatedTableRef;
  }> {
    const nativeFields = await this.fieldRepository.createMany([
      ...FIELD_NATIVE_LIST,
    ]);

    const userFields: IField[] = [];
    const usedSlugs = new Set<string>(nativeFields.map((f) => f.slug));

    for (const fieldDef of tableDef.fields) {
      const fieldSlug = this.slugService.unique(fieldDef.name, [...usedSlugs]);
      usedSlugs.add(fieldSlug);

      const payload = this.buildFieldPayload(fieldDef, fieldSlug);
      const createdField = await this.fieldRepository.create(payload);
      userFields.push(createdField);

      if (
        fieldDef.type === E_FIELD_TYPE.RELATIONSHIP &&
        fieldDef.relationship
      ) {
        pendingRelationships.push({
          fieldId: createdField._id,
          tableSlug: fieldDef.relationship.table,
          fieldSlug: fieldDef.relationship.field,
          order: fieldDef.relationship.order,
          ownerTableName: tableDef.name,
        });
      }
    }

    const allFields = [...nativeFields, ...userFields];
    const allFieldIds = allFields.map((f) => f._id);
    const _schema = this.schemaBuilder.build(allFields);

    const registeredGroup = await this.userGroupRepository.findBySlug(
      E_ROLE.REGISTERED,
    );

    const tableRecord = await this.tableRepository.create({
      _schema,
      name: tableDef.name,
      slug,
      type: E_TABLE_TYPE.TABLE,
      owner: ownerId,
      permissions: buildDefaultTablePermissions(registeredGroup?._id ?? null),
      members: [{ user: ownerId, profile: E_TABLE_PROFILE.OWNER }],
      style: tableDef.style ?? E_TABLE_STYLE.LIST,
      fields: allFieldIds,
      fieldOrderList: allFieldIds,
      fieldOrderForm: allFieldIds,
      fieldOrderFilter: allFieldIds,
      fieldOrderDetail: allFieldIds,
    });

    const fieldsBySlug = new Map<string, { _id: string; slug: string }>();
    for (const f of allFields) {
      fieldsBySlug.set(f.slug, { _id: f._id, slug: f.slug });
    }

    return {
      summary: {
        name: tableRecord.name,
        slug: tableRecord.slug,
        fieldCount: userFields.length,
      },
      tableRef: {
        _id: tableRecord._id,
        slug: tableRecord.slug,
        fieldsBySlug,
      },
    };
  }

  private async resolveTargetField(
    tableSlug: string,
    fieldSlug: string,
    batchTables: Map<string, CreatedTableRef>,
  ): Promise<{
    tableId: string;
    tableSlug: string;
    fieldId: string;
    fieldSlug: string;
  } | null> {
    const inBatch = batchTables.get(tableSlug);
    if (inBatch) {
      const field = inBatch.fieldsBySlug.get(fieldSlug);
      if (!field) return null;
      return {
        tableId: inBatch._id,
        tableSlug: inBatch.slug,
        fieldId: field._id,
        fieldSlug: field.slug,
      };
    }

    const dbTable = await this.tableRepository.findBySlug(tableSlug);
    if (!dbTable) return null;

    const populated = dbTable.fields.find((f) => f.slug === fieldSlug);
    if (populated?.slug) {
      return {
        tableId: dbTable._id,
        tableSlug: dbTable.slug,
        fieldId: populated._id,
        fieldSlug: populated.slug,
      };
    }

    for (const fieldRef of dbTable.fields) {
      const field = await this.fieldRepository.findById(fieldRef._id);
      if (field?.slug === fieldSlug) {
        return {
          tableId: dbTable._id,
          tableSlug: dbTable.slug,
          fieldId: field._id,
          fieldSlug: field.slug,
        };
      }
    }

    return null;
  }

  private buildFieldPayload(
    fieldDef: SchemaImportField,
    fieldSlug: string,
  ): FieldCreatePayload {
    let dropdown: Array<{ id: string; label: string; color: string | null }> =
      [];
    if (fieldDef.type === E_FIELD_TYPE.DROPDOWN) {
      dropdown = fieldDef.options.map((opt) => ({
        id: crypto.randomUUID(),
        label: opt.label,
        color: opt.color ?? null,
      }));
    }

    return {
      name: fieldDef.name,
      slug: fieldSlug,
      type: fieldDef.type,
      native: false,
      locked: false,
      required: fieldDef.required,
      multiple: fieldDef.multiple,
      format: fieldDef.format,
      showInFilter: fieldDef.showInFilter,
      permissions: buildFieldPermissions(
        fieldDef.showInList,
        fieldDef.showInForm,
        fieldDef.showInDetail,
      ),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: 50,
      defaultValue: fieldDef.defaultValue,
      relationship: null, // resolvido em pass 2
      dropdown,
      category: [],
      group: null,
    };
  }

  // js-yaml com FAILSAFE_SCHEMA retorna strings; Zod precisa booleanos e
  // números coercidos para os campos que aceitam esses tipos.
  private coercePrimitives(value: unknown): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'string') {
      // tenta número
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        const n = Number(value);
        if (!Number.isNaN(n)) return n;
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.coercePrimitives(item));
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        out[key] = this.coercePrimitives(val);
      }
      return out;
    }
    return value;
  }

  private zodErrorsToMap(error: z.ZodError): Record<string, string> {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_';
      map[path] = this.humanizeZodIssue(issue);
    }
    return map;
  }

  private humanizeZodIssue(issue: z.core.$ZodIssue): string {
    const location = this.locationFromPath(issue.path);
    const last = issue.path[issue.path.length - 1];

    if (issue.code === 'invalid_value' || issue.code === 'invalid_union') {
      if (last === 'type') {
        return `${location}: tipo de campo desconhecido. Tipos válidos: TEXT_SHORT, TEXT_LONG, DATE, DROPDOWN, FILE, USER, CATEGORY, RELATIONSHIP. Para números, use TEXT_SHORT com format: INTEGER ou DECIMAL.`;
      }
      if (last === 'style') {
        return `${location}: style de tabela inválido. Válidos: LIST, GALLERY, DOCUMENT, CARD, MOSAIC, KANBAN, FORUM, CALENDAR, GANTT.`;
      }
      if (last === 'format') {
        return `${location}: format inválido. Para TEXT_SHORT: ALPHA_NUMERIC, INTEGER, DECIMAL, URL, EMAIL, PASSWORD, PHONE, CNPJ, CPF. Para TEXT_LONG: RICH_TEXT, PLAIN_TEXT. Para DATE: DD_MM_YYYY, MM_DD_YYYY, YYYY_MM_DD (e variações com HH_MM_SS / DASH).`;
      }
    }

    if (issue.code === 'invalid_type') {
      return `${location}: tipo do valor inesperado. Esperado ${issue.expected ?? 'outro formato'}.`;
    }

    if (issue.code === 'too_small') {
      if (issue.origin === 'array') {
        return `${location}: lista vazia. ${issue.message}`;
      }
      return `${location}: ${issue.message}`;
    }

    return `${location}: ${issue.message}`;
  }

  private locationFromPath(path: ReadonlyArray<PropertyKey>): string {
    if (path.length === 0) return 'raiz do schema';
    if (path[0] !== 'tables') return path.join('.');

    const parts: string[] = [];
    if (typeof path[1] === 'number') {
      parts.push(`tabela #${path[1] + 1}`);
    }

    if (path[2] === 'fields' && typeof path[3] === 'number') {
      parts.push(`campo #${path[3] + 1}`);
      if (path.length > 4) {
        parts.push(`(${path.slice(4).join('.')})`);
      }
    } else if (path.length > 2) {
      parts.push(path.slice(2).join('.'));
    }

    return parts.join(' → ');
  }
}
