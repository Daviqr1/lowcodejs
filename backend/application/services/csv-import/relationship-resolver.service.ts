import { Service } from 'fastify-decorators';

/**
 * Helpers para resolver display values de campos RELATIONSHIP de volta para
 * ObjectIds durante a importação de CSV.
 *
 * Fluxo:
 *  1. Para cada coluna RELATIONSHIP no CSV, coleta os display values únicos.
 *  2. Busca os registros correspondentes na tabela alvo (batch, evita N+1).
 *  3. Monta um Map<displayLower, objectId> para lookup rápido no loop de rows.
 *
 * Decisões de design:
 *  - Valores 24-hex são tratados como ObjectIds diretos (bypass do resolver).
 *  - Display value ambíguo (>1 row) → mantém o primeiro match (warn no log).
 *  - Display value não resolvido → excluído do array; se field required e
 *    array vazio, validateRowPayload rejeita a row (contabilizada em skipped).
 */
import {
  E_FIELD_TYPE,
  type IField,
  type IRow,
} from '@application/core/entity.core';
import { OBJECT_ID_REGEX } from '@application/core/field-rules.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { RelationshipResolver } from './relationship-resolver-contract.service';
import { RelationshipResolverContractService } from './relationship-resolver-contract.service';

const DISPLAY_CANDIDATE_FIELDS = [
  'name',
  'title',
  'label',
  'email',
  'slug',
] as const;

function isObjectId(value: string): boolean {
  return OBJECT_ID_REGEX.test(value);
}

function pickDisplayValue(
  row: IRow,
  candidateFields: readonly string[],
): string | null {
  for (const slug of candidateFields) {
    const v = row[slug];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function buildCandidateSlugs(displayFieldSlug: string): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const slug of [displayFieldSlug, ...DISPLAY_CANDIDATE_FIELDS]) {
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

function collectDisplayValues(
  col: string,
  csvRows: Record<string, string>[],
): string[] {
  const unique = new Set<string>();
  for (const row of csvRows) {
    const rawCell = row[col] ?? '';
    if (!rawCell.trim()) continue;
    for (const part of rawCell.split(';')) {
      const trimmed = part.trim();
      if (trimmed && !isObjectId(trimmed)) {
        unique.add(trimmed);
      }
    }
  }
  return [...unique];
}

function buildDisplayToIdMap(
  relRows: IRow[],
  candidateSlugs: string[],
  relTableSlug: string,
): Map<string, string> {
  const displayToId = new Map<string, string>();
  for (const relRow of relRows) {
    const display = pickDisplayValue(relRow, candidateSlugs);
    if (!display) continue;
    const lower = display.toLowerCase();
    if (!displayToId.has(lower)) {
      displayToId.set(lower, relRow._id);
    } else {
      console.warn(
        `[csv-import:resolver] Valor ambíguo "${display}" na tabela "${relTableSlug}" — usando primeiro match`,
      );
    }
  }
  return displayToId;
}

function buildResolver(displayToId: Map<string, string>): RelationshipResolver {
  return (raw: string): string[] => {
    const ids: string[] = [];
    for (const part of raw.split(';')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (isObjectId(trimmed)) {
        ids.push(trimmed);
      } else {
        const id = displayToId.get(trimmed.toLowerCase());
        if (id) {
          ids.push(id);
        }
      }
    }
    return ids;
  };
}

@Service()
export default class RelationshipResolverService implements RelationshipResolverContractService {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async build(
    csvRows: Array<Record<string, string>>,
    fieldMap: Map<string, IField>,
  ): Promise<Map<string, RelationshipResolver>> {
    const resolverMap = new Map<string, RelationshipResolver>();

    for (const [col, field] of fieldMap) {
      if (field.type !== E_FIELD_TYPE.RELATIONSHIP) continue;
      if (!field.relationship) continue;

      const relTableSlug = field.relationship.table.slug;
      const displayFieldSlug = field.relationship.field.slug;
      const candidateSlugs = buildCandidateSlugs(displayFieldSlug);
      const displayValues = collectDisplayValues(col, csvRows);

      const relatedTable = await this.tableRepository.findBySlug(relTableSlug);
      if (!relatedTable) {
        resolverMap.set(col, (): string[] => []);
        continue;
      }

      let displayToId = new Map<string, string>();
      if (displayValues.length > 0) {
        const relRows = await this.rowRepository.findManyByFieldValues(
          relatedTable,
          candidateSlugs,
          displayValues,
        );
        displayToId = buildDisplayToIdMap(
          relRows,
          candidateSlugs,
          relTableSlug,
        );
      }

      resolverMap.set(col, buildResolver(displayToId));
    }

    return resolverMap;
  }
}
