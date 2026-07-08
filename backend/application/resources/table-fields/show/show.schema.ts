import type { FastifySchema } from 'fastify';

export const TableFieldShowSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Obter campo por ID',
  description:
    'Recupera um campo específico de uma tabela pelo seu ID. Retorna a configuração completa e os metadados do campo.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o campo',
        examples: ['users', 'products', 'blog-posts'],
      },
      _id: {
        type: 'string',
        description: 'ID do campo a ser recuperado',
        examples: ['507f1f77bcf86cd799439011'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Campo recuperado com sucesso, com a configuração completa',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do campo' },
        name: { type: 'string', description: 'Nome do campo' },
        slug: { type: 'string', description: 'Slug do campo' },
        type: {
          type: 'string',
          enum: [
            'TEXT_SHORT',
            'TEXT_LONG',
            'DROPDOWN',
            'DATE',
            'RELATIONSHIP',
            'FILE',
            'FIELD_GROUP',
            'REACTION',
            'EVALUATION',
            'CATEGORY',
            'USER',
            'HTML_CONTENT',
            'CREATOR',
            'IDENTIFIER',
            'CREATED_AT',
            'UPDATED_AT',
            'UPDATER',
            'STATUS',
            'TRASHED_AT',
          ],
          description: 'Tipo do campo, conforme o enum FIELD_TYPE',
        },
        required: {
          type: 'boolean',
          description: 'Campo é obrigatório',
        },
        multiple: {
          type: 'boolean',
          description: 'Campo permite múltiplos valores',
        },
        showInFilter: {
          type: 'boolean',
          description: 'Permitir filtrar por este campo',
        },
        permissions: {
          type: 'object',
          nullable: true,
          description:
            'Visibilidade do campo por contexto (lista/formulário/detalhe)',
          properties: {
            list: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                group: { type: 'string', nullable: true },
              },
            },
            form: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                group: { type: 'string', nullable: true },
              },
            },
            detail: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                group: { type: 'string', nullable: true },
              },
            },
          },
        },
        widthInForm: {
          type: 'number',
          nullable: true,
          description: 'Largura do campo em formulários, inteiro 0-100 (%)',
        },
        widthInList: {
          type: 'number',
          nullable: true,
          description:
            'Largura do campo em visualizações de lista/grade, inteiro 0-100 (px)',
        },
        widthInDetail: {
          type: 'number',
          nullable: true,
          description:
            'Largura do campo em visualizações de detalhe, inteiro 0-100 (%)',
        },
        tip: {
          type: 'string',
          nullable: true,
          description: 'Texto de ajuda opcional exibido nos formulários',
        },
        locked: {
          type: 'boolean',
          description: 'Campo está bloqueado e não pode ser modificado',
        },
        native: { type: 'boolean', description: 'Campo é nativo' },
        label: {
          type: 'object',
          nullable: true,
          description: 'Rótulo customizado por contexto de exibição do campo',
          properties: {
            list: { type: 'string', nullable: true },
            filter: { type: 'string', nullable: true },
            form: { type: 'string', nullable: true },
            detail: { type: 'string', nullable: true },
          },
        },
        format: {
          type: 'string',
          nullable: true,
          description: 'Formato do campo',
        },
        defaultValue: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            { type: 'null' },
          ],
          description: 'Valor padrão do campo',
        },
        dropdown: {
          type: 'array',
          nullable: true,
          description: 'Opções de seleção (dropdown)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              color: { type: 'string' },
            },
          },
        },
        allowCustomDropdownOptions: {
          type: 'boolean',
          description:
            'Permitir que usuários criem novas opções de seleção a partir do formulário',
        },
        allowCreateRelationshipRecords: {
          type: 'boolean',
          description:
            'Permitir que usuários criem registros na tabela relacionada a partir do formulário',
        },
        fillWithCurrentUserWhenEmpty: {
          type: 'boolean',
          description:
            'Campo USER: grava o usuário logado quando nenhum id de usuário é enviado no payload',
        },
        relationship: {
          type: 'object',
          nullable: true,
          additionalProperties: true,
          description: 'Configuração de relacionamento',
          properties: {
            table: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            field: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            order: { type: 'string', enum: ['asc', 'desc'] },
            customLabel: { type: 'boolean' },
            labelParts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  label: { type: 'string' },
                },
              },
            },
            labelSeparator: { type: 'string' },
            visible: { type: 'boolean' },
            onDelete: {
              type: 'string',
              enum: ['CASCADE', 'SET_NULL', 'RESTRICT'],
            },
            mirror: {
              type: 'object',
              additionalProperties: true,
              properties: {
                multiple: { type: 'boolean' },
                visible: { type: 'boolean' },
                label: { type: 'string' },
              },
            },
            relationshipId: { type: 'string', nullable: true },
            formMode: {
              type: 'string',
              enum: ['select', 'manage'],
              nullable: true,
            },
            side: {
              type: 'string',
              enum: ['source', 'target'],
              nullable: true,
            },
            max: { type: 'number', nullable: true },
          },
        },
        group: {
          type: 'object',
          nullable: true,
          description: 'Configuração do grupo de campos',
          properties: {
            _id: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        category: {
          type: 'array',
          nullable: true,
          description: 'Opções de categoria',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              children: { type: 'array' },
            },
          },
        },
        validations: {
          type: 'array',
          description: 'Regras de validação configuradas para o campo',
          items: {
            type: 'object',
            properties: {
              rule: { type: 'string' },
              config: { type: 'object', additionalProperties: true },
            },
          },
        },
        htmlContent: { type: 'string', nullable: true },
        trashed: { type: 'boolean', description: 'Campo está na lixeira' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data de envio para a lixeira',
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
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT'],
        },
        errors: {
          type: 'object',
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
      description: 'Acesso negado - Permissões insuficientes',
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
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Tabela ou campo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND'],
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
        cause: { type: 'string', enum: ['GET_FIELD_BY_ID_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
