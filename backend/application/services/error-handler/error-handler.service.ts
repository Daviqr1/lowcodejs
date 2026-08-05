import type { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';
import z, { ZodError } from 'zod';

import HTTPException from '@application/core/exception.core';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';

type ValidationErrorDetail = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: {
    limit?: number;
    missingProperty?: string;
    [key: string]: unknown;
  };
  message: string;
  emUsed?: boolean;
};

type ValidationError = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: {
    errors: ValidationErrorDetail[];
  };
  message: string;
};

// `error` no handler é Record<string, unknown>; narra `error.validation` (AJV)
// para ValidationError[] sem asserção.
import { ErrorHandlerContractService } from './error-handler-contract.service';

@Service()
export default class ErrorHandlerService implements ErrorHandlerContractService {
  private toValidationErrors(value: unknown): ValidationError[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is ValidationError =>
        !!item &&
        typeof item === 'object' &&
        'message' in item &&
        'instancePath' in item,
    );
  }
  constructor(private readonly http: HttpResponseContractService) {}

  handle(
    error: unknown,
    request: FastifyRequest,
    response: FastifyReply,
  ): FastifyReply {
    if (error instanceof HTTPException) {
      this.http.sendError(response, error);
      return response;
    }

    if (error instanceof ZodError) {
      const { fieldErrors } = z.flattenError(error);

      const errors = Object.entries(fieldErrors).reduce<Record<string, string>>(
        (acc, [key, messages]) => {
          if (Array.isArray(messages) && typeof messages[0] === 'string') {
            acc[key] = messages[0];
          }
          return acc;
        },
        {},
      );

      return response.status(400).send({
        message: 'Requisição inválida',
        code: 400,
        cause: 'INVALID_PAYLOAD_FORMAT',
        errors,
      });
    }

    // AJV: erro de validacao de schema do proprio Fastify.
    const fastifyError: Record<string, unknown> = {};
    if (typeof error === 'object' && error !== null) {
      Object.assign(fastifyError, error);
    }

    if (fastifyError.code === 'FST_ERR_VALIDATION') {
      const validation = this.toValidationErrors(fastifyError.validation);

      const errors = validation.reduce(
        (acc: Record<string, string>, err: ValidationError) => {
          let field =
            err.params?.errors?.[0]?.params?.missingProperty || 'unknown';
          if (err.instancePath) field = err.instancePath.slice(1);

          if (err.message && field) {
            acc[field] = err.message;
          }
          return acc;
        },
        {},
      );

      return response.status(Number(fastifyError.statusCode)).send({
        message: 'Requisição inválida',
        code: fastifyError.statusCode,
        cause: 'INVALID_PAYLOAD_FORMAT',
        ...(Object.keys(errors).length > 0 && { errors }),
      });
    }

    console.error(error);

    // Passa pelo HTTPException em vez de montar o corpo a mao: o formato da
    // resposta de erro tem uma fonte so.
    this.http.sendError(
      response,
      HTTPException.InternalServerError(
        'Erro interno do servidor',
        'SERVER_ERROR',
      ),
    );
    return response;
  }
}
