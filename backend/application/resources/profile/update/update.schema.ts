import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const ProfileUpdateSchema: FastifySchema = {
  tags: ['Perfil'],
  summary: 'Atualizar perfil do usuário atual',
  description:
    'Atualiza as informações do perfil do usuário autenticado incluindo dados pessoais e opcionalmente a senha',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome completo do usuário',
        errorMessage: {
          type: 'O nome deve ser um texto',
          minLength: 'O nome é obrigatório',
        },
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email do usuário',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
      allowPasswordChange: {
        type: 'boolean',
        default: false,
        description:
          'Habilitar alteração de senha (se true, currentPassword e newPassword são obrigatórios)',
      },
      currentPassword: {
        type: 'string',
        description:
          'Senha atual (opcional, usado quando allowPasswordChange é true)',
        errorMessage: {
          type: 'A senha atual deve ser um texto',
        },
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])',
        description:
          'Nova senha (opcional, usado quando allowPasswordChange é true)',
        errorMessage: {
          type: 'A nova senha deve ser um texto',
          minLength: 'A nova senha deve ter no mínimo 6 caracteres',
          pattern:
            'A nova senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
        },
      },
      notificationsEnabled: {
        type: 'boolean',
        description: 'Habilitar notificações in-app para o usuário',
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        name: 'O nome é obrigatório',
        email: 'O email é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Perfil atualizado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do usuário' },
        name: { type: 'string', description: 'Nome atualizado' },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email atualizado',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE'],
          description: 'Status do usuário',
        },
        group: {
          type: 'object',
          description: 'Grupo do usuário atualizado com permissões populadas',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da atualização do perfil',
        },
      },
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Erro de validação ou campos faltando',
      messageDescription: 'Mensagem de erro',
      errorsDescription: 'Erros de validação por campo',
    }),
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'INVALID_CREDENTIALS'],
      {
        description:
          'Não autorizado - Autenticação necessária ou senha atual inválida',
      },
    ),
    404: buildErrorResponse(404, 'USER_NOT_FOUND', {
      description: 'Usuário não encontrado',
    }),
    500: buildErrorResponse(500, 'UPDATE_USER_PROFILE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
