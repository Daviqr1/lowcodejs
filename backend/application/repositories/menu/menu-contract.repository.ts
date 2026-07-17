import type { FindOptions, IMenu, Merge } from '@application/core/entity.core';

export type MenuCreatePayload = Merge<
  Pick<IMenu, 'name' | 'slug' | 'type'>,
  Partial<
    Pick<
      IMenu,
      | 'table'
      | 'parent'
      | 'url'
      | 'html'
      | 'icon'
      | 'owner'
      | 'order'
      | 'isInitial'
      | 'extension'
      | 'visibility'
    >
  >
>;

export type MenuUpdatePayload = Merge<
  Pick<IMenu, '_id'>,
  Merge<
    Partial<MenuCreatePayload>,
    {
      trashed?: boolean;
      trashedAt?: Date | null;
    }
  >
>;

export type MenuQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  trashed?: boolean;
  parent?: string | null;
  sort?: Record<string, 'asc' | 'desc'>;
};

export type MenuUpdateManyPayload = {
  _ids: string[];
  filterTrashed?: boolean;
  data: {
    trashed?: boolean;
    trashedAt?: Date | null;
    isInitial?: boolean;
  };
};

export abstract class MenuContractRepository {
  abstract create(payload: MenuCreatePayload): Promise<IMenu>;
  abstract findById(_id: string, options?: FindOptions): Promise<IMenu | null>;
  abstract findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IMenu | null>;
  abstract findMany(payload?: MenuQueryPayload): Promise<IMenu[]>;
  abstract findManyTrashed(): Promise<IMenu[]>;
  abstract update(payload: MenuUpdatePayload): Promise<IMenu>;
  abstract updateMany(payload: MenuUpdateManyPayload): Promise<number>;
  abstract delete(_id: string): Promise<void>;
  abstract deleteMany(_ids: string[]): Promise<number>;
  abstract count(payload?: MenuQueryPayload): Promise<number>;
  abstract findDescendantIds(menuId: string): Promise<string[]>;
  abstract setOnlyInitial(_id: string): Promise<void>;
}
