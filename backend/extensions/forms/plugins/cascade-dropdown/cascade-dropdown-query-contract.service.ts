import type mongoose from 'mongoose';

import type { IField, IRow, ITable } from '@application/core/entity.core';
import type { Entity } from '@application/services/table/model-builder.service';

import type {
  CascadeDropdownConfig,
  CascadeDropdownFilter,
} from './cascade-dropdown.types';

export type CascadeQueryOptions = {
  parentValue?: string;
  search?: string;
  childField?: IField;
};

/**
 * Leitura das collections dinamicas a partir de uma config de cascade: monta a
 * query mongo, resolve o model da tabela e traduz valor bruto em label.
 */
export abstract class CascadeDropdownQueryContractService {
  /** O front manda id; configs antigas so tem slug. Aceita os dois. */
  abstract findFieldByIdOrSlug(
    fields: IField[],
    id: string,
    slug: string,
  ): IField | undefined;
  abstract fieldId(field: IField): string;
  abstract compactString(value: unknown): string;
  /** Achata valor escalar ou array num array de strings nao vazias. */
  abstract toValueArray(value: unknown): string[];
  abstract buildFieldCondition(
    field: IField,
    filter: Pick<
      CascadeDropdownFilter,
      'operator' | 'value' | 'values' | 'dateStart' | 'dateEnd'
    >,
  ): unknown;
  abstract buildQueryFromConfig(
    table: ITable,
    config: CascadeDropdownConfig,
    options?: CascadeQueryOptions,
  ): Record<string, unknown>;
  abstract getModel(table: ITable): Promise<mongoose.Model<Entity>>;
  abstract transformRows(
    rows: Array<{ toJSON(opts: { flattenObjectIds: boolean }): IRow }>,
  ): IRow[];
  /** Label de opcao de DROPDOWN/CATEGORY; devolve o proprio valor se nao achar. */
  abstract getConfiguredOptionLabel(field: IField, value: string): string;
  /** Labels de um campo RELATIONSHIP, lendo a tabela relacionada. */
  abstract getRelationshipOptionLabels(
    field: IField,
    values: string[],
  ): Promise<Map<string, string>>;
  /**
   * Config gravada **e** ainda coerente com o schema atual das duas tabelas.
   * `null` quando qualquer campo referenciado sumiu, foi pra lixeira, virou
   * nativo, mudou de tipo ou deixou de apontar para a mesma tabela.
   */
  abstract findUsableConfig(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null>;
}
