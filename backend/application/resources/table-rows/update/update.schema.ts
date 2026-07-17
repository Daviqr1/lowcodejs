import type { FastifySchema } from 'fastify';

export const TableRowUpdateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Atualizar registro',
  description:
    'Atualiza um registro existente em uma tabela com schema dinâmico baseado nos campos da tabela. Permite atualização parcial (campos não enviados mantêm o valor atual).',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o registro',
        examples: ['users', 'products', 'blog-posts'],
      },
      _id: {
        type: 'string',
        description: 'ID do registro a ser atualizado',
        examples: ['507f1f77bcf86cd799439011'],
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    description:
      'Dados dinâmicos do registro baseados nos campos da tabela. As chaves correspondem aos slugs dos campos e os valores dependem dos tipos dos campos.',
    additionalProperties: true,
    examples: [
      {
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
        age: 31,
        active: false,
        tags: ['senior-developer', 'typescript'],
        profile_picture: ['507f1f77bcf86cd799439014'],
        related_products: ['507f1f77bcf86cd799439015'],
      },
    ],
  },
  response: {
    200: {
      description:
        'Registro atualizado com sucesso com relacionamentos populados',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado de rascunho',
        },
        draftAt: {
          type: 'string',
          nullable: true,
          description: 'Quando o registro foi salvo como rascunho',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Quando o registro foi enviado para a lixeira',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da última atualização',
        },
      },
      additionalProperties: true,
    },
    400: {
      description: 'Requisição inválida - Falha na validação dos campos',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          description:
            'Objeto com erros de validação por campo. A chave é o slug do campo e o valor é a mensagem de erro.',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description: 'Acesso negado - Permissões insuficientes',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
            'OWNER_OR_ADMIN_REQUIRED',
            'TABLE_PRIVATE',
            'RESTRICTED_CREATE',
            'FORM_VIEW_RESTRICTED',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Não encontrado - Tabela ou registro não existe',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'],
        },
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
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['UPDATE_ROW_TABLE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
