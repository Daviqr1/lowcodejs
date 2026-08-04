import type { FastifyReply } from 'fastify';
import { Service } from 'fastify-decorators';

import type HTTPException from '@application/core/exception.core';

import { HttpResponseContractService } from './http-response-contract.service';

@Service()
export default class HttpResponseService implements HttpResponseContractService {
  sendError(response: FastifyReply, error: HTTPException): void {
    response.status(error.code).send({
      message: error.message,
      code: error.code,
      cause: error.cause,
      ...(error.errors && { errors: error.errors }),
    });
  }
}
