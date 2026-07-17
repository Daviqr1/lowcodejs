import type { FastifySchema } from 'fastify';

export const TableRowAutoSaveSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Auto-salvar registro como rascunho',
  description:
    'Persiste um registro parcial como rascunho (status="draft") sem disparar validações de obrigatoriedade. Quando "_id" é informado na query, atualiza o rascunho existente; caso contrário, cria um novo. Apenas o formato/tipo dos campos preenchidos é validado.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela onde o rascunho será salvo',
        examples: ['users', 'products', 'blog-posts'],
      },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description:
          'ID do rascunho existente a ser atualizado. Quando ausente, um novo rascunho é criado.',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    description:
      'Dados parciais do registro baseados nos campos da tabela. As chaves correspondem aos slugs dos campos e os valores dependem dos tipos de campo.',
    additionalProperties: true,
  },
  response: {
    201: {
      description: 'Rascunho salvo com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado do registro (draft após auto-save)',
        },
        draftAt: {
          type: 'string',
          format: 'date-time',
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
      description: 'Requisição inválida - Falha na validação de formato',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          description:
            'Erros de validação por campo. A chave é o slug do campo e o valor é a mensagem de erro.',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
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
      description: 'Acesso negado - Sem permissão para criar registros',
      type: 'object',
      properties: {
        message: { type: 'string' },
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
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Não encontrado - Tabela ou registro inexistente',
      type: 'object',
      properties: {
        message: { type: 'string' },
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
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['AUTO_SAVE_ROW_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
