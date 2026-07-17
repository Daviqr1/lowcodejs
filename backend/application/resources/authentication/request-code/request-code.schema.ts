import type { FastifySchema } from 'fastify';

export const RequestCodeSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Solicitar código de recuperação de senha',
  description:
    'Gera um código de recuperação de senha e o enfileira para envio por email ao endereço informado (efeito colateral). Retorna 200 sem corpo. Rota pública',
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Endereço de email para enviar o código de recuperação',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        email: 'O email é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Código de recuperação enfileirado com sucesso',
      type: 'null',
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Não encontrado - Email não cadastrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['EMAIL_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['REQUEST_CODE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
