import type { FastifySchema } from 'fastify';

export const UserCreateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Criar novo usuário',
  description:
    'Cria uma nova conta de usuário com nome, email, senha e atribui a um grupo',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'email', 'password', 'group'],
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
        description: 'Endereço de email do usuário',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
      password: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])',
        description: 'Senha do usuário',
        errorMessage: {
          type: 'A senha deve ser um texto',
          minLength: 'A senha deve ter no mínimo 6 caracteres',
          pattern:
            'A senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
        },
      },
      group: {
        type: 'string',
        minLength: 1,
        description: 'ID do grupo do usuário',
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
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        name: 'O nome é obrigatório',
        email: 'O email é obrigatório',
        password: 'A senha é obrigatória',
        group: 'O grupo é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    201: {
      description: 'Usuário criado com sucesso (grupo populado)',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do usuário' },
        name: { type: 'string', description: 'Nome completo do usuário' },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email do usuário',
        },
        group: {
          type: 'object',
          description: 'Detalhes do grupo do usuário (populado)',
          properties: {
            _id: { type: 'string', description: 'ID do grupo' },
            name: { type: 'string', description: 'Nome do grupo' },
            slug: { type: 'string', description: 'Slug do grupo' },
            description: {
              type: 'string',
              description: 'Descrição do grupo',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE'],
          description: 'Status do usuário',
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description:
        'Requisição inválida - Grupo não informado ou falha na validação',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem de erro de validação',
        },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['GROUP_NOT_INFORMED', 'INVALID_PAYLOAD_FORMAT'],
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
    409: {
      description: 'Conflito - Já existe usuário com este email',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['USER_ALREADY_EXISTS'] },
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
        cause: { type: 'string', enum: ['CREATE_USER_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
