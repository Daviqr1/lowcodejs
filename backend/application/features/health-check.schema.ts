import type { FastifySchema } from 'fastify';

export const HealthCheckSchema: FastifySchema = {
  tags: ['Saúde'],
  summary: 'Verificação de saúde da aplicação',
  description: 'Verifica o status de saúde da aplicação',
  response: {
    200: {
      description: 'Aplicação em funcionamento correto',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok'],
          description: 'Indicador do status de saúde',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp atual do servidor',
        },
      },
      examples: [
        {
          status: 'ok',
          timestamp: '2023-12-01T10:30:00.000Z',
        },
      ],
    },
  },
};
