import type { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';
import { z } from 'zod';

import {
  ErrorLogContractRepository,
  type ErrorLogCreatePayload,
} from '@application/repositories/error-log/error-log-contract.repository';

import { ErrorLogHookContractService } from './error-log-hook-contract.service';

const errorBodySchema = z.object({
  message: z.string().optional(),
  cause: z.string().optional(),
  errors: z.unknown().optional(),
});

type ParsedErrorBody = {
  message: string;
  cause: string | null;
  errors: unknown;
};

const IGNORED_STATUS = new Set<number>([401]);

@Service()
export default class ErrorLogHookService implements ErrorLogHookContractService {
  private parseErrorBody(payload: unknown): ParsedErrorBody {
    let message = 'Erro na requisição';
    let cause: string | null = null;
    let errors: unknown = null;

    if (typeof payload === 'string') {
      try {
        const parsed = errorBodySchema.safeParse(JSON.parse(payload));
        if (parsed.success) {
          if (parsed.data.message) message = parsed.data.message;
          if (parsed.data.cause) cause = parsed.data.cause;
          if (parsed.data.errors !== undefined) errors = parsed.data.errors;
        }
      } catch {
        // Corpo não-JSON (stream/buffer): mantém os defaults.
      }
    }

    return { message, cause, errors };
  }

  // 401 é EXCLUÍDO de propósito: "não autenticado" dispara em massa (sessão
  // expirada, logout, requests do SSR, retry do refresh-token) e polui o
  // histórico sem ser um erro de sistema real. Demais 4xx (400/403/404…) e todos
  // os 5xx são registrados.

  /**
   * Hook `onSend`: registra no "Histórico de erros" toda resposta de **erro**
   * (status **>= 400**, exceto os de `IGNORED_STATUS`) — 4xx do cliente E 5xx do
   * servidor. Captura inclusive os erros que os casos de uso retornam via Either
   * (não são lançados, então não passam pelo error handler do kernel).
   * Best-effort: fire-and-forget, não atrasa nem quebra a resposta ao usuário.
   *
   * Só registra erros de **usuário autenticado**: requests anônimos
   * (SSR/públicos/healthcheck/sessão expirada) são poluição — ignorados. Por isso
   * todo log de erro tem um usuário associado (nunca "anônimo").
   *
   * O `statusCode` fica gravado para diferenciar/filtrar 4xx (cliente) de 5xx
   * (servidor) na tela.
   */
  constructor(private readonly repository: ErrorLogContractRepository) {}

  async handle(
    request: FastifyRequest,
    response: FastifyReply,
    payload: unknown,
  ): Promise<unknown> {
    try {
      const userId = request.user?.sub;

      if (
        userId &&
        response.statusCode >= 400 &&
        !IGNORED_STATUS.has(response.statusCode)
      ) {
        const { message, cause, errors } = this.parseErrorBody(payload);

        void this.persist({
          statusCode: response.statusCode,
          message,
          cause,
          method: request.method,
          url: request.url,
          user_id: userId,
          errors,
        });
      }
    } catch (err) {
      console.error('[Error Log Hook] erro inesperado:', err);
    }

    return payload;
  }

  private async persist(payload: ErrorLogCreatePayload): Promise<void> {
    try {
      await this.repository.create(payload);
    } catch (error) {
      console.error('[Error Log Hook] falha ao gravar erro:', error);
    }
  }
}
