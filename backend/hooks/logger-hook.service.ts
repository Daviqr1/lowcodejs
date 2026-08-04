import { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';
import z from 'zod';

import {
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
} from '@application/core/entity.core';
import {
  LoggerContractRepository,
  LoggerCreatePayload,
} from '@application/repositories/logger/logger-contract.repository';
import {
  EMPTY_OBJECT_AUDIT,
  LoggerAuditContractService,
} from '@application/services/logger-audit/logger-audit-contract.service';
import { getDataConnection } from '@config/database.config';

import { LoggerHookContractService } from './logger-hook-contract.service';

const ACTION_MAP: Record<string, keyof typeof E_LOGGER_ACTION_TYPE> = {
  GET: E_LOGGER_ACTION_TYPE.VIEW,
  POST: E_LOGGER_ACTION_TYPE.CREATE,
  PUT: E_LOGGER_ACTION_TYPE.UPDATE,
  PATCH: E_LOGGER_ACTION_TYPE.UPDATE,
  DELETE: E_LOGGER_ACTION_TYPE.DELETE,
};

// Narrow para dados dinâmicos de request (query/params) sem asserção.

@Service()
export default class LoggerHookService implements LoggerHookContractService {
  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value));
    }
    return {};
  }

  /**
   * Ordem importa: mais específico primeiro.
   * Rotas aninhadas como /tables/:slug/rows/:id/groups/:groupSlug
   * devem bater em GROUP_ROW antes de ROW ou TABLE.
   */
  OBJECT_MAP: Array<{
    match: string;
    object: keyof typeof E_LOGGER_OBJECT_TYPE;
  }> = [
    // ── Nested (mais específico primeiro) ──
    { match: '/groups', object: E_LOGGER_OBJECT_TYPE.GROUP_ROW },
    { match: '/fields', object: E_LOGGER_OBJECT_TYPE.FIELD },
    { match: '/rows', object: E_LOGGER_OBJECT_TYPE.ROW },

    // ── Top-level ──
    { match: '/tables', object: E_LOGGER_OBJECT_TYPE.TABLE },
    { match: '/users', object: E_LOGGER_OBJECT_TYPE.USER },
    { match: '/user-group', object: E_LOGGER_OBJECT_TYPE.USER_GROUP },
    { match: '/menu', object: E_LOGGER_OBJECT_TYPE.MENU },
    { match: '/extensions', object: E_LOGGER_OBJECT_TYPE.EXTENSION },
    { match: '/pages', object: E_LOGGER_OBJECT_TYPE.PAGE },
    { match: '/permissions', object: E_LOGGER_OBJECT_TYPE.PERMISSION },
    { match: '/profile', object: E_LOGGER_OBJECT_TYPE.PROFILE },
    { match: '/setting', object: E_LOGGER_OBJECT_TYPE.SETTING },
    { match: '/setup', object: E_LOGGER_OBJECT_TYPE.SETUP },
    { match: '/storage', object: E_LOGGER_OBJECT_TYPE.STORAGE },
  ];

  /**
   * Segmentos que NÃO são IDs — usados pelo fallbackIdFromUrl
   * para ignorar partes estáticas da URL.
   */
  private readonly NON_ID_SEGMENTS = new Set([
    'users',
    'tables',
    'rows',
    'fields',
    'groups',
    'menu',
    'extensions',
    'pages',
    'permissions',
    'profile',
    'setting',
    'setup',
    'storage',
    'user-group',
    'authentication',
    'tools',
    // sub-rotas estáticas
    'paginated',
    'exports',
    'csv',
    'bulk-delete',
    'bulk-restore',
    'bulk-trash',
    'empty-trash',
    'restore',
    'trash',
    'reorder',
    'migration',
    'start',
    'cleanup',
    'status',
    'active',
    'toggle',
    'table-scope',
    'category',
    'evaluation',
    'forum',
    'messages',
    'mention-read',
    'reaction',
    'sign-in',
    'sign-up',
    'sign-out',
    'refresh-token',
    'magic-link',
    'recovery',
    'request-code',
    'validate-code',
    'update-password',
    'health-check',
    'step',
    'admin',
    'email',
    'logos',
    'name',
    'paging',
    'upload',
    'clone-table',
    'export-table',
    'import-table',
  ]);

  private resolveObject(
    route: string,
  ): keyof typeof E_LOGGER_OBJECT_TYPE | null {
    if (!route) return null;

    for (const { match, object } of this.OBJECT_MAP) {
      if (route.includes(match)) return object;
    }

    return null;
  }

  private resolveAction(method: string): keyof typeof E_LOGGER_ACTION_TYPE {
    return ACTION_MAP[method.toUpperCase()] ?? E_LOGGER_ACTION_TYPE.VIEW;
  }

  /**
   * Prioridade de params nomeados pelo Fastify (ex: :rowId, :fieldId, :_id).
   */
  private resolveObjectId(params: unknown = {}): string | null {
    const record = this.asRecord(params);
    const priority = [
      'itemId',
      'messageId',
      'fieldId',
      'rowId',
      '_id',
      'id',
      'slug',
      'groupSlug', // menos prioritário — é slug de grupo, não de objeto principal
    ];

    for (const key of priority) {
      const value = record[key];
      if (typeof value === 'string' && value) return value;
    }

    return null;
  }

  /**
   * Fallback: varre a URL de trás pra frente e retorna
   * o primeiro segmento que parece ser um ID (não está em this.NON_ID_SEGMENTS).
   */
  private fallbackIdFromUrl(url: string): string | null {
    // Remove query string antes de processar
    const path = url.split('?')[0];
    const parts = path.split('/').filter(Boolean).reverse();

    for (const part of parts) {
      if (!this.NON_ID_SEGMENTS.has(part)) return part;
    }

    return null;
  }

  private readonly bodySchema = z.record(z.string(), z.unknown());
  constructor(
    private readonly repository: LoggerContractRepository,
    private readonly loggerAudit: LoggerAuditContractService,
  ) {}

  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      // Usa o padrão da rota (ex: /tables/:slug/rows/:_id) para resolver o object
      // e a URL real para resolver o object_id via fallback.
      const routePattern = request.routeOptions?.url ?? request.url;

      const method = request.method.toUpperCase();
      const hasBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);
      const isJson =
        request.headers['content-type']?.includes('application/json');

      let body: Record<string, unknown> | null = null;

      if (hasBodyMethod) {
        if (isJson) {
          const parsed = this.bodySchema.safeParse(request.body);
          if (parsed.success) body = parsed.data;
        } else {
          body = { raw: '[Non-JSON payload]' };
        }
      }

      const query = this.asRecord(request.query);
      const routeParams = this.asRecord(request.params);
      const hasQuery = Object.keys(query).length > 0;
      const hasParams = Object.keys(routeParams).length > 0;

      const contentParts: Record<string, unknown> = {};
      if (body) contentParts.body = body;
      if (hasQuery) contentParts.query = query;
      if (hasParams) contentParts.params = routeParams;
      let content: Record<string, unknown> | null = null;
      if (Object.keys(contentParts).length > 0) content = contentParts;

      const action = this.resolveAction(method);
      const object = this.resolveObject(routePattern);
      const object_id =
        this.resolveObjectId(request.params) ??
        this.fallbackIdFromUrl(request.url);
      const user_id = response.request.user?.sub ?? null;

      // Não loga rotas que não mapeiam para nenhum objeto conhecido
      if (!object) return;

      // Não loga requests sem usuário autenticado (SSR, endpoints públicos,
      // healthchecks). Sem identidade o log vira ruído ("Anônimo") e polui o histórico.
      if (!user_id) return;

      // Não loga GETs (Visualização). Carregar uma página dispara várias requests
      // em paralelo (menus, extensões, settings, tabelas...) e cada uma viraria um
      // log separado. O histórico deve refletir AÇÕES do usuário — criar, editar,
      // deletar — não cada chamada HTTP de leitura.
      if (action === E_LOGGER_ACTION_TYPE.VIEW) return;

      // Não loga operações de reordenação kanban (posicionamento sem mudança de coluna).
      // Frontend envia X-Skip-Log: true em updates que só alteram `ordem-kanban`.

      if (request.headers['x-skip-log']) return;

      // Resolve creator/updater/createdAt/updatedAt do registro referenciado
      // (object_id), lendo os campos ja gravados na propria ROW. Objetos que nao
      // sao ROW retornam tudo null.
      let audit = EMPTY_OBJECT_AUDIT;
      const systemDb = mongoose.connection.db;
      const dataDb = getDataConnection().db;
      if (systemDb && dataDb) {
        audit = await this.loggerAudit.resolve({
          systemDb,
          dataDb,
          object,
          objectId: object_id,
          url: request.url,
        });
      }

      const payload = {
        action,
        url: request.url,
        user_id,
        content,
        object,
        object_id,
        creator: audit.creator?.toString() ?? null,
        updater: audit.updater?.toString() ?? null,
        objectCreatedAt: audit.objectCreatedAt,
        objectUpdatedAt: audit.objectUpdatedAt,
      } satisfies LoggerCreatePayload;

      await this.repository.create(payload);
    } catch (err) {
      // Nunca deixar o hook de log derrubar a requisição
      console.error('[Logger Hook] Failed to create log entry:', err);
    }
  }
}
