import type { RootFilterQuery, SortOrder } from 'mongoose';
import mongoose from 'mongoose';

import type { IField, IGroupConfiguration, IRow } from '../entity.core';
import { E_FIELD_TYPE } from '../entity.core';

import { findReverseRelationships } from './model-builder';

type Query = Record<string, unknown>;

export function normalize(search: string): string {
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapedSearch
    .replace(/a/gi, '[aáàâãä]')
    .replace(/e/gi, '[eéèêë]')
    .replace(/i/gi, '[iíìîï]')
    .replace(/o/gi, '[oóòôõö]')
    .replace(/u/gi, '[uúùûü]')
    .replace(/c/gi, '[cç]')
    .replace(/n/gi, '[nñ]');
}

export async function buildQuery(
  {
    search,
    trashed,
    page: _page,
    perPage: _perPage,
    slug: _slug,
    public: _public,
    ...payload
  }: Partial<Query>,
  fields: IField[] = [],
  groups?: IGroupConfiguration[],
  tableSlug?: string,
  conn?: mongoose.Connection,
): Promise<Query> {
  let query: Query = {
    trashed: trashed === 'true' ? true : { $ne: true },
  };

  for (const field of fields.filter(
    (f) => f.type !== E_FIELD_TYPE.FIELD_GROUP,
  )) {
    const slug = String(field.slug?.toString());

    if (
      (field.type === E_FIELD_TYPE.TEXT_SHORT ||
        field.type === E_FIELD_TYPE.TEXT_LONG) &&
      payload[slug]
    ) {
      query[slug] = {
        $regex: normalize(String(payload[slug])),
        $options: 'i',
      };
    }

    if (
      (field.type === E_FIELD_TYPE.RELATIONSHIP ||
        field.type === E_FIELD_TYPE.DROPDOWN ||
        field.type === E_FIELD_TYPE.CATEGORY ||
        field.type === E_FIELD_TYPE.USER ||
        field.type === E_FIELD_TYPE.CREATOR) &&
      payload[slug]
    ) {
      query[slug] = {
        $in: String(payload[slug]).split(','),
      };
    }

    if (
      field.type === E_FIELD_TYPE.DATE ||
      field.type === E_FIELD_TYPE.CREATED_AT
    ) {
      const initialKey = `${slug}-initial`;
      const finalKey = `${slug}-final`;
      const dateFilter: { $gte?: Date; $lte?: Date } = {};

      if (payload[initialKey]) {
        const initial = new Date(String(payload[initialKey]));
        dateFilter.$gte = new Date(initial.setUTCHours(0, 0, 0, 0));
      }

      if (payload[finalKey]) {
        const final = new Date(String(payload[finalKey]));
        dateFilter.$lte = new Date(final.setUTCHours(23, 59, 59, 999));
      }

      if (dateFilter.$gte || dateFilter.$lte) {
        query[field.slug] = dateFilter;
      }
    }
  }

  // Query em campos FIELD_GROUP usando dot notation (embedded documents)
  const hasFieldGroupQuery = fields.some((f) => {
    if (f.type !== E_FIELD_TYPE.FIELD_GROUP) return false;
    const groupPrefix = f.slug.concat('-');
    return Object.keys(payload).some((key) => key.startsWith(groupPrefix));
  });

  if (hasFieldGroupQuery && groups) {
    for (const field of fields.filter(
      (f) => f.type === E_FIELD_TYPE.FIELD_GROUP,
    )) {
      const groupSlug = field?.group?.slug;
      const group = groups.find((g) => g.slug === groupSlug);

      if (!group) continue;

      const groupFields = group.fields || [];

      for (const groupField of groupFields) {
        const payloadKey = `${field.slug}-${groupField.slug}`;
        const embeddedPath = `${field.slug}.${groupField.slug}`;

        if (!(payloadKey in payload)) continue;

        if (
          groupField.type === E_FIELD_TYPE.TEXT_SHORT ||
          groupField.type === E_FIELD_TYPE.TEXT_LONG
        ) {
          query[embeddedPath] = {
            $regex: normalize(String(payload[payloadKey])),
            $options: 'i',
          };
        }

        if (
          groupField.type === E_FIELD_TYPE.RELATIONSHIP ||
          groupField.type === E_FIELD_TYPE.DROPDOWN ||
          groupField.type === E_FIELD_TYPE.CATEGORY ||
          groupField.type === E_FIELD_TYPE.USER ||
          groupField.type === E_FIELD_TYPE.CREATOR
        ) {
          query[embeddedPath] = {
            $in: String(payload[payloadKey]).split(','),
          };
        }

        if (groupField.type === E_FIELD_TYPE.DATE) {
          const initialKey = `${payloadKey}-initial`;
          const finalKey = `${payloadKey}-final`;
          const dateFilter: { $gte?: Date; $lte?: Date } = {};

          if (payload[initialKey]) {
            const initial = new Date(String(payload[initialKey]));
            dateFilter.$gte = new Date(initial.setUTCHours(0, 0, 0, 0));
          }

          if (payload[finalKey]) {
            const final = new Date(String(payload[finalKey]));
            dateFilter.$lte = new Date(final.setUTCHours(23, 59, 59, 999));
          }

          if (dateFilter.$gte || dateFilter.$lte) {
            query[embeddedPath] = dateFilter;
          }
        }
      }
    }
  }

  if (search) {
    const searchStr = String(search);
    const searchQuery: Query[] = [];

    for (const field of fields.filter(
      (f) => f.type !== E_FIELD_TYPE.FIELD_GROUP && !f.native,
    )) {
      if (
        field?.type === E_FIELD_TYPE.TEXT_LONG ||
        field?.type === E_FIELD_TYPE.TEXT_SHORT
      ) {
        const slug = String(field.slug?.toString());
        searchQuery.push({
          [slug]: {
            $regex: normalize(searchStr),
            $options: 'i',
          },
        });
      }
    }

    if (groups) {
      for (const field of fields.filter(
        (f) => f.type === E_FIELD_TYPE.FIELD_GROUP,
      )) {
        const groupSlug = field?.group?.slug;
        const group = groups.find((g) => g.slug === groupSlug);

        if (!group) continue;

        for (const groupField of group.fields || []) {
          if (
            groupField.type === E_FIELD_TYPE.TEXT_LONG ||
            groupField.type === E_FIELD_TYPE.TEXT_SHORT
          ) {
            const embeddedPath = `${field.slug}.${groupField.slug}`;
            searchQuery.push({
              [embeddedPath]: {
                $regex: normalize(searchStr),
                $options: 'i',
              },
            });
          }
        }
      }
    }

    if (searchQuery.length > 0) {
      query = {
        $and: [{ ...query }, { $or: searchQuery }],
      };
    }
  }

  // === FILTRO EM VIRTUAL RELATIONSHIPS (Reverse Lookup) ===
  if (tableSlug) {
    const reverseRelationships = await findReverseRelationships(tableSlug);

    for (const rel of reverseRelationships) {
      if (!payload[rel.virtualName]) continue;

      const filterIds = String(payload[rel.virtualName]).split(',');

      const db = conn?.db ?? mongoose.connection.db!;
      const sourceCollection = db.collection(rel.sourceTableSlug);

      const sourceRecords = await sourceCollection
        .find(
          {
            _id: {
              $in: filterIds.map(
                (id: string) => new mongoose.Types.ObjectId(id),
              ),
            },
          },
          { projection: { [rel.fieldSlug]: 1 } },
        )
        .toArray();

      const matchingIds = new Set<string>();
      for (const record of sourceRecords) {
        const fieldValue = record[rel.fieldSlug];
        if (Array.isArray(fieldValue)) {
          fieldValue.forEach((id) => matchingIds.add(id.toString()));
        } else if (fieldValue) {
          matchingIds.add(fieldValue.toString());
        }
      }

      const idCondition =
        matchingIds.size > 0
          ? {
              _id: {
                $in: [...matchingIds].map(
                  (id) => new mongoose.Types.ObjectId(id),
                ),
              },
            }
          : { _id: { $in: [] } };

      if (Array.isArray(query.$and)) {
        query = { $and: [...query.$and, idCondition] };
      } else {
        query = { $and: [query, idCondition] };
      }
    }
  }

  return query;
}

export type QueryOrder = Record<
  string,
  | number
  | string
  | boolean
  | null
  | unknown
  | RootFilterQuery<IRow>
  | QueryOrder[]
>;

export function buildOrder(
  query: Partial<QueryOrder>,
  fields: IField[] = [],
  tableOrder?: { field: string; direction: 'asc' | 'desc' } | null,
): {
  [key: string]: SortOrder;
} {
  const order: { [key: string]: SortOrder } = {};

  for (const col of fields) {
    if (!col?.type || !col.slug) continue;

    const queryKey = 'order-'.concat(col.slug);

    if (queryKey in query) {
      const sortValue = query[queryKey]?.toString();
      order[col.slug] = sortValue === 'asc' ? 1 : -1;
    }
  }

  if (Object.keys(order).length === 0 && tableOrder?.field) {
    order[tableOrder.field] = tableOrder.direction === 'asc' ? 1 : -1;
  }

  return order;
}
