import { Service } from 'fastify-decorators';

import { left, right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_MENU_ITEM_TYPE,
  FIELD_GROUP_NATIVE_LIST,
  FIELD_NATIVE_LIST,
  type IField,
  type IFieldPermissions,
  type IFieldValidation,
  type IGroupConfiguration,
  type ILayoutFields,
  type ITable,
  type Merge,
  type ValueOf,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import {
  NAME_MAX_LENGTH,
  SLUG_MIN_LENGTH,
} from '@application/core/field-rules.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import {
  TableContractRepository,
  type TableCreatePayload,
} from '@application/repositories/table/table-contract.repository';
import { SlugContractService } from '@application/services/slug/slug-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import {
  emitTableImportEvent,
  TABLE_IMPORT_EVENT,
  type TableImportPhase,
} from './import-table.socket';
import type {
  ImportedTableSummary,
  ImportTableResponse,
  ImportTableUseCasePayload,
} from './import-table.types';

/**
 * Converte um valor de JSON externo (shapeless) num Record tipado. A asserção
 * interna é segura porque guardada por checagem de objeto — evita espalhar
 * `as` pelos acessos ao pacote importado.
 */
function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object') {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return value as Record<string, unknown>;
  }
  return {};
}

type ExportedField = {
  name: string;
  slug: string;
  type: IField['type'];
  required: boolean;
  multiple: boolean;
  format: IField['format'];
  validations?: IFieldValidation[];
  showInFilter: boolean;
  showInParentList?: boolean;
  visibleInParentList?: boolean;
  permissions?: IFieldPermissions | null;
  widthInForm: number | null;
  widthInList: number | null;
  widthInDetail: number | null;
  defaultValue: string | string[] | null;
  locked?: boolean;
  relationship: {
    tableSlug: string;
    fieldSlug: string;
    order: 'asc' | 'desc';
  } | null;
  dropdown: Array<{ id: string; label: string; color?: string | null }>;
  category: IField['category'];
  group: { slug: string } | null;
};

type ExportedGroup = {
  slug: string;
  name: string;
  fields: ExportedField[];
};

type ExportedStructure = {
  name: string;
  slug: string;
  description: string | null;
  style: TableCreatePayload['style'];
  fields: ExportedField[];
  groups: ExportedGroup[];
  fieldOrderList: string[];
  fieldOrderForm: string[];
  fieldOrderFilter: string[];
  fieldOrderDetail: string[];
  layoutFields: Record<string, string | null>;
  methods?: {
    onLoad: { code: string | null };
    beforeSave: { code: string | null };
    afterSave: { code: string | null };
  };
};

type ExportedTable = {
  /** Identidade da tabela (presente também em exports "somente dados"). */
  tableSlug?: string;
  tableName?: string;
  structure?: ExportedStructure;
  data?: {
    totalRows: number;
    rows: Array<Merge<Record<string, unknown>, { _originalId?: string }>>;
  };
};

type ExportedMenu = {
  _originalId: string;
  name: string;
  slug: string;
  type: ValueOf<typeof E_MENU_ITEM_TYPE>;
  parent: string | null;
  url: string | null;
  html: string | null;
  order: number;
  isInitial: boolean;
  tableSlug: string | null;
  extension: { pkg: string; extensionId: string } | null;
};

type NormalizedPackage = {
  tables: ExportedTable[];
  menus: ExportedMenu[];
};

@Service()
export default class ImportTableUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly menuRepository: MenuContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(
    payload: ImportTableUseCasePayload,
  ): Promise<ImportTableResponse> {
    try {
      if (!payload.ownerId) {
        return left(
          HTTPException.BadRequest(
            'Owner ID é obrigatório',
            'OWNER_ID_REQUIRED',
          ),
        );
      }

      const content = toRecord(payload.fileContent);
      const header = toRecord(content.header);

      if (header.platform !== 'lowcodejs') {
        return left(
          HTTPException.BadRequest(
            'Arquivo de importação inválido. Plataforma não reconhecida.',
            'INVALID_PLATFORM',
          ),
        );
      }

      const pkg = this.normalizePackage(content);

      // Importação "somente dados": o pacote não traz estrutura, apenas linhas
      // + a identidade (tableSlug) de cada tabela. As tabelas precisam já
      // existir no destino — casamos por slug e inserimos as linhas.
      const isDataOnly =
        pkg.tables.length > 0 && pkg.tables.every((t) => !t.structure);
      if (isDataOnly) {
        return this.importDataOnly(pkg, payload);
      }

      // Normaliza slugs legados inválidos (ex.: "arquivo(s)" criado antes da
      // validação estrita) ANTES de validar — reescreve de forma consistente
      // os fields, grupos e TODAS as referências (relationships, fieldOrder,
      // layoutFields e as chaves das rows). Sem isso, importar um pacote vindo
      // de uma instância antiga falha com INVALID_FIELD_SLUG.
      this.normalizeStructureSlugs(pkg);
      const metadataError = this.validatePackageFieldMetadata(pkg);
      if (metadataError) return left(metadataError);

      if (pkg.tables.length === 0 || !pkg.tables[0].structure) {
        return left(
          HTTPException.BadRequest(
            'Importação requer ao menos uma tabela com estrutura',
            'STRUCTURE_REQUIRED',
          ),
        );
      }

      const renames = this.computeRenames(payload, pkg);
      const menuRenames = this.computeMenuRenames(payload, pkg);

      const conflict = await this.detectConflicts(pkg, renames, menuRenames);
      if (conflict) return left(conflict);

      // Total de linhas a inserir (em todas as tabelas do pacote) — base do
      // percentual do feed de progresso. Contadores globais acompanham as
      // fases C/D.
      const totalRows = pkg.tables.reduce(
        (acc, t) => acc + (t.data?.rows?.length ?? 0),
        0,
      );
      let processedRows = 0;
      let failedRows = 0;
      // No máximo ~100 eventos de linha (1 por 1% do total) para não inundar o
      // socket em importações grandes. O último sempre é emitido.
      const emitStep = Math.max(1, Math.floor(totalRows / 100));

      const tableSlugToInfo = new Map<
        string,
        {
          originalSlug: string;
          newSlug: string;
          newName: string;
          tableId?: string;
          fieldSlugToId?: Map<string, string>;
          fieldsIds?: string[];
          allFields?: IField[];
          groups?: IGroupConfiguration[];
          structure: ExportedStructure;
        }
      >();

      for (const t of pkg.tables) {
        if (!t.structure) continue;
        const originalSlug = t.structure.slug;
        const rename = renames.get(originalSlug);
        let newSlug = originalSlug;
        let newName = t.structure.name;
        if (rename) {
          newSlug = rename.slug;
          newName = rename.name;
        }
        tableSlugToInfo.set(originalSlug, {
          originalSlug,
          newSlug,
          newName,
          structure: t.structure,
        });
      }

      // Phase A: create tables (relationship pointing to packages → resolved later)
      for (const info of tableSlugToInfo.values()) {
        this.emitProgress(
          payload,
          'structure',
          processedRows,
          totalRows,
          info.newName,
          failedRows,
        );
        const built = await this.createTableSkeleton({
          structure: info.structure,
          newName: info.newName,
          newSlug: info.newSlug,
          ownerId: payload.ownerId,
          packageSlugs: new Set(tableSlugToInfo.keys()),
        });
        info.tableId = built.tableId;
        info.fieldSlugToId = built.fieldSlugToId;
        info.fieldsIds = built.fieldsIds;
        info.allFields = built.allFields;
        info.groups = built.groups;
      }

      // Phase B: resolve relationships within the package (rewrite to new ids/slugs)
      for (const info of tableSlugToInfo.values()) {
        await this.resolvePackageRelationships(info, tableSlugToInfo);
      }

      // Phase C: insert rows (without relationship fields) + collect id map.
      // O rowIdMap é chaveado pelo NOVO slug porque, após a Fase B, os campos
      // RELATIONSHIP já apontam para o slug renomeado da tabela alvo — é assim
      // que `remapRelationshipValue` (Fase D) consulta o mapa.
      const rowIdMap = new Map<string, Map<string, string>>(); // newSlug → originalRowId → newRowId
      const fullTables = new Map<string, ITable>();
      let importedRowCount = 0;

      for (const info of tableSlugToInfo.values()) {
        const full = await this.tableRepository.findById(info.tableId!);
        if (!full) continue;
        // Usa os fields/groups já resolvidos na Fase B em vez de depender do
        // populate do repositório — garante que strip/backfill enxerguem o
        // `type`/`relationship` corretos de cada campo.
        if (info.allFields) full.fields = info.allFields;
        if (info.groups) full.groups = info.groups;
        fullTables.set(info.originalSlug, full);
        const entry = pkg.tables.find(
          (t) => t.structure?.slug === info.originalSlug,
        );
        if (!entry?.data?.rows?.length) {
          rowIdMap.set(info.newSlug, new Map());
          continue;
        }
        const map = new Map<string, string>();
        for (const row of entry.data.rows) {
          const stripped = this.stripRelationshipFields(row, full);
          // Preserva o criador original da row (campo nativo CREATOR);
          // cai para o usuário que está importando quando ausente.
          let rowCreator = payload.ownerId;
          if (row._originalCreator) rowCreator = String(row._originalCreator);
          try {
            const inserted = await this.rowRepository.insertRaw(
              full,
              stripped,
              rowCreator,
            );
            importedRowCount++;
            let originalRowId: string | null = null;
            if (row._originalId) originalRowId = String(row._originalId);
            if (originalRowId) map.set(originalRowId, inserted._id);
          } catch (rowError) {
            failedRows++;
            console.error('[tools > import-table][row-insert]:', rowError);
          }
          processedRows++;
          if (processedRows % emitStep === 0 || processedRows === totalRows) {
            this.emitProgress(
              payload,
              'rows',
              processedRows,
              totalRows,
              info.newName,
              failedRows,
            );
          }
        }
        rowIdMap.set(info.newSlug, map);
      }

      // Phase D: backfill relationships using the row id map
      this.emitProgress(
        payload,
        'relationships',
        processedRows,
        totalRows,
        null,
        failedRows,
      );
      for (const info of tableSlugToInfo.values()) {
        const full = fullTables.get(info.originalSlug);
        if (!full) continue;
        const entry = pkg.tables.find(
          (t) => t.structure?.slug === info.originalSlug,
        );
        if (!entry?.data?.rows?.length) continue;
        await this.backfillRelationships({
          table: full,
          rows: entry.data.rows,
          rowIdMap,
          ownerSlug: info.newSlug,
        });
      }

      // Phase E: recreate menus
      this.emitProgress(
        payload,
        'menus',
        processedRows,
        totalRows,
        null,
        failedRows,
      );
      const importedMenus = await this.importMenus({
        menus: pkg.menus,
        tableSlugToInfo,
        ownerId: payload.ownerId,
        menuRenames,
      });

      const summaries: ImportedTableSummary[] = Array.from(
        tableSlugToInfo.values(),
      ).map((info) => ({
        tableId: info.tableId!,
        slug: info.newSlug,
        name: info.newName,
      }));

      const first = summaries[0];
      const importedFields = Array.from(tableSlugToInfo.values()).reduce(
        (acc, info) =>
          acc + (info.allFields?.filter((f) => !f.native).length || 0),
        0,
      );

      if (payload.jobId) {
        emitTableImportEvent(payload.ownerId, TABLE_IMPORT_EVENT.COMPLETED, {
          job_id: payload.jobId,
          importedFields,
          importedRows: importedRowCount,
          importedMenus,
          tables: summaries.map((s) => ({ slug: s.slug, name: s.name })),
        });
      }

      return right({
        tableId: first.tableId,
        slug: first.slug,
        importedFields,
        importedRows: importedRowCount,
        tables: summaries,
        importedMenus,
      });
    } catch (error) {
      console.error('[tools > import-table][error]:', error);
      if (payload.jobId) {
        emitTableImportEvent(payload.ownerId, TABLE_IMPORT_EVENT.ERROR, {
          job_id: payload.jobId,
          message: 'Erro interno ao importar. Nenhuma alteração foi concluída.',
        });
      }
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'IMPORT_TABLE_ERROR',
        ),
      );
    }
  }

  /**
   * Emite um evento de progresso para o feed WebSocket. No-op quando o cliente
   * não enviou `jobId` (importação sem acompanhamento em tempo real).
   */
  private emitProgress(
    payload: ImportTableUseCasePayload,
    phase: TableImportPhase,
    processed: number,
    total: number,
    currentTable: string | null,
    failed: number,
  ): void {
    if (!payload.jobId) return;
    emitTableImportEvent(payload.ownerId, TABLE_IMPORT_EVENT.PROGRESS, {
      job_id: payload.jobId,
      phase,
      processed,
      total,
      current_table: currentTable,
      failed,
    });
  }

  // ── Data-only import (linhas em tabelas existentes) ────────

  /**
   * Importa apenas dados: casa cada tabela do pacote (por `tableSlug`) com uma
   * tabela JÁ EXISTENTE no destino e insere as linhas, remapeando os
   * relacionamentos entre as tabelas do pacote. Não cria estrutura nem menus.
   */
  private async importDataOnly(
    pkg: NormalizedPackage,
    payload: ImportTableUseCasePayload,
  ): Promise<ImportTableResponse> {
    const entries = pkg.tables
      .map((t) => ({
        slug: t.tableSlug,
        name: t.tableName ?? t.tableSlug ?? '',
        data: t.data,
      }))
      .filter((e): e is { slug: string; name: string; data: typeof e.data } =>
        Boolean(e.slug),
      );

    if (entries.length === 0) {
      return left(
        HTTPException.BadRequest(
          'Arquivo de dados sem identificação de tabela. Reexporte na versão atual da plataforma.',
          'DATA_TABLE_IDENTITY_MISSING',
        ),
      );
    }

    // Resolve cada slug contra uma tabela existente (não-lixeira).
    const resolved: Array<{
      table: ITable;
      slug: string;
      name: string;
      rows: Array<Merge<Record<string, unknown>, { _originalId?: string }>>;
    }> = [];
    const missing: string[] = [];
    for (const e of entries) {
      const table = await this.tableRepository.findBySlug(e.slug, {
        trashed: false,
      });
      if (!table) {
        missing.push(e.slug);
        continue;
      }
      resolved.push({
        table,
        slug: e.slug,
        name: e.name,
        rows: e.data?.rows ?? [],
      });
    }

    if (missing.length > 0) {
      return left(
        HTTPException.BadRequest(
          'Tabela(s) não encontrada(s) no destino. Importe a estrutura primeiro (ou use um arquivo "Completo") antes de carregar os dados.',
          'IMPORT_TABLES_NOT_FOUND',
          { tables: missing.join(',') },
        ),
      );
    }

    try {
      const totalRows = resolved.reduce((acc, r) => acc + r.rows.length, 0);
      let processedRows = 0;
      let failedRows = 0;
      const emitStep = Math.max(1, Math.floor(totalRows / 100));

      // Fase C — insere as linhas (sem relacionamentos) e monta o rowIdMap
      // chaveado pelo slug real da tabela.
      const rowIdMap = new Map<string, Map<string, string>>();
      let importedRowCount = 0;

      for (const r of resolved) {
        const map = new Map<string, string>();
        for (const row of r.rows) {
          const stripped = this.stripRelationshipFields(row, r.table);
          let rowCreator = payload.ownerId;
          if (row._originalCreator) rowCreator = String(row._originalCreator);
          try {
            const inserted = await this.rowRepository.insertRaw(
              r.table,
              stripped,
              rowCreator,
            );
            importedRowCount++;
            let originalRowId: string | null = null;
            if (row._originalId) originalRowId = String(row._originalId);
            if (originalRowId) map.set(originalRowId, inserted._id);
          } catch (rowError) {
            failedRows++;
            console.error('[tools > import-table][data-row-insert]:', rowError);
          }
          processedRows++;
          if (processedRows % emitStep === 0 || processedRows === totalRows) {
            this.emitProgress(
              payload,
              'rows',
              processedRows,
              totalRows,
              r.name,
              failedRows,
            );
          }
        }
        rowIdMap.set(r.slug, map);
      }

      // Fase D — religa relacionamentos usando o rowIdMap.
      this.emitProgress(
        payload,
        'relationships',
        processedRows,
        totalRows,
        null,
        failedRows,
      );
      for (const r of resolved) {
        await this.backfillRelationships({
          table: r.table,
          rows: r.rows,
          rowIdMap,
          ownerSlug: r.slug,
        });
      }

      const summaries: ImportedTableSummary[] = resolved.map((r) => ({
        tableId: r.table._id,
        slug: r.slug,
        name: r.table.name,
      }));

      if (payload.jobId) {
        emitTableImportEvent(payload.ownerId, TABLE_IMPORT_EVENT.COMPLETED, {
          job_id: payload.jobId,
          importedFields: 0,
          importedRows: importedRowCount,
          importedMenus: 0,
          tables: summaries.map((s) => ({ slug: s.slug, name: s.name })),
        });
      }

      return right({
        tableId: summaries[0].tableId,
        slug: summaries[0].slug,
        importedFields: 0,
        importedRows: importedRowCount,
        tables: summaries,
        importedMenus: 0,
      });
    } catch (error) {
      console.error('[tools > import-table][data-only][error]:', error);
      if (payload.jobId) {
        emitTableImportEvent(payload.ownerId, TABLE_IMPORT_EVENT.ERROR, {
          job_id: payload.jobId,
          message: 'Erro interno ao importar os dados.',
        });
      }
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'IMPORT_TABLE_ERROR',
        ),
      );
    }
  }

  // ── Slug normalization (legacy packages) ──────────────────
  //
  // Instâncias antigas podem ter slugs de campo que não batem com o padrão
  // estrito atual (ex.: "arquivo(s)", maiúsculas, acentos). Em vez de rejeitar
  // a importação, normalizamos esses slugs aqui e reescrevemos todas as
  // referências, preservando a unicidade dentro de cada escopo.

  /**
   * Reescreve `oldSlug → newSlug` para um conjunto de campos no mesmo escopo.
   * Slugs já válidos são preservados (mapeiam para si mesmos) e reservados
   * primeiro, de modo que a normalização dos inválidos nunca colida com eles.
   */
  private buildScopeRewrite(
    entries: Array<{ slug: string; name: string }>,
    reserved: string[],
    out: Map<string, string>,
  ): void {
    const used = new Set<string>(reserved);

    // Passo 1: preserva e reserva todos os slugs já válidos.
    for (const e of entries) {
      if (out.has(e.slug)) continue;
      if (!this.slugService.getError(e.slug)) {
        used.add(e.slug);
        out.set(e.slug, e.slug);
      }
    }

    // Passo 2: normaliza os inválidos garantindo unicidade no escopo.
    for (const e of entries) {
      if (out.has(e.slug)) continue;
      let base =
        this.slugService.normalize(e.slug) ||
        this.slugService.normalize(e.name) ||
        'campo';
      if (base.length < SLUG_MIN_LENGTH) base = 'campo';
      let candidate = base;
      let i = 2;
      while (used.has(candidate)) candidate = `${base}-${i++}`;
      used.add(candidate);
      out.set(e.slug, candidate);
    }
  }

  private normalizeStructureSlugs(pkg: NormalizedPackage): void {
    const nativeSlugs = FIELD_NATIVE_LIST.map((f) => f.slug);
    const groupNativeSlugs = FIELD_GROUP_NATIVE_LIST.map((f) => f.slug);

    // originalTableSlug → mapas de reescrita (para resolver relationships e rows)
    const perTable = new Map<
      string,
      {
        fieldRewrite: Map<string, string>; // top-level fields + marcadores de grupo
        groupFieldRewrites: Map<string, Map<string, string>>; // newGroupSlug → (oldSub → newSub)
      }
    >();

    // Passo A: reescreve os slugs dentro de cada estrutura.
    for (const t of pkg.tables) {
      const s = t.structure;
      if (!s) continue;

      const fieldRewrite = new Map<string, string>();
      const groupFieldRewrites = new Map<string, Map<string, string>>();

      // Namespace de nível de tabela: fields top-level + slugs de grupo.
      this.buildScopeRewrite(
        [
          ...(s.fields || []).map((f) => ({ slug: f.slug, name: f.name })),
          ...(s.groups || []).map((g) => ({ slug: g.slug, name: g.name })),
        ],
        nativeSlugs,
        fieldRewrite,
      );

      for (const f of s.fields || [])
        f.slug = fieldRewrite.get(f.slug) ?? f.slug;

      for (const g of s.groups || []) {
        const newGroupSlug = fieldRewrite.get(g.slug) ?? g.slug;
        const subRewrite = new Map<string, string>();
        this.buildScopeRewrite(
          (g.fields || []).map((f) => ({ slug: f.slug, name: f.name })),
          groupNativeSlugs,
          subRewrite,
        );
        for (const f of g.fields || []) {
          f.slug = subRewrite.get(f.slug) ?? f.slug;
          f.group = { slug: newGroupSlug };
        }
        g.slug = newGroupSlug;
        groupFieldRewrites.set(newGroupSlug, subRewrite);
      }

      const remapOrder = (slugs: string[] | undefined): string[] =>
        (slugs || []).map((x) => fieldRewrite.get(x) ?? x);
      s.fieldOrderList = remapOrder(s.fieldOrderList);
      s.fieldOrderForm = remapOrder(s.fieldOrderForm);
      s.fieldOrderFilter = remapOrder(s.fieldOrderFilter);
      s.fieldOrderDetail = remapOrder(s.fieldOrderDetail);

      if (s.layoutFields) {
        for (const key of Object.keys(s.layoutFields)) {
          const v = s.layoutFields[key];
          if (v) s.layoutFields[key] = fieldRewrite.get(v) ?? v;
        }
      }

      perTable.set(s.slug, { fieldRewrite, groupFieldRewrites });
    }

    // Passo B: reescreve referências cruzadas (relationships) e chaves das rows.
    for (const t of pkg.tables) {
      const s = t.structure;
      if (!s) continue;
      const self = perTable.get(s.slug)!;

      const rewriteRel = (f: ExportedField): void => {
        if (f.type !== E_FIELD_TYPE.RELATIONSHIP || !f.relationship) return;
        const target = perTable.get(f.relationship.tableSlug);
        if (!target) return; // tabela fora do pacote → resolve contra o DB original
        f.relationship.fieldSlug =
          target.fieldRewrite.get(f.relationship.fieldSlug) ??
          f.relationship.fieldSlug;
      };
      for (const f of s.fields || []) rewriteRel(f);
      for (const g of s.groups || [])
        for (const f of g.fields || []) rewriteRel(f);

      for (const row of t.data?.rows || []) this.rewriteRowKeys(row, self);
    }
  }

  private rewriteRowKeys(
    row: Record<string, unknown>,
    info: {
      fieldRewrite: Map<string, string>;
      groupFieldRewrites: Map<string, Map<string, string>>;
    },
  ): void {
    const renameKeys = (
      target: Record<string, unknown>,
      rewrite: Map<string, string>,
    ): void => {
      for (const [oldKey, newKey] of rewrite) {
        if (oldKey === newKey) continue;
        if (Object.prototype.hasOwnProperty.call(target, oldKey)) {
          target[newKey] = target[oldKey];
          delete target[oldKey];
        }
      }
    };

    // Top-level (renomeia também a chave do grupo via marcador de grupo).
    renameKeys(row, info.fieldRewrite);

    // Subrows de cada field group.
    for (const [groupSlug, subRewrite] of info.groupFieldRewrites) {
      const sub = row[groupSlug];
      if (!Array.isArray(sub)) continue;
      for (const subRow of sub) {
        if (subRow && typeof subRow === 'object') {
          renameKeys(toRecord(subRow), subRewrite);
        }
      }
    }
  }

  private validatePackageFieldMetadata(
    pkg: NormalizedPackage,
  ): HTTPException | null {
    const validateField = (
      field: ExportedField,
      path: string,
    ): HTTPException | null => {
      if (!field.name?.trim()) {
        return HTTPException.BadRequest(
          'Arquivo de importação possui campo sem título',
          'INVALID_FIELD_NAME',
          { field: path },
        );
      }

      if (field.name.length > NAME_MAX_LENGTH) {
        return HTTPException.BadRequest(
          `Título do campo deve ter no máximo ${NAME_MAX_LENGTH} caracteres`,
          'INVALID_FIELD_NAME',
          { field: path },
        );
      }

      const slugError = this.slugService.getError(field.slug);
      if (slugError) {
        return HTTPException.BadRequest(
          `Slug de campo inválido: ${slugError}`,
          'INVALID_FIELD_SLUG',
          { field: path, slug: field.slug },
        );
      }

      return null;
    };

    const validateUniqueSlugs = (
      fields: ExportedField[],
      scope: string,
    ): HTTPException | null => {
      const used = new Set<string>();
      for (const field of fields) {
        if (used.has(field.slug)) {
          return HTTPException.BadRequest(
            'Arquivo de importação possui slugs de campo duplicados',
            'DUPLICATE_FIELD_SLUGS',
            { field: scope, slug: field.slug },
          );
        }
        used.add(field.slug);
      }
      return null;
    };

    for (const table of pkg.tables) {
      const structure = table.structure;
      if (!structure) continue;

      const topLevelGroupFields: ExportedField[] = (structure.groups || []).map(
        (group) => ({
          name: group.name,
          slug: group.slug,
          type: E_FIELD_TYPE.FIELD_GROUP,
          required: false,
          multiple: false,
          format: null,
          showInFilter: false,
          permissions: buildFieldPermissions(true, true, true),
          widthInForm: null,
          widthInList: null,
          widthInDetail: null,
          defaultValue: null,
          relationship: null,
          dropdown: [],
          category: [],
          group: { slug: group.slug },
        }),
      );

      const topLevelError = validateUniqueSlugs(
        [...(structure.fields || []), ...topLevelGroupFields],
        structure.slug,
      );
      if (topLevelError) return topLevelError;

      for (const field of structure.fields || []) {
        const error = validateField(field, `${structure.slug}.${field.slug}`);
        if (error) return error;
      }

      for (const group of structure.groups || []) {
        const groupFieldError = validateField(
          topLevelGroupFields.find((field) => field.slug === group.slug)!,
          `${structure.slug}.${group.slug}`,
        );
        if (groupFieldError) return groupFieldError;

        const groupError = validateUniqueSlugs(
          group.fields || [],
          `${structure.slug}.${group.slug}`,
        );
        if (groupError) return groupError;

        for (const field of group.fields || []) {
          const error = validateField(
            field,
            `${structure.slug}.${group.slug}.${field.slug}`,
          );
          if (error) return error;
        }
      }
    }

    return null;
  }

  // ── Normalization ──────────────────────────────────────────

  private normalizePackage(
    content: Record<string, unknown>,
  ): NormalizedPackage {
    /* eslint-disable @typescript-eslint/consistent-type-assertions --
       fronteira de JSON externo: o pacote já foi validado como lowcodejs;
       coagir para as formas tipadas aqui é inevitável */
    if (Array.isArray(content.tables)) {
      let menus: ExportedMenu[] = [];
      if (Array.isArray(content.menus)) menus = content.menus as ExportedMenu[];
      return { tables: content.tables as ExportedTable[], menus };
    }
    const legacyStructure = content.structure as ExportedStructure | undefined;
    const legacyData = content.data as ExportedTable['data'];
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    if (legacyStructure) {
      return {
        tables: [{ structure: legacyStructure, data: legacyData }],
        menus: [],
      };
    }
    return { tables: [], menus: [] };
  }

  /**
   * Monta o mapa de renomeações `originalSlug → { name, slug }`. Aceita a API
   * nova (`payload.tables`, renomeação por tabela) e o campo legado
   * (`payload.name`, renomeia a primeira/única tabela do pacote). O slug é
   * sempre derivado do nome — o relacionamento entre tabelas é preservado
   * porque o resto do fluxo continua chaveado pelo `originalSlug`.
   */
  private computeRenames(
    payload: ImportTableUseCasePayload,
    pkg: NormalizedPackage,
  ): Map<string, { name: string; slug: string }> {
    const renames = new Map<string, { name: string; slug: string }>();

    const buildRename = (
      rawName: string,
    ): { name: string; slug: string } | null => {
      const name = rawName.trim();
      if (!name) return null;
      const slug = this.slugService.normalize(name);
      if (!slug) return null;
      return { name, slug };
    };

    // API nova: renomeação explícita por slug original.
    if (payload.tables && payload.tables.length > 0) {
      const knownSlugs = new Set(
        pkg.tables
          .map((t) => t.structure?.slug)
          .filter((s): s is string => Boolean(s)),
      );
      for (const entry of payload.tables) {
        if (!knownSlugs.has(entry.slug)) continue;
        const rename = buildRename(entry.name);
        if (rename) renames.set(entry.slug, rename);
      }
      return renames;
    }

    // Legado: `name` renomeia a primeira/única tabela do pacote.
    if (payload.name && pkg.tables.length === 1 && pkg.tables[0].structure) {
      const rename = buildRename(payload.name);
      if (rename) renames.set(pkg.tables[0].structure.slug, rename);
    }

    return renames;
  }

  /**
   * Monta o mapa de renomeações de menus (`slug` original → `{ name, slug }`).
   * Só vale para itens de menu em conflito — menus-pai existentes são
   * reaproveitados (ver `getMenuParentOriginalIds` / `importMenus`).
   */
  private computeMenuRenames(
    payload: ImportTableUseCasePayload,
    pkg: NormalizedPackage,
  ): Map<string, { name: string; slug: string }> {
    const renames = new Map<string, { name: string; slug: string }>();
    if (!payload.menus || payload.menus.length === 0) return renames;

    const knownSlugs = new Set(pkg.menus.map((m) => m.slug));
    for (const entry of payload.menus) {
      if (!knownSlugs.has(entry.slug)) continue;
      const name = entry.name.trim();
      if (!name) continue;
      const slug = this.slugService.normalize(name);
      if (!slug) continue;
      renames.set(entry.slug, { name, slug });
    }
    return renames;
  }

  /**
   * `_originalId` dos menus que são **pai** de algum outro menu do pacote.
   * Esses menus são reaproveitados quando já existem no DB — só os itens
   * "folha" (não-pais) podem entrar em conflito e ser renomeados.
   */
  private getMenuParentOriginalIds(menus: ExportedMenu[]): Set<string> {
    return new Set(
      menus.map((m) => m.parent).filter((p): p is string => Boolean(p)),
    );
  }

  // ── Conflict detection ─────────────────────────────────────

  /**
   * Detecta conflitos contra o DB **e** entre as próprias renomeações do
   * pacote. As listas de erro carregam sempre o `originalSlug` da tabela —
   * assim o frontend consegue destacar a tabela certa no formulário,
   * independentemente do slug final escolhido.
   */
  private async detectConflicts(
    pkg: NormalizedPackage,
    renames: Map<string, { name: string; slug: string }>,
    menuRenames: Map<string, { name: string; slug: string }>,
  ): Promise<HTTPException | null> {
    const conflictingTables: string[] = []; // originalSlugs
    const duplicateTables: string[] = []; // originalSlugs colidindo dentro do pacote
    const seenSlugs = new Map<string, string>(); // newSlug → originalSlug

    for (const t of pkg.tables) {
      if (!t.structure) continue;
      const originalSlug = t.structure.slug;
      const newSlug = renames.get(originalSlug)?.slug ?? originalSlug;

      if (seenSlugs.has(newSlug)) {
        duplicateTables.push(originalSlug);
      } else {
        seenSlugs.set(newSlug, originalSlug);
      }

      // Slug é a chave da coleção dinâmica de dados — precisa ser único entre
      // TODAS as tabelas, inclusive as que estão na lixeira. Importar sobre um
      // slug "trashed" duplicaria a collection e mesclaria os registros.
      const existing = await this.tableRepository.findBySlug(newSlug);
      if (existing) conflictingTables.push(originalSlug);
    }

    // Duas tabelas do pacote acabariam com o mesmo slug — bloqueia antes do DB.
    if (duplicateTables.length > 0) {
      return HTTPException.BadRequest(
        'Há tabelas com nomes que geram o mesmo slug. Use nomes distintos.',
        'DUPLICATE_TABLE_SLUGS',
        { tables: duplicateTables.join(',') },
      );
    }

    // Menus: itens "pai" são reaproveitados quando já existem — nunca
    // conflitam. Só os itens folha (não referenciados como pai) podem
    // conflitar e ser renomeados. `errors.menus` carrega o slug original.
    const parentOriginalIds = this.getMenuParentOriginalIds(pkg.menus);
    const conflictingMenus: string[] = []; // slugs originais
    const duplicateMenus: string[] = []; // slugs originais colidindo no pacote
    const seenMenuSlugs = new Set<string>();

    for (const m of pkg.menus) {
      if (parentOriginalIds.has(m._originalId)) continue; // pai → reaproveitado
      const effectiveSlug = menuRenames.get(m.slug)?.slug ?? m.slug;

      if (seenMenuSlugs.has(effectiveSlug)) {
        duplicateMenus.push(m.slug);
      } else {
        seenMenuSlugs.add(effectiveSlug);
      }

      const existing = await this.menuRepository.findBySlug(effectiveSlug, {
        trashed: false,
      });
      if (existing) conflictingMenus.push(m.slug);
    }

    if (duplicateMenus.length > 0) {
      return HTTPException.BadRequest(
        'Há itens de menu com nomes que geram o mesmo slug. Use nomes distintos.',
        'DUPLICATE_MENU_SLUGS',
        { menus: duplicateMenus.join(',') },
      );
    }

    if (conflictingTables.length === 0 && conflictingMenus.length === 0) {
      return null;
    }

    if (conflictingTables.length > 0 && conflictingMenus.length === 0) {
      // Mantém código legado para o caso single-table
      return HTTPException.BadRequest(
        'Já existe(m) tabela(s) com este(s) slug(s), inclusive na lixeira. Renomeie a(s) tabela(s) ou esvazie a lixeira e tente novamente.',
        'TABLE_SLUG_ALREADY_EXISTS',
        { tables: conflictingTables.join(',') },
      );
    }

    return HTTPException.BadRequest(
      'Conflitos de slug impedem a importação',
      'IMPORT_CONFLICTS',
      {
        tables: conflictingTables.join(','),
        menus: conflictingMenus.join(','),
      },
    );
  }

  // ── Phase A: skeleton creation ─────────────────────────────

  private async createTableSkeleton(args: {
    structure: ExportedStructure;
    newName: string;
    newSlug: string;
    ownerId: string;
    packageSlugs: Set<string>;
  }): Promise<{
    tableId: string;
    fieldSlugToId: Map<string, string>;
    fieldsIds: string[];
    allFields: IField[];
    groups: IGroupConfiguration[];
  }> {
    const { structure, newName, newSlug, ownerId, packageSlugs } = args;

    const nativeFields =
      await this.fieldRepository.createMany(FIELD_NATIVE_LIST);
    const allFields: IField[] = [...nativeFields];
    const fieldsIds: string[] = nativeFields.map((f) => f._id);
    const fieldSlugToId = new Map<string, string>();
    for (const nf of nativeFields) fieldSlugToId.set(nf.slug, nf._id);

    for (const exported of structure.fields) {
      const field = await this.createField(exported, packageSlugs);
      allFields.push(field);
      fieldsIds.push(field._id);
      fieldSlugToId.set(field.slug, field._id);
    }

    const groups: IGroupConfiguration[] = [];
    for (const group of structure.groups || []) {
      const groupFields: IField[] = [];

      const fieldGroupField = await this.fieldRepository.create({
        name: group.name,
        slug: group.slug,
        type: E_FIELD_TYPE.FIELD_GROUP,
        required: false,
        multiple: false,
        format: null,
        permissions: buildFieldPermissions(true, true, true),
        showInFilter: false,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
        defaultValue: null,
        relationship: null,
        dropdown: [],
        category: [],
        group: { slug: group.slug },
      });
      allFields.push(fieldGroupField);
      fieldsIds.push(fieldGroupField._id);
      fieldSlugToId.set(fieldGroupField.slug, fieldGroupField._id);

      const groupNativeList = FIELD_GROUP_NATIVE_LIST.map((f) => ({
        ...f,
        group: { slug: group.slug },
      }));
      const groupNativeFields =
        await this.fieldRepository.createMany(groupNativeList);
      for (const gnf of groupNativeFields) groupFields.push(gnf);

      for (const exported of group.fields) {
        const sub = await this.createField(
          { ...exported, group: { slug: group.slug } },
          packageSlugs,
        );
        groupFields.push(sub);
      }

      const groupSchema = this.schemaBuilder.build(groupFields);

      groups.push({
        slug: group.slug,
        name: group.name,
        fields: groupFields,
        _schema: groupSchema,
      });
    }

    const layoutFields: Record<string, string | null> = {};
    for (const [key, slugValue] of Object.entries(
      structure.layoutFields || {},
    )) {
      if (slugValue && fieldSlugToId.has(slugValue)) {
        layoutFields[key] = fieldSlugToId.get(slugValue) || null;
      } else {
        layoutFields[key] = null;
      }
    }

    const resolveOrder = (slugs: string[]): string[] =>
      (slugs || [])
        .map((s) => fieldSlugToId.get(s))
        .filter((id): id is string => Boolean(id));

    const _schema = this.schemaBuilder.build(allFields, groups);

    const createPayload: TableCreatePayload = {
      _schema,
      name: newName,
      slug: newSlug,
      description: structure.description ?? null,
      type: 'TABLE',
      logo: null,
      fields: fieldsIds,
      style: structure.style,
      permissions: null,
      members: [],
      owner: ownerId,
      fieldOrderList: resolveOrder(structure.fieldOrderList),
      fieldOrderForm: resolveOrder(structure.fieldOrderForm),
      fieldOrderFilter: resolveOrder(structure.fieldOrderFilter),
      fieldOrderDetail: resolveOrder(structure.fieldOrderDetail),
      methods: structure.methods || {
        onLoad: { code: null },
        beforeSave: { code: null },
        afterSave: { code: null },
      },
      groups,
      // chaves vêm do pacote importado (Record) e correspondem à forma fixa de
      // ILayoutFields — conversão de fronteira inevitável.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      layoutFields: layoutFields as ILayoutFields,
    };

    const created = await this.tableRepository.create(createPayload);

    return {
      tableId: created._id,
      fieldSlugToId,
      fieldsIds,
      allFields,
      groups,
    };
  }

  /**
   * Cria um field. Quando `relationship` aponta para uma tabela DENTRO do
   * pacote sendo importado, o relationship é deixado como null (resolvido na
   * fase B). Para tabelas FORA do pacote, tenta resolver contra o DB.
   */
  private async createField(
    exported: ExportedField,
    packageSlugs: Set<string>,
  ): Promise<IField> {
    let relationship: IField['relationship'] = null;

    if (
      exported.type === E_FIELD_TYPE.RELATIONSHIP &&
      exported.relationship &&
      !packageSlugs.has(exported.relationship.tableSlug)
    ) {
      const relatedTable = await this.tableRepository.findBySlug(
        exported.relationship.tableSlug,
      );
      if (relatedTable) {
        const relatedField = relatedTable.fields.find(
          (f) => f.slug === exported.relationship!.fieldSlug,
        );
        if (relatedField) {
          relationship = {
            table: { _id: relatedTable._id, slug: relatedTable.slug },
            field: { _id: relatedField._id, slug: relatedField.slug },
            order: exported.relationship.order,
          };
        }
      }
    }

    return this.fieldRepository.create({
      name: exported.name,
      slug: exported.slug,
      type: exported.type,
      required: exported.required,
      multiple: exported.multiple,
      format: exported.format,
      validations: exported.validations ?? [],
      permissions:
        exported.permissions ?? buildFieldPermissions(true, true, true),
      showInFilter: exported.showInFilter,
      showInParentList: exported.showInParentList,
      visibleInParentList: exported.visibleInParentList,
      widthInForm: exported.widthInForm,
      widthInList: exported.widthInList,
      widthInDetail: exported.widthInDetail,
      defaultValue: exported.defaultValue,
      locked: exported.locked,
      relationship,
      dropdown: exported.dropdown,
      category: exported.category,
      group: exported.group,
    });
  }

  // ── Phase B: resolve in-package relationships ──────────────

  private async resolvePackageRelationships(
    info: {
      structure: ExportedStructure;
      newSlug: string;
      fieldSlugToId?: Map<string, string>;
      tableId?: string;
      allFields?: IField[];
      groups?: IGroupConfiguration[];
    },
    tableSlugToInfo: Map<
      string,
      {
        newSlug: string;
        tableId?: string;
        fieldSlugToId?: Map<string, string>;
      }
    >,
  ): Promise<void> {
    if (!info.tableId || !info.allFields || !info.fieldSlugToId) return;

    const resolveOne = async (
      exported: ExportedField,
      currentFieldId: string,
    ): Promise<IField | null> => {
      if (
        exported.type !== E_FIELD_TYPE.RELATIONSHIP ||
        !exported.relationship
      ) {
        return null;
      }
      const ref = tableSlugToInfo.get(exported.relationship.tableSlug);
      if (!ref?.tableId || !ref.fieldSlugToId) return null;
      const targetFieldId = ref.fieldSlugToId.get(
        exported.relationship.fieldSlug,
      );
      if (!targetFieldId) return null;
      return this.fieldRepository.update({
        _id: currentFieldId,
        relationship: {
          table: { _id: ref.tableId, slug: ref.newSlug },
          field: { _id: targetFieldId, slug: exported.relationship.fieldSlug },
          order: exported.relationship.order,
        },
      });
    };

    let touched = false;
    const updatedAllFields = [...info.allFields];

    for (const exported of info.structure.fields) {
      const id = info.fieldSlugToId.get(exported.slug);
      if (!id) continue;
      const updated = await resolveOne(exported, id);
      if (updated) {
        touched = true;
        const idx = updatedAllFields.findIndex((f) => f._id === id);
        if (idx >= 0) updatedAllFields[idx] = updated;
      }
    }

    let updatedGroups: typeof info.groups = [];
    if (info.groups) updatedGroups = [...info.groups];
    for (const [gi, group] of (info.structure.groups || []).entries()) {
      const gconf = updatedGroups[gi];
      if (!gconf) continue;
      const newGroupFields = [...gconf.fields];
      for (const exported of group.fields) {
        const idInGroup = newGroupFields.find((f) => f.slug === exported.slug);
        if (!idInGroup) continue;
        const updated = await resolveOne(exported, idInGroup._id);
        if (updated) {
          touched = true;
          const idx = newGroupFields.findIndex((f) => f._id === idInGroup._id);
          if (idx >= 0) newGroupFields[idx] = updated;
          const idxAll = updatedAllFields.findIndex(
            (f) => f._id === idInGroup._id,
          );
          if (idxAll >= 0) updatedAllFields[idxAll] = updated;
        }
      }
      updatedGroups[gi] = {
        ...gconf,
        fields: newGroupFields,
        _schema: this.schemaBuilder.build(newGroupFields),
      };
    }

    if (touched) {
      const _schema = this.schemaBuilder.build(updatedAllFields, updatedGroups);
      await this.tableRepository.update({
        _id: info.tableId,
        _schema,
        groups: updatedGroups,
      });
      info.allFields = updatedAllFields;
      info.groups = updatedGroups;
    }
  }

  // ── Phase C/D: rows + backfill ────────────────────────────

  private stripRelationshipFields(
    row: Record<string, unknown>,
    table: ITable,
  ): Record<string, unknown> {
    const stripped: Record<string, unknown> = {};
    const relationshipSlugs = new Set<string>();
    for (const f of table.fields) {
      if (f.type === E_FIELD_TYPE.RELATIONSHIP) relationshipSlugs.add(f.slug);
    }
    for (const [key, value] of Object.entries(row)) {
      if (key === '_originalId' || key === '_id' || key === 'id') continue;
      // `_originalCreator` é tratado à parte (vira o `creator` da row na Fase C).
      if (key === '_originalCreator') continue;
      if (key === 'createdAt' || key === 'updatedAt') continue;
      if (relationshipSlugs.has(key)) continue;
      // For FIELD_GROUP, strip relationships within each subrow
      const fg = table.groups?.find((g) => g.slug === key);
      if (fg && Array.isArray(value)) {
        const subSlugs = new Set(
          fg.fields
            .filter((f) => f.type === E_FIELD_TYPE.RELATIONSHIP)
            .map((f) => f.slug),
        );
        stripped[key] = value.map((sub: Record<string, unknown>) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(sub)) {
            if (k === '_originalId') continue;
            // Restaura o criador original do subdocumento no campo nativo.
            if (k === '_originalCreator') {
              if (v) cleaned.creator = v;
              continue;
            }
            if (subSlugs.has(k)) continue;
            cleaned[k] = v;
          }
          return cleaned;
        });
        continue;
      }
      stripped[key] = value;
    }
    return stripped;
  }

  private async backfillRelationships(args: {
    table: ITable;
    rows: Array<Merge<Record<string, unknown>, { _originalId?: string }>>;
    rowIdMap: Map<string, Map<string, string>>;
    ownerSlug: string;
  }): Promise<void> {
    const { table, rows, rowIdMap, ownerSlug } = args;
    const myMap = rowIdMap.get(ownerSlug);
    if (!myMap) return;

    const relationshipFields = table.fields.filter(
      (f) => f.type === E_FIELD_TYPE.RELATIONSHIP && f.relationship,
    );
    const groupRelationships = new Map<string, IField[]>();
    for (const g of table.groups || []) {
      const rels = g.fields.filter(
        (f) => f.type === E_FIELD_TYPE.RELATIONSHIP && f.relationship,
      );
      if (rels.length) groupRelationships.set(g.slug, rels);
    }

    if (relationshipFields.length === 0 && groupRelationships.size === 0) {
      return;
    }

    for (const row of rows) {
      let originalRowId: string | null = null;
      if (row._originalId) originalRowId = String(row._originalId);
      let newRowId: string | null | undefined = null;
      if (originalRowId) newRowId = myMap.get(originalRowId);
      if (!newRowId) continue;

      const updateData: Record<string, unknown> = {};

      for (const field of relationshipFields) {
        const raw = row[field.slug];
        if (raw === undefined || raw === null) continue;
        const targetSlug = field.relationship!.table.slug;
        const remapped = this.remapRelationshipValue(raw, targetSlug, rowIdMap);
        if (remapped === undefined) continue;
        updateData[field.slug] = remapped;
      }

      for (const [groupSlug, rels] of groupRelationships.entries()) {
        const subRows = row[groupSlug];
        if (!Array.isArray(subRows)) continue;
        const newSubRows = subRows.map((sub: Record<string, unknown>) => {
          const updated: Record<string, unknown> = { ...sub };
          for (const f of rels) {
            const raw = sub[f.slug];
            if (raw === undefined || raw === null) continue;
            const remapped = this.remapRelationshipValue(
              raw,
              f.relationship!.table.slug,
              rowIdMap,
            );
            if (remapped !== undefined) updated[f.slug] = remapped;
          }
          return updated;
        });
        updateData[groupSlug] = newSubRows;
      }

      if (Object.keys(updateData).length === 0) continue;

      try {
        await this.rowRepository.update({
          table,
          _id: newRowId,
          data: updateData,
        });
      } catch (err) {
        console.error('[tools > import-table][row-backfill]:', err);
      }
    }
  }

  private remapRelationshipValue(
    value: unknown,
    targetTableSlug: string,
    rowIdMap: Map<string, Map<string, string>>,
  ): string | string[] | undefined {
    const target = rowIdMap.get(targetTableSlug);
    const remapOne = (v: unknown): string | null => {
      let id = String(v ?? '');
      if (typeof v === 'string') id = v;
      if (!id) return null;
      if (target?.has(id)) return target.get(id)!;
      // Target table is outside the package — return original (may match an
      // existing record if importing into the same DB or a snapshot of it).
      return id;
    };
    if (Array.isArray(value)) {
      const ids = value.map(remapOne).filter((v): v is string => Boolean(v));
      return ids;
    }
    const single = remapOne(value);
    return single ?? undefined;
  }

  // ── Phase E: menus ────────────────────────────────────────

  private async importMenus(args: {
    menus: ExportedMenu[];
    tableSlugToInfo: Map<
      string,
      { originalSlug: string; newSlug: string; tableId?: string }
    >;
    ownerId: string;
    menuRenames: Map<string, { name: string; slug: string }>;
  }): Promise<number> {
    const { menus, tableSlugToInfo, ownerId, menuRenames } = args;
    if (menus.length === 0) return 0;

    const tableSlugMap = new Map<string, { id: string; newSlug: string }>();
    for (const info of tableSlugToInfo.values()) {
      if (info.tableId) {
        tableSlugMap.set(info.originalSlug, {
          id: info.tableId,
          newSlug: info.newSlug,
        });
      }
    }

    const byOriginalId = new Map<string, ExportedMenu>();
    for (const m of menus) byOriginalId.set(m._originalId, m);

    const parentOriginalIds = this.getMenuParentOriginalIds(menus);
    const newIdByOriginalId = new Map<string, string>();
    const created = new Set<string>();
    let importedCount = 0;

    const createMenu = async (menu: ExportedMenu): Promise<void> => {
      if (created.has(menu._originalId)) return;
      // Ensure parent is created first
      if (menu.parent) {
        const parent = byOriginalId.get(menu.parent);
        if (parent && !created.has(parent._originalId)) {
          await createMenu(parent);
        }
      }

      const isParent = parentOriginalIds.has(menu._originalId);

      // Menu-pai já existente é REAPROVEITADO — os filhos passam a apontar
      // para o item existente em vez de recriá-lo.
      if (isParent) {
        const existingParent = await this.menuRepository.findBySlug(menu.slug, {
          trashed: false,
        });
        if (existingParent) {
          newIdByOriginalId.set(menu._originalId, existingParent._id);
          created.add(menu._originalId);
          return;
        }
      }

      // Itens folha em conflito podem ter sido renomeados; pais nunca.
      let rename = undefined;
      if (!isParent) rename = menuRenames.get(menu.slug);
      const slug = rename?.slug ?? menu.slug;
      const name = rename?.name ?? menu.name;

      let tableId: string | null = null;
      let url: string | null = menu.url;
      let type = menu.type;
      if (menu.tableSlug) {
        const ref = tableSlugMap.get(menu.tableSlug);
        if (ref) {
          tableId = ref.id;
          if (type === E_MENU_ITEM_TYPE.TABLE) {
            url = '/tables/'.concat(ref.newSlug);
          } else if (type === E_MENU_ITEM_TYPE.FORM) {
            url = '/tables/'.concat(ref.newSlug).concat('/row/create');
          }
        } else {
          // Linked table is missing — fall back to SEPARATOR
          type = E_MENU_ITEM_TYPE.SEPARATOR;
          url = null;
        }
      }

      let parentId: string | null = null;
      if (menu.parent) parentId = newIdByOriginalId.get(menu.parent) ?? null;

      try {
        const newMenu = await this.menuRepository.create({
          name,
          slug,
          type,
          table: tableId,
          parent: parentId,
          url,
          html: menu.html,
          owner: ownerId,
          order: menu.order,
          isInitial: false,
          extension: menu.extension ?? null,
        });
        newIdByOriginalId.set(menu._originalId, newMenu._id);
        created.add(menu._originalId);
        importedCount++;
      } catch (err) {
        console.error('[tools > import-table][menu-create]:', err);
      }
    };

    for (const menu of menus) {
      await createMenu(menu);
    }

    return importedCount;
  }
}
