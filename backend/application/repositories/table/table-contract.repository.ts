import type {
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FindOptions,
  IGroupConfiguration,
  ILayoutFields,
  ITable,
  ITableMember,
  ITableMethod,
  ITablePermissions,
  ITableSchema,
  Merge,
  ValueOf,
} from '@application/core/entity.core';

export type TableCreatePayload = Merge<
  Pick<ITable, 'name' | 'slug'>,
  {
    _schema?: ITableSchema;
    description?: string | null;
    logo?: string | null;
    fields?: string[];
    type?: ValueOf<typeof E_TABLE_TYPE>;
    style?: ValueOf<typeof E_TABLE_STYLE>;
    owner: string;
    permissions?: ITablePermissions | null;
    members?: ITableMember[];
    fieldOrderList?: string[];
    fieldOrderForm?: string[];
    fieldOrderFilter?: string[];
    fieldOrderDetail?: string[];
    methods?: ITableMethod;
    groups?: IGroupConfiguration[];
    order?: { field: string; direction: 'asc' | 'desc' } | null;
    layoutFields?: ILayoutFields;
    rowSlugFieldId?: string | null;
  }
>;

export type TableUpdatePayload = Merge<
  Merge<Pick<ITable, '_id'>, Partial<Omit<TableCreatePayload, 'owner'>>>,
  {
    owner?: string;
    trashed?: boolean;
    trashedAt?: Date | null;
    groups?: IGroupConfiguration[];
  }
>;

export type TableQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  type?: ValueOf<typeof E_TABLE_TYPE>;
  owner?: string[];
  trashed?: boolean;
  _ids?: string[];
  sort?: Record<string, 'asc' | 'desc'>;
};

export type TableUpdateManyPayload = {
  _ids: string[];
  type?: ValueOf<typeof E_TABLE_TYPE>;
  filterTrashed?: boolean;
  data: {
    style?: ValueOf<typeof E_TABLE_STYLE>;
    trashed?: boolean;
    trashedAt?: Date | null;
  };
};

export abstract class TableContractRepository {
  abstract create(payload: TableCreatePayload): Promise<ITable>;
  abstract findById(_id: string, options?: FindOptions): Promise<ITable | null>;
  abstract findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<ITable | null>;
  abstract findMany(payload?: TableQueryPayload): Promise<ITable[]>;
  abstract update(payload: TableUpdatePayload): Promise<ITable>;
  abstract updateMany(payload: TableUpdateManyPayload): Promise<number>;
  abstract delete(_id: string): Promise<void>;
  abstract count(payload?: TableQueryPayload): Promise<number>;
  abstract renameSlug(oldSlug: string, newSlug: string): Promise<void>;
  abstract dropCollection(slug: string): Promise<void>;
  abstract findByFieldIds(fieldIds: string[]): Promise<ITable[]>;
}
