/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import {
  E_FIELD_TYPE,
  E_NOTIFICATION_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import { NotificationContractService } from '@application/services/notification/notification-contract.service';

import {
  RowMemberNotificationContractService,
  type NotifyRowMembersParams,
} from './row-member-notification-contract.service';

const SUPPORTED_STYLES = new Set<string>([
  E_TABLE_STYLE.KANBAN,
  E_TABLE_STYLE.CALENDAR,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIdList(input: unknown): string[] {
  if (!Array.isArray(input)) {
    if (typeof input === 'string' && input.trim().length > 0)
      return [input.trim()];
    if (isRecord(input) && typeof input._id === 'string') return [input._id];
    return [];
  }
  const result: string[] = [];
  for (const value of input) {
    if (typeof value === 'string' && value.length > 0) result.push(value);
    else if (isRecord(value) && typeof value._id === 'string')
      result.push(value._id);
  }
  return result;
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

@Service()
export default class RowMemberNotificationService implements RowMemberNotificationContractService {
  constructor(
    private readonly notificationService: NotificationContractService,
  ) {}

  async notifyNewMembers(params: NotifyRowMembersParams): Promise<void> {
    if (!this.notificationService) {
      console.error(
        '[RowMemberNotificationService] notificationService não injetado — notificação ignorada',
      );
      return;
    }

    const { table, previousRow, nextRow, actorUserId } = params;
    if (!SUPPORTED_STYLES.has(table.style)) return;

    const userFields: IField[] = (table.fields ?? []).filter(
      (field) =>
        field.type === E_FIELD_TYPE.USER &&
        field.native !== true &&
        Boolean(field.slug),
    );
    if (userFields.length === 0) return;

    const isKanban = table.style === E_TABLE_STYLE.KANBAN;
    const titleField = (table.fields ?? []).find(
      (f) => f.slug === table.layoutFields?.title || f.slug === 'titulo',
    );
    let cardTitle = '';
    if (titleField) cardTitle = readString(nextRow[titleField.slug]);
    const rowId = readString(nextRow._id);

    const aggregatedNewIds = new Set<string>();
    for (const field of userFields) {
      let before = new Set<string>();
      if (previousRow) {
        before = new Set(normalizeIdList(previousRow[field.slug]));
      }
      const after = normalizeIdList(nextRow[field.slug]);
      for (const id of after) {
        if (!before.has(id) && id !== actorUserId) {
          aggregatedNewIds.add(id);
        }
      }
    }

    if (aggregatedNewIds.size === 0) return;

    let baseTitle: string;
    if (isKanban) {
      baseTitle = 'Você foi atribuído a um card';
      if (cardTitle) baseTitle = `Você foi atribuído ao card "${cardTitle}"`;
    } else {
      baseTitle = 'Você foi adicionado a um evento';
      if (cardTitle) baseTitle = `Você foi adicionado ao evento "${cardTitle}"`;
    }

    let body = `Na agenda ${table.name}`;
    if (isKanban) body = `No quadro ${table.name}`;

    let actionLabel = 'Abrir evento';
    if (isKanban) actionLabel = 'Abrir card';

    await this.notificationService.notify({
      userIds: Array.from(aggregatedNewIds),
      type: E_NOTIFICATION_TYPE.ROW_MEMBER_ASSIGNED,
      title: baseTitle,
      body,
      action: {
        type: 'route',
        href: `/tables/${table.slug}?rowId=${rowId}`,
        label: actionLabel,
      },
      source: {
        tableSlug: table.slug,
        rowId,
      },
      actorUserId,
    });
  }
}
