import type { FastifySchema } from 'fastify';

export const StorageUploadSchema: FastifySchema = {
  tags: ['Armazenamento'],
  summary: 'Fazer upload de arquivos',
  description:
    'Faz upload de um ou mais arquivos para o sistema de armazenamento. Os arquivos são salvos no driver configurado e os metadados são armazenados no banco de dados',
  security: [{ cookieAuth: [] }],
  consumes: ['multipart/form-data'],
  querystring: {
    type: 'object',
    properties: {
      staticName: {
        type: 'string',
        minLength: 1,
        description: 'Nome fixo opcional para o arquivo (sobrescreve o gerado)',
      },
    },
  },
  response: {
    201: {
      description: 'Arquivos enviados com sucesso',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'ID do registro de armazenamento',
          },
          filename: {
            type: 'string',
            description: 'Nome do arquivo gerado com extensão',
            examples: ['12345678.jpg', '87654321.pdf'],
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL completa para acessar o arquivo',
            examples: ['http://localhost:3000/storage/12345678.jpg'],
          },
          mimetype: {
            type: 'string',
            description: 'Tipo MIME do arquivo',
            examples: ['image/webp', 'application/pdf', 'text/plain'],
          },
          size: {
            type: 'number',
            description: 'Tamanho do arquivo em bytes',
            examples: [12345678],
          },
          originalName: {
            type: 'string',
            description: 'Nome original do arquivo com extensão',
            examples: ['foto.jpg', 'documento.pdf'],
          },
          trashed: {
            type: 'boolean',
            description: 'Se o arquivo está na lixeira',
          },
          trashedAt: {
            type: 'string',
            nullable: true,
            description:
              'Quando o arquivo foi enviado para lixeira (null para novos arquivos)',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data do upload',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Data da última atualização',
          },
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
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['STORAGE_UPLOAD_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
