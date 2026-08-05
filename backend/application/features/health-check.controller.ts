import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET } from 'fastify-decorators';

import { HealthCheckSchema } from './health-check.schema';

@Controller()
export default class {
  @GET({
    url: '/health-check',
    options: {
      schema: HealthCheckSchema,
    },
  })
  async handle(_: FastifyRequest, response: FastifyReply): Promise<void> {
    return response.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
