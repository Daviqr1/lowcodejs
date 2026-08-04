import type {
  E_TABLE_STYLE,
  IField,
  IGroupConfiguration,
  ITable,
  ValueOf,
} from '@application/core/entity.core';

import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from '../clone-table.types';

export type TemplateFieldSet = {
  fields: IField[];
  groups?: IGroupConfiguration[];
  orderList: string[];
  orderForm: string[];
  orderFilter: string[];
  orderDetail: string[];
};

export type TemplateSeedContext = {
  table: ITable;
  fields: IField[];
  payload: CloneTableUseCasePayload;
  deps: CloneTableDeps;
};

/**
 * O que muda de um template built-in para outro. O esqueleto (criar nativos,
 * montar o `_schema`, ordenar e gravar a tabela) e identico nos seis e vive no
 * service.
 */
export type TableTemplateDescriptor = {
  description: string;
  style: ValueOf<typeof E_TABLE_STYLE>;
  /** Codigo do `beforeSave` gravado na tabela; `null` quando nao ha. */
  beforeSave: string | null;
  buildFields(deps: CloneTableDeps): Promise<TemplateFieldSet>;
  /** Registro inicial opcional criado logo apos a tabela (ex.: canal do forum). */
  seed?(context: TemplateSeedContext): Promise<void>;
};

export abstract class TableTemplateContractService {
  /** `null` quando o id nao e de um template built-in. */
  abstract findById(baseTableId: string): TableTemplateDescriptor | null;
  abstract create(
    descriptor: TableTemplateDescriptor,
    payload: CloneTableUseCasePayload,
    deps: CloneTableDeps,
  ): Promise<CloneTableResponse>;
}
