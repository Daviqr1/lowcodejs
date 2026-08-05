import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const ChatUploadSchema: FastifySchema = {
  tags: ['Chat'],
  summary: 'Upload de arquivo para o chat',
  description:
    'Recebe um único arquivo (imagem PNG/JPG/GIF/WebP ou PDF, máximo 20 MB) e retorna os dados processados para envio via Socket.IO. Imagens são convertidas em data URI base64; PDFs têm o texto extraído. Validação é feita inline no controller (sem use-case).',
  security: [{ cookieAuth: [] }],
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Arquivo a ser enviado (imagem ou PDF, máximo 20 MB)',
      },
    },
  },
  response: {
    200: {
      description: 'Arquivo processado com sucesso (imagem ou PDF)',
      oneOf: [
        {
          type: 'object',
          description: 'Resultado de imagem',
          properties: {
            type: { type: 'string', enum: ['image'] },
            filename: { type: 'string', description: 'Nome do arquivo' },
            content_type: {
              type: 'string',
              description: 'Tipo MIME da imagem',
            },
            data_uri: {
              type: 'string',
              description: 'Imagem codificada como data URI base64',
            },
          },
        },
        {
          type: 'object',
          description: 'Resultado de PDF',
          properties: {
            type: { type: 'string', enum: ['pdf'] },
            filename: { type: 'string', description: 'Nome do arquivo' },
            page_count: {
              type: 'number',
              description: 'Quantidade de páginas do PDF',
            },
            extracted_text: {
              type: 'string',
              description: 'Texto extraído do PDF',
            },
          },
        },
      ],
    },
    400: {
      description:
        'Requisição inválida - arquivo ausente, tipo não suportado, tamanho excedido ou falha ao processar PDF',
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'Mensagem de erro do processamento do arquivo',
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Não autorizado',
    }),
    500: buildErrorResponse(500, 'SERVER_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
