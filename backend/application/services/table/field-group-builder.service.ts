import { Service } from 'fastify-decorators';
import type mongoose from 'mongoose';

import type {
  IEmbeddedSchema,
  IField,
  IGroupConfiguration,
} from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';

import { FieldFilterContractService } from './field-filter-contract.service';
import { FieldGroupBuilderContractService } from './field-group-builder-contract.service';
import { GROUP_POPULATE_BY_FIELD_TYPE } from './populate-map';

@Service()
export default class MongooseFieldGroupBuilder implements FieldGroupBuilderContractService {
  constructor(private readonly fieldFilter: FieldFilterContractService) {}

  buildEmbeddedSchema(
    field: IField,
    groups?: IGroupConfiguration[],
  ): Record<string, IEmbeddedSchema[]> {
    const groupSlug = field?.group?.slug;
    const group = groups?.find((g) => g.slug === groupSlug);
    return {
      [field.slug]: [
        {
          type: 'Embedded' as const,
          schema: group?._schema || {},
          required: Boolean(field.required || false),
        },
      ],
    };
  }

  buildPopulate(
    fields: IField[],
    groups: IGroupConfiguration[],
  ): mongoose.PopulateOptions[] {
    const populate: mongoose.PopulateOptions[] = [];

    for (const field of fields ?? []) {
      if (field.type !== E_FIELD_TYPE.FIELD_GROUP) continue;

      const groupSlug = field?.group?.slug;
      const group = groups.find((g) => g.slug === groupSlug);
      if (!group) continue;

      for (const groupField of group.fields || []) {
        const groupPopulate = GROUP_POPULATE_BY_FIELD_TYPE[groupField.type];
        if (groupPopulate) {
          populate.push({
            path: `${field.slug}.${groupField.slug}`,
            ...groupPopulate,
          });
        }

        // RELATIONSHIP não existe mais dentro de grupo (§2): é sempre top-level
        // e resolvido por links (migration 14 promoveu o legado). Sem ramo aqui.
      }
    }

    return populate;
  }

  buildFilter(
    payload: Record<string, unknown>,
    fields: IField[],
    groups?: IGroupConfiguration[],
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    const hasFieldGroupQuery = fields.some((f) => {
      if (f.type !== E_FIELD_TYPE.FIELD_GROUP) return false;
      const groupPrefix = f.slug.concat('-');
      return Object.keys(payload).some((key) => key.startsWith(groupPrefix));
    });

    if (!hasFieldGroupQuery || !groups) return filter;

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
          filter[embeddedPath] = this.fieldFilter.text(payload[payloadKey]);
        }

        if (
          groupField.type === E_FIELD_TYPE.RELATIONSHIP ||
          groupField.type === E_FIELD_TYPE.DROPDOWN ||
          groupField.type === E_FIELD_TYPE.CATEGORY ||
          groupField.type === E_FIELD_TYPE.USER ||
          groupField.type === E_FIELD_TYPE.USER_GROUP ||
          groupField.type === E_FIELD_TYPE.CREATOR ||
          groupField.type === E_FIELD_TYPE.UPDATER
        ) {
          filter[embeddedPath] = this.fieldFilter.refIn(payload[payloadKey]);
        }

        if (groupField.type === E_FIELD_TYPE.DATE) {
          const dateFilter = this.fieldFilter.dateRange(
            payload[`${payloadKey}-initial`],
            payload[`${payloadKey}-final`],
          );

          if (dateFilter) filter[embeddedPath] = dateFilter;
        }
      }
    }

    return filter;
  }

  buildSearch(
    search: string,
    fields: IField[],
    groups?: IGroupConfiguration[],
  ): Record<string, unknown>[] {
    const searchQuery: Record<string, unknown>[] = [];

    if (!groups) return searchQuery;

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
          searchQuery.push({ [embeddedPath]: this.fieldFilter.text(search) });
        }
      }
    }

    return searchQuery;
  }
}
