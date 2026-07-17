import type { FastifySchema } from 'fastify';

export const WelcomeSchema: FastifySchema = {
  tags: ['Início'],
  summary: 'Página inicial com redirecionamento para a documentação',
  description: 'Redireciona para a documentação da API',
  response: {
    302: {
      description: 'Redirecionamento para /documentation',
      headers: {
        location: {
          type: 'string',
          description: 'URL de destino do redirecionamento',
          examples: ['/documentation'],
        },
      },
      type: 'object',
      properties: {
        message: {
          type: 'string',
          enum: ['LowCodeJs API'],
          description: 'Mensagem de boas-vindas',
        },
      },
      examples: [
        {
          message: 'LowCodeJs API',
        },
      ],
    },
  },
};
