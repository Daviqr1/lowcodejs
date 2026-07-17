import type {
  E_FIELD_TYPE,
  FieldCreatePayload,
  FindOptions,
  IField,
  Merge,
  ValueOf,
} from '@application/core/entity.core';

export type { FieldCreatePayload };

export type FieldUpdatePayload = Merge<
  Pick<IField, '_id'>,
  Merge<
    Partial<FieldCreatePayload>,
    {
      trashed?: boolean;
      trashedAt?: Date | null;
    }
  >
>;

export type FieldQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  type?: ValueOf<typeof E_FIELD_TYPE>;
  _ids?: string[];
};

export abstract class FieldContractRepository {
  abstract create(payload: FieldCreatePayload): Promise<IField>;
  abstract createMany(payloads: FieldCreatePayload[]): Promise<IField[]>;
  abstract findById(_id: string, options?: FindOptions): Promise<IField | null>;
  abstract findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IField | null>;
  abstract findMany(payload?: FieldQueryPayload): Promise<IField[]>;
  abstract update(payload: FieldUpdatePayload): Promise<IField>;
  abstract delete(_id: string): Promise<void>;
  abstract deleteMany(_ids: string[]): Promise<void>;
  abstract count(payload?: FieldQueryPayload): Promise<number>;
  abstract updateRelationshipTableSlug(
    tableId: string,
    newSlug: string,
  ): Promise<void>;
  abstract findByRelationshipTableId(tableId: string): Promise<IField[]>;
}
