import { Service } from 'fastify-decorators';
import { createHash } from 'node:crypto';

import { E_NOTIFICATION_TYPE } from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { DateContractService } from '@application/services/date/date-contract.service';
import { EmailContractService } from '@application/services/email/email-contract.service';
import { FieldValueContractService } from '@application/services/field-value/field-value-contract.service';
import { IdentifierContractService } from '@application/services/identifier/identifier-contract.service';
import { NotificationContractService } from '@application/services/notification/notification-contract.service';
import { SlugContractService } from '@application/services/slug/slug-contract.service';
import { Env } from '@start/env';

import type { BuildSandboxParams } from './sandbox-builder-contract.service';
import { SandboxBuilderContractService } from './sandbox-builder-contract.service';
import type {
  ContextApi,
  EmailApi,
  EmailResult,
  FieldApi,
  FieldDefinition,
  NotifyApi,
  SandboxGlobals,
  SandboxUser,
  UsersApi,
  UtilsApi,
} from './script-execution.types';

/**
 * Normaliza ids de usuário em qualquer formato aceito pelos campos USER:
 * string, ObjectId, objeto populado ({ _id }), arrays e arrays aninhados.
 * Retorna ids únicos como string.
 */

@Service()
export default class SandboxBuilderService implements SandboxBuilderContractService {
  private normalizeUserIds(input: unknown): string[] {
    const out: string[] = [];

    const push = (value: unknown): void => {
      if (!value) return;
      if (Array.isArray(value)) {
        for (const item of value) push(item);
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) out.push(trimmed);
        return;
      }
      if (typeof value === 'object') {
        let nested: unknown;
        if ('_id' in value) nested = value._id;
        if (!nested && 'id' in value) nested = value.id;
        if (nested) {
          const asString = String(nested);
          if (asString && asString !== '[object Object]') out.push(asString);
          return;
        }
        // ObjectId e similares: String() devolve o hex.
        const asString = String(value);
        if (asString && asString !== '[object Object]') out.push(asString);
        return;
      }
      const asString = String(value);
      if (asString) out.push(asString);
    };

    push(input);

    return Array.from(new Set(out));
  }
  constructor(
    private readonly emailService: EmailContractService,
    private readonly notificationService: NotificationContractService,
    private readonly userRepository: UserContractRepository,
    private readonly fieldValue: FieldValueContractService,
    private readonly slugService: SlugContractService,
    private readonly dateService: DateContractService,
    private readonly identifier: IdentifierContractService,
  ) {}

  build(params: BuildSandboxParams): SandboxGlobals {
    const { doc, tableSlug, fields, context, logs } = params;
    // As APIs abaixo sao object literals: `this` dentro delas apontaria
    // para o proprio literal, entao as deps sao capturadas aqui.
    const {
      emailService,
      notificationService,
      userRepository,
      fieldValue,
      slugService,
      dateService,
      identifier,
    } = this;
    const normalizeUserIds = this.normalizeUserIds.bind(this);

    // Helper to find field definition by slug (handles variations)
    const findFieldDef = (slug: string): FieldDefinition | undefined => {
      return fields.find(
        (f) =>
          f.slug === slug ||
          slugService.toKey(f.slug) === slugService.toKey(slug) ||
          f.slug.replace(/-/g, '_') === slug ||
          f.slug === slug.replace(/_/g, '-'),
      );
    };

    // Build field API
    const field: FieldApi = {
      get(slug: string): unknown {
        return fieldValue.read(doc, slug);
      },

      set(slug: string, value: unknown): void {
        const converted = fieldValue.infer(value);
        const fieldDef = findFieldDef(slug);
        const originalSlug = fieldDef?.slug ?? slug;
        doc[originalSlug] = converted;
      },

      getAll(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const f of fields) {
          result[f.slug] = doc[f.slug];
        }
        return result;
      },

      getLabel(slug: string, value?: string): string {
        const fieldDef = findFieldDef(slug);
        const val = value ?? String(fieldValue.read(doc, slug) ?? '');
        if (!fieldDef?.dropdown || !Array.isArray(fieldDef.dropdown))
          return val;
        const option = fieldDef.dropdown.find(
          (opt) => opt.id === val || opt.label === val,
        );
        return option?.label ?? val;
      },
    };

    // Build context API (read-only)
    const contextApi: ContextApi = Object.freeze({
      action: context.userAction,
      moment: context.executionMoment,
      userId: context.userId ?? '',
      isNew: context.isNew ?? false,
      appUrl: Env.APP_CLIENT_URL,
      reentrant: context.viaSaveHook ?? false,
      previous: context.previous ?? null,
      table: Object.freeze(
        context.tableInfo ?? {
          _id: '',
          name: '',
          slug: tableSlug,
        },
      ),
    });

    // Build email API
    const email: EmailApi = {
      async send(
        to: string[],
        subject: string,
        body: string,
      ): Promise<EmailResult> {
        try {
          if (!Array.isArray(to) || to.length === 0) {
            return { success: false, message: 'Lista de emails inválida' };
          }
          if (!subject || !body) {
            return {
              success: false,
              message: 'Assunto e corpo do email são obrigatórios',
            };
          }

          await emailService.sendEmail({
            body,
            subject,
            to,
          });

          return {
            success: true,
            message: 'Email enviado com sucesso',
            recipients: to.length,
          };
        } catch (error: unknown) {
          console.error('Erro na função email.send:', error);
          return { success: false, message: 'Erro interno ao enviar email' };
        }
      },

      async sendTemplate(
        to: string[],
        subject: string,
        message: string,
        data?: Record<string, unknown>,
      ): Promise<EmailResult> {
        try {
          if (!Array.isArray(to) || to.length === 0) {
            return { success: false, message: 'Lista de emails inválida' };
          }
          if (!subject || !message) {
            return {
              success: false,
              message: 'Assunto e mensagem são obrigatórios',
            };
          }

          const body = await emailService.buildTemplate({
            template: 'notification',
            data: {
              title: subject,
              message,
              data: data ?? {},
            },
          });

          await emailService.sendEmail({
            body,
            subject,
            to,
          });

          return {
            success: true,
            message: 'Email enviado com sucesso',
            recipients: to.length,
          };
        } catch (error: unknown) {
          console.error('Erro na função email.sendTemplate:', error);
          return { success: false, message: 'Erro interno ao enviar email' };
        }
      },
    };

    // Build users API — resolve ids de campos USER/CREATOR em { _id, name, email }.
    // Roda no host (fora da VM), com acesso ao model User (conexão system).
    const users: UsersApi = {
      async resolve(ids: unknown): Promise<SandboxUser[]> {
        const list = normalizeUserIds(ids);
        if (list.length === 0) return [];
        try {
          const found = await userRepository.findMany({
            _ids: list,
            trashed: false,
          });

          return found.map((user) => ({
            _id: String(user._id),
            name: String(user.name ?? ''),
            email: String(user.email ?? ''),
          }));
        } catch (error: unknown) {
          console.error('Erro na função users.resolve:', error);
          return [];
        }
      },

      async emails(ids: unknown): Promise<string[]> {
        const resolved = await users.resolve(ids);
        return Array.from(
          new Set(
            resolved
              .map((user) => user.email.trim().toLowerCase())
              .filter(Boolean),
          ),
        );
      },
    };

    // Build notify API — cria notificações in-app (uma por usuário) + socket.
    const notify: NotifyApi = {
      async send(input): Promise<{ success: boolean; recipients: number }> {
        try {
          const userIds = normalizeUserIds(input?.userIds);
          if (userIds.length === 0) return { success: true, recipients: 0 };
          if (!input?.title) {
            return { success: false, recipients: 0 };
          }

          const records = await notificationService.notify({
            userIds,
            type:
              Object.values(E_NOTIFICATION_TYPE).find(
                (t) => t === input.type,
              ) ?? E_NOTIFICATION_TYPE.GENERIC,
            title: String(input.title),
            body: input.body ?? null,
            action: input.action ?? null,
            source: input.source ?? null,
            actorUserId: input.actorUserId ?? context.userId ?? null,
          });

          return { success: true, recipients: records.length };
        } catch (error: unknown) {
          console.error('Erro na função notify.send:', error);
          return { success: false, recipients: 0 };
        }
      },
    };

    // Build utils API
    const utils: UtilsApi = {
      today: (): Date => dateService.today(),
      now: (): Date => dateService.now(),
      formatDate: (date: Date, format?: string): string =>
        dateService.format(date, format),
      sha256: (text: string): string =>
        createHash('sha256').update(text).digest('hex'),
      uuid: (): string => identifier.generate(),
    };

    // Build console with log interception
    const stringifyArg = (a: unknown): string => {
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    };
    const interceptedConsole = {
      log: (...args: unknown[]): void => {
        logs.push(args.map(stringifyArg).join(' '));
      },
      warn: (...args: unknown[]): void => {
        logs.push('[WARN] ' + args.map(stringifyArg).join(' '));
      },
      error: (...args: unknown[]): void => {
        logs.push('[ERROR] ' + args.map(stringifyArg).join(' '));
      },
    };

    // Build sandbox with all APIs and builtins
    const sandbox: SandboxGlobals = {
      // API
      field,
      context: contextApi,
      email,
      users,
      notify,
      utils,

      // Console (intercepted)
      console: interceptedConsole,

      // Builtins
      JSON,
      Date,
      Math,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Number,
      String,
      Boolean,
      Array,
      Object,
      RegExp,
      Map,
      Set,
      Promise,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    return sandbox;
  }
}
