import type { FastifySchema } from 'fastify';

export const UserUpdateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Atualizar usuário',
  description:
    'Atualiza um usuário existente com novos dados, incluindo troca de senha opcional',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        description: 'ID do usuário',
        errorMessage: {
          type: 'O ID deve ser um texto',
        },
      },
    },
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome completo do usuário atualizado',
        errorMessage: {
          type: 'O nome deve ser um texto',
          minLength: 'O nome é obrigatório',
        },
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Endereço de email do usuário atualizado',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
      group: {
        type: 'string',
        minLength: 1,
        description: 'ID do grupo do usuário atualizado',
        errorMessage: {
          type: 'O grupo deve ser um texto',
          minLength: 'O grupo é obrigatório',
        },
      },
      groups: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs dos grupos adicionais do usuário',
        errorMessage: {
          type: 'Grupos deve ser uma lista',
        },
      },
      password: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])',
        description: 'Nova senha (opcional)',
        errorMessage: {
          type: 'A senha deve ser um texto',
          minLength: 'A senha deve ter no mínimo 6 caracteres',
          pattern:
            'A senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
        },
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE'],
        description: 'Status do usuário',
        errorMessage: {
          type: 'O status deve ser um texto',
          enum: 'O status deve ser ACTIVE ou INACTIVE',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Usuário atualizado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        group: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem de erro de validação',
        },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Erros de validação por campo',
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
      description: 'Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['UPDATE_USER_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
