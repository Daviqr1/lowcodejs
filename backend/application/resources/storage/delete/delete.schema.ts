import type { FastifySchema } from 'fastify';

export const StorageDeleteSchema: FastifySchema = {
  tags: ['Armazenamento'],
  summary: 'Deletar arquivo do armazenamento',
  description:
    'Remove permanentemente um arquivo do banco de dados e do sistema de arquivos. Esta ação não pode ser desfeita',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        description: 'ID do registro de armazenamento para deletar',
        examples: ['507f1f77bcf86cd799439011'],
        errorMessage: {
          type: 'O ID deve ser um texto',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Arquivo deletado com sucesso',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de confirmação' },
        deletedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da exclusão',
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Arquivo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['STORAGE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['STORAGE_DELETE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
