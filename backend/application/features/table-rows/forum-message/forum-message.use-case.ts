import { Service } from 'fastify-decorators';
import { randomUUID } from 'node:crypto';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
  type IGroupConfiguration,
  type IRow,
  type ITable,
} from '@application/core/entity.core';
import { E_NOTIFICATION_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { EmailQueueContractService } from '@application/services/email-queue/email-queue-contract.service';
import { NotificationContractService } from '@application/services/notification/notification-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';
import { Env } from '@start/env';

import type {
  ForumMessageCreatePayload,
  ForumMessageDeletePayload,
  ForumMessageMentionReadPayload,
  ForumMessageUpdatePayload,
} from '../_shared.validator';

type Response = Either<
  HTTPException,
  import('@application/core/entity.core').IRow
>;

type ForumConfig = {
  channelMembersSlug: string | null;
  channelPrivacySlug: string | null;
  messagesSlug: string;
  messageIdSlug: string;
  messageTextSlug: string;
  messageAuthorSlug: string;
  messageDateSlug: string;
  messageAttachmentsSlug: string;
  messageMentionsSlug: string;
  messageMentionEmailsSlug: string | null;
  messageMentionNotifiedSlug: string | null;
  messageMentionSeenSlug: string | null;
  messageReplySlug: string;
  messageReactionsSlug: string;
};

@Service()
export default class ForumMessageUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly emailQueue: EmailQueueContractService,
    private readonly rowRepository: RowContractRepository,
    private readonly notificationService: NotificationContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly typeGuard: TypeGuardContractService,
  ) {}

  async create(payload: ForumMessageCreatePayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      if (table.style !== E_TABLE_STYLE.FORUM)
        return left(
          HTTPException.BadRequest(
            'This endpoint is available only for forum tables',
            'FORUM_TABLE_REQUIRED',
          ),
        );

      const config = this.resolveForumConfig(table);

      if (!config)
        return left(
          HTTPException.BadRequest(
            'Forum messages field not found',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
          ),
        );

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (!(await this.canAccessChannel(table, row, config, payload.user)))
        return left(
          HTTPException.Forbidden(
            'User is not allowed to post in this channel',
            'FORUM_CHANNEL_ACCESS_DENIED',
          ),
        );

      let text = '';
      if (typeof payload.text === 'string') {
        text = payload.text;
      }
      let attachments: string[] = [];
      if (Array.isArray(payload.attachments)) {
        attachments = payload.attachments.filter(Boolean);
      }

      if (!this.hasMessageContent(text, attachments))
        return left(
          HTTPException.BadRequest(
            'Message must contain text or attachment',
            'FORUM_MESSAGE_EMPTY',
          ),
        );

      let mentions: string[] = [];
      if (Array.isArray(payload.mentions)) {
        mentions = payload.mentions.filter(Boolean);
      }
      const replyTo = payload.replyTo ?? null;
      const mentionEmails = await this.resolveMentionEmails(
        mentions,
        payload.user,
      );
      const channelName = String(row['canal'] ?? '');
      await this.sendMentionNotification({
        emails: mentionEmails,
        channelName,
        messageText: text,
        tableName: table.name,
        tableSlug: table.slug,
      });

      const messageId = randomUUID();
      await this.dispatchForumMentionNotifications({
        recipientIds: mentions,
        actorUserId: payload.user,
        tableName: table.name,
        tableSlug: table.slug,
        rowId: payload._id,
        messageId,
        channelName,
        messageText: text,
      });

      const nextMessages = this.getMessages(row, config.messagesSlug);

      if (replyTo) {
        const originalAuthorId = this.findMessageAuthorId(
          nextMessages,
          config,
          replyTo,
        );
        if (originalAuthorId && originalAuthorId !== payload.user) {
          await this.dispatchForumReplyNotification({
            recipientId: originalAuthorId,
            actorUserId: payload.user,
            tableName: table.name,
            tableSlug: table.slug,
            rowId: payload._id,
            messageId,
            channelName,
            messageText: text,
          });
        }
      }
      const newMessage: Record<string, unknown> = {
        [config.messageIdSlug]: messageId,
        [config.messageTextSlug]: text,
        [config.messageAuthorSlug]: [payload.user],
        [config.messageDateSlug]: new Date().toISOString(),
        [config.messageAttachmentsSlug]: attachments,
        [config.messageMentionsSlug]: mentions,
        [config.messageReplySlug]: replyTo,
        [config.messageReactionsSlug]: '[]',
      };
      if (config.messageMentionEmailsSlug) {
        newMessage[config.messageMentionEmailsSlug] =
          this.serializeStringList(mentionEmails);
      }
      if (config.messageMentionNotifiedSlug) {
        newMessage[config.messageMentionNotifiedSlug] =
          this.serializeStringList(mentionEmails);
      }
      if (config.messageMentionSeenSlug) {
        newMessage[config.messageMentionSeenSlug] = [];
      }
      nextMessages.push(newMessage);

      return this.persistMessagesAndReturnRow({
        table,
        rowId: payload._id,
        messagesSlug: config.messagesSlug,
        nextMessages,
      });
    } catch (error) {
      console.error('[table-rows > forum-message][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Internal server error',
          'FORUM_MESSAGE_CREATE_ERROR',
        ),
      );
    }
  }

  async update(payload: ForumMessageUpdatePayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      if (table.style !== E_TABLE_STYLE.FORUM)
        return left(
          HTTPException.BadRequest(
            'This endpoint is available only for forum tables',
            'FORUM_TABLE_REQUIRED',
          ),
        );

      const config = this.resolveForumConfig(table);

      if (!config)
        return left(
          HTTPException.BadRequest(
            'Forum messages field not found',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
          ),
        );

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (!(await this.canAccessChannel(table, row, config, payload.user)))
        return left(
          HTTPException.Forbidden(
            'User is not allowed to edit messages in this channel',
            'FORUM_CHANNEL_ACCESS_DENIED',
          ),
        );

      const nextMessages = this.getMessages(row, config.messagesSlug);
      const messageIndex = nextMessages.findIndex(
        (message) =>
          this.normalizeId(message?.[config.messageIdSlug]) ===
          payload.messageId,
      );

      if (messageIndex < 0)
        return left(
          HTTPException.NotFound(
            'Message not found',
            'FORUM_MESSAGE_NOT_FOUND',
          ),
        );

      const currentMessage = nextMessages[messageIndex];
      const authorId = this.getMessageAuthorId(
        currentMessage?.[config.messageAuthorSlug],
      );

      if (authorId !== payload.user)
        return left(
          HTTPException.Forbidden(
            'Only the message author can edit this message',
            'FORUM_MESSAGE_AUTHOR_REQUIRED',
          ),
        );

      let nextText: string;
      if (typeof payload.text === 'string') {
        nextText = payload.text;
      } else {
        nextText = String(currentMessage?.[config.messageTextSlug] ?? '');
      }

      let nextAttachments: string[];
      if (Array.isArray(payload.attachments)) {
        nextAttachments = payload.attachments.filter(Boolean);
      } else {
        nextAttachments = this.normalizeIdList(
          currentMessage?.[config.messageAttachmentsSlug],
        );
      }

      if (!this.hasMessageContent(nextText, nextAttachments))
        return left(
          HTTPException.BadRequest(
            'Message must contain text or attachment',
            'FORUM_MESSAGE_EMPTY',
          ),
        );

      let nextMentions: string[];
      if (Array.isArray(payload.mentions)) {
        nextMentions = payload.mentions.filter(Boolean);
      } else {
        nextMentions = this.normalizeIdList(
          currentMessage?.[config.messageMentionsSlug],
        );
      }

      const mentionEmails = await this.resolveMentionEmails(
        nextMentions,
        payload.user,
      );
      let alreadyNotified: string[] = [];
      if (config.messageMentionNotifiedSlug) {
        alreadyNotified = this.normalizeEmailList(
          currentMessage?.[config.messageMentionNotifiedSlug],
        );
      }
      const alreadyNotifiedSet = new Set(alreadyNotified);
      const newRecipients = mentionEmails.filter(
        (email) => !alreadyNotifiedSet.has(email),
      );
      const updateChannelName = String(row['canal'] ?? '');
      await this.sendMentionNotification({
        emails: newRecipients,
        channelName: updateChannelName,
        messageText: nextText,
        tableName: table.name,
        tableSlug: table.slug,
      });

      const previousMentionIds = this.normalizeIdList(
        currentMessage?.[config.messageMentionsSlug],
      );
      const previousMentionSet = new Set(previousMentionIds);
      const newMentionIds = nextMentions.filter(
        (id) => id && id !== payload.user && !previousMentionSet.has(id),
      );
      await this.dispatchForumMentionNotifications({
        recipientIds: newMentionIds,
        actorUserId: payload.user,
        tableName: table.name,
        tableSlug: table.slug,
        rowId: payload._id,
        messageId: payload.messageId,
        channelName: updateChannelName,
        messageText: nextText,
      });

      let nextReplyTo: string | null;
      if (payload.replyTo !== undefined) {
        nextReplyTo = payload.replyTo;
      } else {
        const currentReply = currentMessage?.[config.messageReplySlug];
        if (typeof currentReply === 'string') {
          nextReplyTo = currentReply;
        } else {
          nextReplyTo = null;
        }
      }

      const updatedMessage: Record<string, unknown> = {
        ...currentMessage,
        [config.messageTextSlug]: nextText,
        [config.messageAttachmentsSlug]: nextAttachments,
        [config.messageMentionsSlug]: nextMentions,
        [config.messageReplySlug]: nextReplyTo,
      };
      if (config.messageMentionEmailsSlug) {
        updatedMessage[config.messageMentionEmailsSlug] =
          this.serializeStringList(mentionEmails);
      }
      if (config.messageMentionNotifiedSlug) {
        updatedMessage[config.messageMentionNotifiedSlug] =
          this.serializeStringList(
            Array.from(new Set([...alreadyNotified, ...newRecipients])),
          );
      }
      nextMessages[messageIndex] = updatedMessage;

      return this.persistMessagesAndReturnRow({
        table,
        rowId: payload._id,
        messagesSlug: config.messagesSlug,
        nextMessages,
      });
    } catch (error) {
      console.error('[table-rows > forum-message][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Internal server error',
          'FORUM_MESSAGE_UPDATE_ERROR',
        ),
      );
    }
  }

  async remove(payload: ForumMessageDeletePayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      if (table.style !== E_TABLE_STYLE.FORUM)
        return left(
          HTTPException.BadRequest(
            'This endpoint is available only for forum tables',
            'FORUM_TABLE_REQUIRED',
          ),
        );

      const config = this.resolveForumConfig(table);

      if (!config)
        return left(
          HTTPException.BadRequest(
            'Forum messages field not found',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
          ),
        );

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (!(await this.canAccessChannel(table, row, config, payload.user)))
        return left(
          HTTPException.Forbidden(
            'User is not allowed to delete messages in this channel',
            'FORUM_CHANNEL_ACCESS_DENIED',
          ),
        );

      const nextMessages = this.getMessages(row, config.messagesSlug);
      const messageIndex = nextMessages.findIndex(
        (message) =>
          this.normalizeId(message?.[config.messageIdSlug]) ===
          payload.messageId,
      );

      if (messageIndex < 0)
        return left(
          HTTPException.NotFound(
            'Message not found',
            'FORUM_MESSAGE_NOT_FOUND',
          ),
        );

      const message = nextMessages[messageIndex];
      const authorId = this.getMessageAuthorId(
        message?.[config.messageAuthorSlug],
      );

      if (authorId !== payload.user)
        return left(
          HTTPException.Forbidden(
            'Only the message author can delete this message',
            'FORUM_MESSAGE_AUTHOR_REQUIRED',
          ),
        );

      nextMessages.splice(messageIndex, 1);
      return this.persistMessagesAndReturnRow({
        table,
        rowId: payload._id,
        messagesSlug: config.messagesSlug,
        nextMessages,
      });
    } catch (error) {
      console.error('[table-rows > forum-message][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Internal server error',
          'FORUM_MESSAGE_DELETE_ERROR',
        ),
      );
    }
  }

  async markMentionRead(
    payload: ForumMessageMentionReadPayload,
  ): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      if (table.style !== E_TABLE_STYLE.FORUM)
        return left(
          HTTPException.BadRequest(
            'This endpoint is available only for forum tables',
            'FORUM_TABLE_REQUIRED',
          ),
        );

      const config = this.resolveForumConfig(table);
      if (!config)
        return left(
          HTTPException.BadRequest(
            'Forum messages field not found',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
          ),
        );
      if (!config.messageMentionSeenSlug)
        return left(
          HTTPException.BadRequest(
            'Forum mention read field not found in template',
            'FORUM_MENTION_READ_FIELD_NOT_FOUND',
          ),
        );

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (!(await this.canAccessChannel(table, row, config, payload.user)))
        return left(
          HTTPException.Forbidden(
            'User is not allowed to access this channel',
            'FORUM_CHANNEL_ACCESS_DENIED',
          ),
        );

      const nextMessages = this.getMessages(row, config.messagesSlug);
      const messageIndex = nextMessages.findIndex(
        (message) =>
          this.normalizeId(message?.[config.messageIdSlug]) ===
          payload.messageId,
      );

      if (messageIndex < 0)
        return left(
          HTTPException.NotFound(
            'Message not found',
            'FORUM_MESSAGE_NOT_FOUND',
          ),
        );

      const currentMessage = nextMessages[messageIndex];
      const mentionIds = this.normalizeIdList(
        currentMessage?.[config.messageMentionsSlug],
      );

      if (!mentionIds.includes(payload.user)) {
        return left(
          HTTPException.BadRequest(
            'User was not mentioned in this message',
            'FORUM_MENTION_NOT_FOUND',
          ),
        );
      }

      const seenIds = this.normalizeIdList(
        currentMessage?.[config.messageMentionSeenSlug],
      );

      if (!seenIds.includes(payload.user)) {
        nextMessages[messageIndex] = {
          ...currentMessage,
          [config.messageMentionSeenSlug]: [...seenIds, payload.user],
        };
        return this.persistMessagesAndReturnRow({
          table,
          rowId: payload._id,
          messagesSlug: config.messagesSlug,
          nextMessages,
        });
      }

      return right(row);
    } catch (error) {
      console.error('[table-rows > forum-message][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Internal server error',
          'FORUM_MENTION_READ_ERROR',
        ),
      );
    }
  }

  private resolveForumConfig(table: ITable): ForumConfig | null {
    let fields: typeof table.fields = [];
    if (Array.isArray(table.fields)) fields = table.fields;
    const messagesField =
      fields.find((field) => field.slug === 'mensagens') ??
      fields.find((field) => field.type === E_FIELD_TYPE.FIELD_GROUP);

    if (!messagesField?.slug) return null;

    const membersField = fields.find(
      (field) => field.slug === 'membros' && field.type === E_FIELD_TYPE.USER,
    );
    const privacyField = fields.find(
      (field) =>
        field.slug === 'privacidade' && field.type === E_FIELD_TYPE.DROPDOWN,
    );

    const fallbackGroupFields: Array<Pick<IField, 'slug' | 'type'>> = [
      { slug: 'mensagem-id', type: E_FIELD_TYPE.TEXT_SHORT },
      { slug: 'texto', type: E_FIELD_TYPE.TEXT_LONG },
      { slug: 'autor', type: E_FIELD_TYPE.USER },
      { slug: 'data', type: E_FIELD_TYPE.DATE },
      { slug: 'anexos', type: E_FIELD_TYPE.FILE },
      { slug: 'mencoes', type: E_FIELD_TYPE.USER },
      { slug: 'mencoes-emails', type: E_FIELD_TYPE.TEXT_LONG },
      { slug: 'mencoes-notificadas', type: E_FIELD_TYPE.TEXT_LONG },
      { slug: 'mencoes-visualizadas', type: E_FIELD_TYPE.USER },
      { slug: 'resposta', type: E_FIELD_TYPE.TEXT_SHORT },
      { slug: 'reacoes', type: E_FIELD_TYPE.TEXT_LONG },
    ];

    const groupSlug = messagesField.group?.slug;
    let group: IGroupConfiguration | null | undefined = null;
    if (Array.isArray(table.groups)) {
      group = table.groups.find((item) => item?.slug === groupSlug);
    }

    let actualGroupFields: IField[] = [];
    if (group && Array.isArray(group.fields) && group.fields.length > 0) {
      actualGroupFields = group.fields;
    }

    let groupFields: Array<Pick<IField, 'slug' | 'type'>>;
    if (actualGroupFields.length > 0) {
      groupFields = actualGroupFields;
    } else {
      groupFields = fallbackGroupFields;
    }

    const findGroupField = (
      slug: string,
      type: (typeof E_FIELD_TYPE)[keyof typeof E_FIELD_TYPE],
    ): string | null => {
      return (
        groupFields.find((field) => field.slug === slug)?.slug ??
        groupFields.find((field) => field.type === type)?.slug ??
        null
      );
    };
    // Optional/internal fields must exist in the actual group schema.
    const findActualGroupFieldBySlug = (slug: string): string | null =>
      actualGroupFields.find((field) => field.slug === slug)?.slug ?? null;
    const getFieldSlug = (
      slug: string,
      type: (typeof E_FIELD_TYPE)[keyof typeof E_FIELD_TYPE],
    ): string => findGroupField(slug, type) ?? slug;

    return {
      channelMembersSlug: membersField?.slug ?? null,
      channelPrivacySlug: privacyField?.slug ?? null,
      messagesSlug: messagesField.slug,
      messageIdSlug: getFieldSlug('mensagem-id', E_FIELD_TYPE.TEXT_SHORT),
      messageTextSlug: getFieldSlug('texto', E_FIELD_TYPE.TEXT_LONG),
      messageAuthorSlug: getFieldSlug('autor', E_FIELD_TYPE.USER),
      messageDateSlug: getFieldSlug('data', E_FIELD_TYPE.DATE),
      messageAttachmentsSlug: getFieldSlug('anexos', E_FIELD_TYPE.FILE),
      messageMentionsSlug: getFieldSlug('mencoes', E_FIELD_TYPE.USER),
      messageMentionEmailsSlug: findActualGroupFieldBySlug('mencoes-emails'),
      messageMentionNotifiedSlug: findActualGroupFieldBySlug(
        'mencoes-notificadas',
      ),
      messageMentionSeenSlug: findActualGroupFieldBySlug(
        'mencoes-visualizadas',
      ),
      messageReplySlug: getFieldSlug('resposta', E_FIELD_TYPE.TEXT_SHORT),
      messageReactionsSlug: getFieldSlug('reacoes', E_FIELD_TYPE.TEXT_LONG),
    };
  }

  /**
   * Acesso ao canal: regra propria do forum (dono/membro em canal privado) e,
   * por cima, o row-access-guard — o canal e uma row como qualquer outra e
   * estava fora do filtro.
   */
  private async canAccessChannel(
    table: ITable,
    row: IRow,
    config: ForumConfig,
    userId: string,
  ): Promise<boolean> {
    if (!this.channelAllowsUser(row, config, userId)) return false;

    const ctx = await this.rowAccessGuard.resolveContext(userId);
    return this.rowAccessGuard.composeReadDecision(
      table._id.toString(),
      row,
      ctx,
      table,
    );
  }

  private channelAllowsUser(
    row: Record<string, unknown>,
    config: ForumConfig,
    userId: string,
  ): boolean {
    const creatorId = this.normalizeId(row.creator);
    if (creatorId === userId) return true;

    let isPrivate: boolean;
    if (config.channelPrivacySlug) {
      isPrivate =
        String(row[config.channelPrivacySlug] ?? '')
          .trim()
          .toLowerCase() === 'privado';
    } else {
      isPrivate = Boolean(config.channelMembersSlug);
    }

    if (!isPrivate) return true;

    if (!config.channelMembersSlug) return false;
    const memberIds = this.normalizeIdList(row[config.channelMembersSlug]);

    return memberIds.includes(userId);
  }

  private getMessages(
    row: Record<string, unknown>,
    messageSlug: string,
  ): Array<Record<string, unknown>> {
    const value = row[messageSlug];

    if (!Array.isArray(value)) return [];

    return value.map((message) => {
      if (this.typeGuard.isRecord(message)) {
        return { ...message };
      }
      return {};
    });
  }

  private getMessageAuthorId(value: unknown): string | null {
    const ids = this.normalizeIdList(value);
    return ids[0] ?? null;
  }

  private normalizeId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (this.typeGuard.isRecord(value)) {
      if ('_id' in value) {
        const id = value._id;
        if (typeof id === 'string' && id.trim()) return id.trim();
        if (this.typeGuard.isRecord(id) && 'toString' in id) {
          const parsed = String(id);
          if (parsed && parsed !== '[object Object]') return parsed;
        }
      }
      if ('toString' in value) {
        const parsed = String(value);
        if (parsed && parsed !== '[object Object]') return parsed;
      }
    }
    return null;
  }

  private normalizeIdList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.normalizeId(item))
        .filter((item): item is string => Boolean(item));
    }

    const id = this.normalizeId(value);
    if (id) {
      return [id];
    }
    return [];
  }

  private normalizeEmailList(value: unknown): string[] {
    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) return [];
      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) =>
                String(item ?? '')
                  .trim()
                  .toLowerCase(),
              )
              .filter(Boolean);
          }
        } catch {
          // Fallback to treating it as a single value below.
        }
      }
    }
    let values: unknown[];
    if (Array.isArray(value)) {
      values = value;
    } else if (value) {
      values = [value];
    } else {
      values = [];
    }
    return values
      .map((item) =>
        String(item ?? '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
  }

  private async resolveMentionEmails(
    mentionIds: string[],
    currentUserId: string,
  ): Promise<string[]> {
    const uniqueIds = Array.from(
      new Set(mentionIds.filter((id) => id && id !== currentUserId)),
    );
    if (uniqueIds.length === 0) return [];
    const users = await this.userRepository.findMany({ _ids: uniqueIds });
    return Array.from(
      new Set(
        users
          .map((user) =>
            String(user.email ?? '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );
  }

  private async sendMentionNotification(opts: {
    emails: string[];
    channelName?: string;
    messageText?: string;
    tableName?: string;
    tableSlug?: string;
  }): Promise<void> {
    if (opts.emails.length === 0) return;
    try {
      let snippet = '';
      if (opts.messageText) {
        snippet = opts.messageText
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .slice(0, 200);
      }

      const data: Record<string, string> = {};
      if (opts.tableName) data['Tabela'] = opts.tableName;
      if (opts.channelName) data['Canal'] = opts.channelName;
      if (snippet) {
        let ellipsis = '';
        if (snippet.length >= 200) ellipsis = '...';
        data['Mensagem'] = snippet + ellipsis;
      }
      if (opts.tableSlug) {
        data['Acessar'] = Env.APP_CLIENT_URL + '/tables/' + opts.tableSlug;
      }

      await this.emailQueue.enqueue({
        template: 'notification',
        data: {
          title: 'Você foi mencionado em um canal',
          message: 'Você recebeu uma menção em uma mensagem do fórum.',
          data,
        },
        to: opts.emails,
        subject: 'Você foi mencionado em um canal',
      });
    } catch {
      // Keep forum message flow resilient even if email queue fails.
    }
  }

  private findMessageAuthorId(
    messages: Array<Record<string, unknown>>,
    config: ForumConfig,
    messageId: string,
  ): string | null {
    const found = messages.find(
      (message) =>
        this.normalizeId(message?.[config.messageIdSlug]) === messageId,
    );
    if (!found) return null;
    return this.getMessageAuthorId(found[config.messageAuthorSlug]);
  }

  private async dispatchForumReplyNotification(opts: {
    recipientId: string;
    actorUserId: string;
    tableName: string;
    tableSlug: string;
    rowId: string;
    messageId: string;
    channelName: string;
    messageText: string;
  }): Promise<void> {
    if (!opts.recipientId || opts.recipientId === opts.actorUserId) return;

    let snippet = '';
    if (opts.messageText) {
      snippet = opts.messageText
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
        .slice(0, 200);
    }

    let title = 'Alguém respondeu sua mensagem';
    if (opts.channelName) title = `Nova resposta em #${opts.channelName}`;

    await this.notificationService.notify({
      userIds: [opts.recipientId],
      type: E_NOTIFICATION_TYPE.FORUM_MENTION,
      title,
      body: snippet,
      action: {
        type: 'route',
        href: `/tables/${opts.tableSlug}?channelId=${opts.rowId}&messageId=${opts.messageId}`,
        label: 'Abrir resposta',
      },
      source: {
        tableSlug: opts.tableSlug,
        rowId: opts.rowId,
        anchorId: opts.messageId,
      },
      actorUserId: opts.actorUserId,
    });
  }

  private async dispatchForumMentionNotifications(opts: {
    recipientIds: string[];
    actorUserId: string;
    tableName: string;
    tableSlug: string;
    rowId: string;
    messageId: string;
    channelName: string;
    messageText: string;
  }): Promise<void> {
    const recipients = Array.from(
      new Set(
        opts.recipientIds.filter(
          (id) => typeof id === 'string' && id && id !== opts.actorUserId,
        ),
      ),
    );
    if (recipients.length === 0) return;

    let snippet = '';
    if (opts.messageText) {
      snippet = opts.messageText
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
        .slice(0, 200);
    }

    let title = 'Você foi mencionado em uma mensagem';
    if (opts.channelName) title = `Você foi mencionado em #${opts.channelName}`;

    await this.notificationService.notify({
      userIds: recipients,
      type: E_NOTIFICATION_TYPE.FORUM_MENTION,
      title,
      body: snippet,
      action: {
        type: 'route',
        href: `/tables/${opts.tableSlug}?channelId=${opts.rowId}&messageId=${opts.messageId}`,
        label: 'Abrir mensagem',
      },
      source: {
        tableSlug: opts.tableSlug,
        rowId: opts.rowId,
        anchorId: opts.messageId,
      },
      actorUserId: opts.actorUserId,
    });
  }

  private hasMessageContent(text: string, attachments: string[]): boolean {
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    return plainText.length > 0 || attachments.length > 0;
  }

  private serializeStringList(values: string[]): string {
    return JSON.stringify(
      values
        .map((value) =>
          String(value ?? '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
  }

  private async persistMessagesAndReturnRow(params: {
    table: ITable;
    rowId: string;
    messagesSlug: string;
    nextMessages: Array<Record<string, unknown>>;
  }): Promise<Response> {
    const updatedRow = await this.rowRepository.findOneAndUpdate(
      params.table,
      { _id: params.rowId },
      { $set: { [params.messagesSlug]: params.nextMessages } },
    );

    if (!updatedRow)
      return left(
        HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
      );

    return right(updatedRow);
  }
}
