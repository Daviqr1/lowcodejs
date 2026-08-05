import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  GenerateTestDataStatusParamsValidator,
  GenerateTestDataValidator,
} from './generate-test-data.validator';

export const GenerateTestDataSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Gerar dados de teste',
  description:
    'Inicia um job assíncrono para gerar registros de teste em massa para uma tabela selecionada.',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(GenerateTestDataValidator),
  response: {
    202: {
      description: 'Job iniciado com sucesso',
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'ID único do job de geração' },
        message: { type: 'string' },
      },
    },
    400: {
      description: 'Parâmetros inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

export const GenerateTestDataEstimateSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Estimar geração de dados de teste',
  description:
    'Calcula, sem gerar nada, o tamanho médio por linha, quantos registros ' +
    'serão inseridos de verdade (teto por orçamento de bytes) x simulados, o ' +
    'espaço estimado e avisos de impacto.',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(GenerateTestDataValidator),
  response: {
    200: {
      description: 'Estimativa calculada',
      type: 'object',
      properties: {
        requested: { type: 'number' },
        rowBytes: { type: 'number' },
        realTargetQuantity: { type: 'number' },
        simulatedQuantity: { type: 'number' },
        estimatedRealBytes: { type: 'number' },
        estimatedRealBytesHuman: { type: 'string' },
        cappedBy: {
          type: 'string',
          enum: ['requested', 'hard_cap', 'budget'],
        },
        willSimulate: { type: 'boolean' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

export const GetTestDataStatusSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Status da geração de dados de teste',
  description:
    'Retorna o progresso (percentual) e o status atual de um job de geração de registros.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(GenerateTestDataStatusParamsValidator),
  response: {
    200: {
      description: 'Detalhes do progresso',
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'completed', 'failed'],
        },
        processed: { type: 'number' },
        total: { type: 'number' },
        percentage: { type: 'number' },
        error: { type: 'string', nullable: true },
      },
    },
    404: {
      description: 'Job não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
      },
    },
  },
};
