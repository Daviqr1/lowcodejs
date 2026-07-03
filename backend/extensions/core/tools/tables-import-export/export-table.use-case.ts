/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import { left, right } from '@application/core/either.core';
import type { IField, IMenu, ITable } from '@application/core/entity.core';
import { E_FIELD_TYPE, E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type {
  ExportedField,
  ExportedGroup,
  ExportedMenu,
  ExportedRow,
  ExportedStructure,
  ExportedTable,
  ExportResult,
  ExportTableResponse,
  ExportTableUseCasePayload,
} from './export-table.types';

// Tipos referenciais que NÃO viajam no export — dependem de recursos externos
// (arquivos físicos) ou de agregados específicos da instância de origem.
const REFERENCE_TYPES = new Set<string>([
  E_FIELD_TYPE.FILE,
  E_FIELD_TYPE.EVALUATION,
  E_FIELD_TYPE.REACTION,
]);

// Campos cujo valor é um (ou vários) ID de usuário. Viajam como string/string[]
// de IDs: resolvem na mesma instância e ficam vazios (sem erro) em outra.
const USER_REFERENCE_TYPES = new Set<string>([
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.CREATOR,
]);

function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const v: {
      _id?: unknown;
      _bsontype?: string;
      toString?: () => string;
    } = value;
    // Mongoose/BSON ObjectId expõe um getter `_id` que retorna a si mesmo —
    // tratar ObjectId direto pelo toString evita recursão infinita.
    if (v._bsontype === 'ObjectId' || v._bsontype === 'ObjectID') {
      if (typeof v.toString === 'function') return v.toString();
      return String(value);
    }
    // Guard contra auto-referência (`v._id === value`) por segurança extra.
    if (v._id && v._id !== value) return toIdString(v._id);
    if (typeof v.toString === 'function') return v.toString();
  }
  return String(value);
}

@Service()
export default class ExportTableUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly menuRepository: MenuContractRepository,
  ) {}

  async execute(
    payload: ExportTableUseCasePayload,
  ): Promise<ExportTableResponse> {
    try {
      const slugs = this.normalizeSlugs(payload);
      if (slugs.length === 0) {
        return left(
          HTTPException.BadRequest(
            'Informe ao menos uma tabela para exportar',
            'TABLE_SLUG_REQUIRED',
            { slugs: 'Informe ao menos uma tabela' },
          ),
        );
      }

      const tables: ITable[] = [];
      const notFound: string[] = [];
      for (const slug of slugs) {
        const t = await this.tableRepository.findBySlug(slug);
        if (!t) notFound.push(slug);
        else tables.push(t);
      }

      if (notFound.length > 0) {
        return left(
          HTTPException.NotFound(
            'Tabela(s) não encontrada(s)',
            'TABLE_NOT_FOUND',
            { slugs: notFound.join(', ') },
          ),
        );
      }

      const selectedSlugs = new Set(tables.map((t) => t.slug));
      const missing = this.collectMissingRelationships(tables, selectedSlugs);

      if (missing.length > 0 && !payload.acknowledgeMissingRelationships) {
        return left(
          HTTPException.BadRequest(
            'Existem tabelas relacionadas fora da seleção. Inclua-as ou confirme exportar mesmo assim.',
            'MISSING_RELATED_TABLES',
            { missingTables: missing.join(',') },
          ),
        );
      }

      const includeStructure =
        payload.exportType === 'structure' || payload.exportType === 'full';
      const includeData =
        payload.exportType === 'data' || payload.exportType === 'full';

      const exportedTables: ExportedTable[] = [];
      for (const table of tables) {
        // Identidade sempre presente — essencial para o import "somente dados"
        // casar com a tabela existente no destino.
        const exp: ExportedTable = {
          tableSlug: table.slug,
          tableName: table.name,
        };
        if (includeStructure) exp.structure = this.exportStructure(table);
        if (includeData) exp.data = await this.exportData(table);
        exportedTables.push(exp);
      }

      const exportedMenus = includeStructure
        ? await this.exportMenus(tables)
        : [];

      const first = tables[0];

      const result: ExportResult = {
        header: {
          version: '2.0',
          platform: 'lowcodejs',
          tableName: first.name,
          tableSlug: first.slug,
          exportedBy: payload.userName,
          exportedAt: new Date().toISOString(),
          exportType: payload.exportType,
          tablesCount: tables.length,
          menusCount: exportedMenus.length,
        },
        tables: exportedTables,
        menus: exportedMenus,
      };

      return right(result);
    } catch (error) {
      console.error('[tools > export-table][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao exportar tabela',
          'EXPORT_TABLE_ERROR',
        ),
      );
    }
  }

  private normalizeSlugs(payload: ExportTableUseCasePayload): string[] {
    if (payload.slugs && payload.slugs.length > 0) {
      return Array.from(new Set(payload.slugs));
    }
    if (payload.slug) return [payload.slug];
    return [];
  }

  private collectMissingRelationships(
    tables: ITable[],
    selectedSlugs: Set<string>,
  ): string[] {
    const missing = new Set<string>();
    const collect = (fields: IField[] | undefined): void => {
      for (const f of fields || []) {
        if (
          f.type === E_FIELD_TYPE.RELATIONSHIP &&
          f.relationship?.table?.slug &&
          !selectedSlugs.has(f.relationship.table.slug)
        ) {
          missing.add(f.relationship.table.slug);
        }
      }
    };
    for (const t of tables) {
      collect(t.fields);
      for (const g of t.groups || []) collect(g.fields);
    }
    return Array.from(missing);
  }

  private exportStructure(table: ITable): ExportedStructure {
    const nonNativeFields = table.fields.filter((f) => !f.native);

    const fieldSlugMap = new Map<string, string>();
    for (const field of table.fields) {
      fieldSlugMap.set(field._id, field.slug);
    }

    const exportedFields = nonNativeFields
      .filter((f) => !f.group)
      .map((f) => this.exportField(f));

    const exportedGroups: ExportedGroup[] = (table.groups || []).map(
      (group) => ({
        slug: group.slug,
        name: group.name,
        fields: (group.fields || [])
          .filter((f) => !f.native)
          .map((f) => this.exportField(f)),
      }),
    );

    const mapOrder = (ids: string[] | undefined): string[] =>
      (ids || [])
        .map((id) => fieldSlugMap.get(id))
        .filter((slug): slug is string => Boolean(slug));

    return {
      name: table.name,
      slug: table.slug,
      description: table.description,
      style: table.style,
      fields: exportedFields,
      groups: exportedGroups,
      fieldOrderList: mapOrder(table.fieldOrderList),
      fieldOrderForm: mapOrder(table.fieldOrderForm),
      fieldOrderFilter: mapOrder(table.fieldOrderFilter),
      fieldOrderDetail: mapOrder(table.fieldOrderDetail),
      layoutFields: table.layoutFields
        ? this.exportLayoutFields(table.layoutFields, fieldSlugMap)
        : {},
      methods: table.methods || {
        onLoad: { code: null },
        beforeSave: { code: null },
        afterSave: { code: null },
      },
    };
  }

  private exportLayoutFields(
    layoutFields: Record<string, string | null>,
    fieldSlugMap: Map<string, string>,
  ): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(layoutFields)) {
      if (value && fieldSlugMap.has(value)) {
        result[key] = fieldSlugMap.get(value) || null;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private exportField(field: IField): ExportedField {
    let group: { slug: string } | null = null;
    if (field.group) group = { slug: field.group.slug };
    return {
      name: field.name,
      slug: field.slug,
      type: field.type,
      required: field.required,
      multiple: field.multiple,
      format: field.format,
      validations: field.validations ?? [],
      showInFilter: field.showInFilter,
      permissions: field.permissions,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail ?? null,
      defaultValue: field.defaultValue,
      locked: field.locked,
      relationship: field.relationship
        ? {
            tableSlug: field.relationship.table.slug,
            fieldSlug: field.relationship.field.slug,
            order: field.relationship.order,
          }
        : null,
      dropdown: field.dropdown || [],
      category: field.category || [],
      group,
    };
  }

  private async exportData(
    table: ITable,
  ): Promise<{ totalRows: number; rows: ExportedRow[] }> {
    const rows = await this.rowRepository.findAllRaw(table);

    const nonNativeFields = table.fields.filter((f) => !f.native);

    const exportedRows: ExportedRow[] = rows.map((row) => {
      const originalId = toIdString(row['_id']) || '';
      const exportedRow: ExportedRow = { _originalId: originalId };

      // Campo nativo CREATOR (slug `creator`): viaja como ID de usuário.
      const creatorId = toIdString(row['creator']);
      if (creatorId) exportedRow._originalCreator = creatorId;

      for (const field of nonNativeFields) {
        const value = row[field.slug];
        if (value === undefined || value === null) continue;

        if (REFERENCE_TYPES.has(field.type)) continue;

        if (
          field.type === E_FIELD_TYPE.RELATIONSHIP ||
          USER_REFERENCE_TYPES.has(field.type)
        ) {
          exportedRow[field.slug] = this.serializeRelationshipValue(value);
          continue;
        }

        if (field.type === E_FIELD_TYPE.FIELD_GROUP) {
          const group = (table.groups || []).find(
            (g) => g.slug === field.group?.slug,
          );
          if (group && Array.isArray(value)) {
            const subRows = value.map((groupRow: Record<string, unknown>) => {
              const exportedGroupRow: Record<string, unknown> = {};
              const groupOriginalId = toIdString(groupRow['_id']);
              if (groupOriginalId) {
                exportedGroupRow._originalId = groupOriginalId;
              }
              const groupCreatorId = toIdString(groupRow['creator']);
              if (groupCreatorId) {
                exportedGroupRow._originalCreator = groupCreatorId;
              }
              for (const gf of group.fields || []) {
                if (gf.native) continue;
                if (REFERENCE_TYPES.has(gf.type)) continue;
                const gv = groupRow[gf.slug];
                if (gv === undefined || gv === null) continue;
                if (
                  gf.type === E_FIELD_TYPE.RELATIONSHIP ||
                  USER_REFERENCE_TYPES.has(gf.type)
                ) {
                  exportedGroupRow[gf.slug] =
                    this.serializeRelationshipValue(gv);
                  continue;
                }
                exportedGroupRow[gf.slug] = gv;
              }
              return exportedGroupRow;
            });
            exportedRow[field.slug] = subRows;
          }
          continue;
        }

        exportedRow[field.slug] = value;
      }

      return exportedRow;
    });

    return {
      totalRows: exportedRows.length,
      rows: exportedRows,
    };
  }

  private serializeRelationshipValue(value: unknown): string | string[] | null {
    if (Array.isArray(value)) {
      return value
        .map((v) => toIdString(v))
        .filter((v): v is string => Boolean(v));
    }
    return toIdString(value);
  }

  private async exportMenus(tables: ITable[]): Promise<ExportedMenu[]> {
    const tableIds = new Set(tables.map((t) => String(t._id)));
    const tableIdToSlug = new Map(
      tables.map((t) => [String(t._id), t.slug] as const),
    );

    const allMenus = await this.menuRepository.findMany({ trashed: false });

    const linkedMenus = allMenus.filter((m) => {
      const tid = toIdString(m.table);
      return tid !== null && tableIds.has(tid);
    });

    if (linkedMenus.length === 0) return [];

    const menuById = new Map<string, IMenu>();
    for (const m of allMenus) menuById.set(String(m._id), m);

    const collected = new Map<string, IMenu>();
    for (const start of linkedMenus) {
      let current: IMenu | undefined = start;
      while (current) {
        const id = String(current._id);
        if (collected.has(id)) break;
        collected.set(id, current);
        const parentId = toIdString(current.parent);
        current = undefined;
        if (parentId) current = menuById.get(parentId);
      }
    }

    return Array.from(collected.values()).map((menu) => {
      const tid = toIdString(menu.table);
      const knownTableSlug = tid ? (tableIdToSlug.get(tid) ?? null) : null;

      let type = menu.type;
      let tableSlug: string | null = knownTableSlug;
      let url = menu.url;

      if (
        (type === E_MENU_ITEM_TYPE.TABLE || type === E_MENU_ITEM_TYPE.FORM) &&
        !knownTableSlug
      ) {
        type = E_MENU_ITEM_TYPE.SEPARATOR;
        tableSlug = null;
        url = null;
      }

      return {
        _originalId: String(menu._id),
        name: menu.name,
        slug: menu.slug,
        type,
        parent: toIdString(menu.parent),
        url,
        html: menu.html ?? null,
        order: menu.order,
        isInitial: menu.isInitial,
        tableSlug,
        extension: menu.extension ?? null,
      };
    });
  }
}
