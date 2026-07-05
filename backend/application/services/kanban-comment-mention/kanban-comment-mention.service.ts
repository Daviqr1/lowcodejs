import { Service } from 'fastify-decorators';

import {
  E_NOTIFICATION_TYPE,
  E_USER_STATUS,
} from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { EmailContractService } from '@application/services/email/email-contract.service';
import { NotificationContractService } from '@application/services/notification/notification-contract.service';
import { Env } from '@start/env';

import {
  KanbanCommentMentionContractService,
  type NotifyMentionsParams,
  type NotifyMentionsResult,
} from './kanban-comment-mention-contract.service';

const MENTIONS_SLUG = 'mencoes';
const MENTIONS_NOTIFIED_SLUG = 'mencoes-notificadas';
const COMMENT_TEXT_SLUG = 'comentario';
const TITLE_SLUG = 'titulo';
const SNIPPET_LIMIT = 200;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (isObjectRecord(value)) return value;
  return {};
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function normalizeIdList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const result: string[] = [];
  for (const value of input) {
    if (typeof value === 'string' && value.length > 0) {
      result.push(value);
      continue;
    }
    if (isObjectRecord(value)) {
      const id = value._id;
      if (typeof id === 'string' && id.length > 0) {
        result.push(id);
      }
    }
  }
  return result;
}

function parseNotifiedList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((x): x is string => typeof x === 'string');
  }
  if (typeof input === 'string' && input.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      return [];
    }
  }
  return [];
}

function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSnippet(rawText: string): string {
  const stripped = stripMarkdown(rawText).slice(0, SNIPPET_LIMIT);
  if (stripped.length >= SNIPPET_LIMIT) return `${stripped}...`;
  return stripped;
}

@Service()
export default class KanbanCommentMentionService implements KanbanCommentMentionContractService {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly emailService: EmailContractService,
    private readonly notificationService: NotificationContractService,
  ) {}

  async notifyNewMentions(
    params: NotifyMentionsParams,
  ): Promise<NotifyMentionsResult> {
    const { table, row, actorUserId } = params;

    const group = table.groups?.find(
      (g) =>
        g.fields.some((f) => f.slug === MENTIONS_SLUG) &&
        g.fields.some((f) => f.slug === MENTIONS_NOTIFIED_SLUG),
    );
    if (!group) return { changed: false };

    const rowRecord = asRecord(row);
    const items = rowRecord[group.slug];
    if (!Array.isArray(items) || items.length === 0) {
      return { changed: false };
    }

    const titleField = table.fields?.find((f) => f.slug === TITLE_SLUG);
    let cardTitle = '';
    if (titleField) {
      cardTitle = readString(rowRecord[titleField.slug]);
    }

    let changed = false;
    const updatedItems = await Promise.all(
      items.map((item): Promise<Record<string, unknown>> => {
        return this.processItem({
          record: asRecord(item),
          table,
          row,
          actorUserId,
          cardTitle,
          markChanged: () => {
            changed = true;
          },
        });
      }),
    );

    if (!changed) return { changed: false };
    return { changed: true, data: { [group.slug]: updatedItems } };
  }

  private async processItem(args: {
    record: Record<string, unknown>;
    table: NotifyMentionsParams['table'];
    row: NotifyMentionsParams['row'];
    actorUserId: string;
    cardTitle: string;
    markChanged: () => void;
  }): Promise<Record<string, unknown>> {
    const { record, table, row, actorUserId, cardTitle, markChanged } = args;

    const mentions = normalizeIdList(record[MENTIONS_SLUG]);
    const notified = parseNotifiedList(record[MENTIONS_NOTIFIED_SLUG]);
    const pending = mentions.filter(
      (id) => id.length > 0 && id !== actorUserId && !notified.includes(id),
    );
    if (pending.length === 0) return record;

    const users = await this.userRepository.findMany({
      _ids: pending,
      status: E_USER_STATUS.ACTIVE,
    });
    const recipientIds: string[] = [];
    const emails: string[] = [];
    for (const user of users) {
      const id = readString(user._id);
      const email = readString(user.email).trim().toLowerCase();
      if (id.length === 0) continue;
      if (email.length === 0) continue;
      recipientIds.push(id);
      emails.push(email);
    }
    if (emails.length === 0) return record;

    await this.dispatchEmail({
      emails,
      table,
      row,
      cardTitle,
      commentText: readString(record[COMMENT_TEXT_SLUG]),
    });

    await this.dispatchInAppNotification({
      recipientIds,
      actorUserId,
      table,
      row,
      cardTitle,
      commentText: readString(record[COMMENT_TEXT_SLUG]),
    });

    const newNotified = Array.from(new Set([...notified, ...recipientIds]));
    markChanged();
    return {
      ...record,
      [MENTIONS_NOTIFIED_SLUG]: JSON.stringify(newNotified),
    };
  }

  private async dispatchEmail(args: {
    emails: string[];
    table: NotifyMentionsParams['table'];
    row: NotifyMentionsParams['row'];
    cardTitle: string;
    commentText: string;
  }): Promise<void> {
    const { emails, table, row, cardTitle, commentText } = args;
    try {
      const snippet = buildSnippet(commentText);
      const data: Record<string, string> = {};
      if (table.name) data['Tabela'] = table.name;
      if (cardTitle) data['Card'] = cardTitle;
      if (snippet) data['Mensagem'] = snippet;
      const rowId = readString(asRecord(row)._id);
      data['Acessar'] =
        `${Env.APP_CLIENT_URL}/tables/${table.slug}/rows/${rowId}`;

      const body = await this.emailService.buildTemplate({
        template: 'notification',
        data: {
          title: 'Você foi mencionado em um card',
          message: 'Você recebeu uma menção em um comentário do Kanban.',
          data,
        },
      });
      await this.emailService.sendEmail({
        to: emails,
        subject: 'Você foi mencionado em um card',
        body,
      });
    } catch (error) {
      console.error('[kanban-comment-mention] erro ao notificar:', error);
    }
  }

  private async dispatchInAppNotification(args: {
    recipientIds: string[];
    actorUserId: string;
    table: NotifyMentionsParams['table'];
    row: NotifyMentionsParams['row'];
    cardTitle: string;
    commentText: string;
  }): Promise<void> {
    const { recipientIds, actorUserId, table, row, cardTitle, commentText } =
      args;
    if (!this.notificationService) {
      console.error(
        '[KanbanCommentMentionService] notificationService não injetado — notificação ignorada',
      );
      return;
    }
    if (recipientIds.length === 0) return;
    const rowId = readString(asRecord(row)._id);
    const snippet = buildSnippet(commentText);
    let title = 'Você foi mencionado em um card';
    if (cardTitle) title = `Você foi mencionado em "${cardTitle}"`;
    await this.notificationService.notify({
      userIds: recipientIds,
      type: E_NOTIFICATION_TYPE.KANBAN_COMMENT_MENTION,
      title,
      body: snippet,
      action: {
        type: 'route',
        href: `/tables/${table.slug}?rowId=${rowId}`,
        label: 'Abrir card',
      },
      source: {
        tableSlug: table.slug,
        rowId,
      },
      actorUserId,
    });
  }
}
