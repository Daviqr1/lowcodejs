import type { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';
import z, { ZodError } from 'zod';

import HTTPException from '@application/core/exception.core';

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
function toValidationErrors(value: unknown): ValidationError[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ValidationError =>
      !!item &&
      typeof item === 'object' &&
      'message' in item &&
      'instancePath' in item,
  );
}

import { ErrorHandlerContractService } from './error-handler-contract.service';

@Service()
export default class ErrorHandlerService implements ErrorHandlerContractService {
  handle(
    error: unknown,
    request: FastifyRequest,
    response: FastifyReply,
  ): FastifyReply {
    if (error instanceof HTTPException) {
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
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
      const validation = toValidationErrors(fastifyError.validation);

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

    return response.status(500).send({
      message: 'Erro interno do servidor',
      cause: 'SERVER_ERROR',
      code: 500,
    });
  }
}
