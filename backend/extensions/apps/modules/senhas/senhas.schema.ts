import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  ChannelParamsValidator,
  CreateChannelValidator,
  CreateEntryValidator,
  EntryParamsValidator,
  UpdateChannelValidator,
  UpdateEntryValidator,
} from './senhas.validator';

const errorBlock = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number' },
    cause: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const userRef = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
  },
} as const;

const channelObject = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    private: { type: 'boolean' },
    owner: { oneOf: [userRef, { type: 'string' }] },
    members: {
      type: 'array',
      items: { oneOf: [userRef, { type: 'string' }] },
    },
    entriesCount: { type: 'number' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

const entryObject = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    channel: { type: 'string' },
    title: { type: 'string' },
    username: { type: ['string', 'null'] },
    url: { type: ['string', 'null'] },
    secret: { type: 'string' },
    notes: { type: ['string', 'null'] },
    author: { oneOf: [userRef, { type: 'string' }] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

const commonErrors = {
  400: errorBlock,
  401: errorBlock,
  403: errorBlock,
  404: errorBlock,
  500: errorBlock,
} as const;

const TAGS = ['Extensões'];
const SECURITY = [{ cookieAuth: [] }];

export const ListChannelsSchema: FastifySchema = {
  tags: TAGS,
  summary: 'Lista os canais de senhas visíveis ao usuário',
  security: SECURITY,
  response: {
    200: { type: 'array', items: channelObject },
    ...commonErrors,
  },
};

export const CreateChannelSchema: FastifySchema = {
  tags: TAGS,
  summary: 'Cria um canal de senhas (privado por padrão)',
  security: SECURITY,
  body: zodToRouteSchema(CreateChannelValidator),
  response: { 201: channelObject, ...commonErrors },
};

export const UpdateChannelSchema: FastifySchema = {
  tags: TAGS,
  summary: 'Atualiza um canal de senhas (apenas o dono)',
  security: SECURITY,
  params: zodToRouteSchema(ChannelParamsValidator),
  body: zodToRouteSchema(UpdateChannelValidator),
  response: { 200: channelObject, ...commonErrors },
};

export const DeleteChannelSchema: FastifySchema = {
  tags: TAGS,
  summary: 'Exclui um canal e todas as suas senhas (apenas o dono)',
  security: SECURITY,
  params: zodToRouteSchema(ChannelParamsValidator),
  response: {
    200: { type: 'object', properties: { _id: { type: 'string' } } },
    ...commonErrors,
  },
};

export const ListEntriesSchema: FastifySchema = {
  tags: TAGS,
  summary: 'Lista as senhas (decifradas) de um canal',
  security: SECURITY,
  params: zodToRouteSchema(ChannelParamsValidator),
  response: {
    200: { type: 'array', items: entryObject },
    ...commonErrors,
  },
};

export const CreateEntrySchema: FastifySchema = {
  tags: TAGS,
  summary: 'Cria uma senha no canal (cifrada em repouso)',
  security: SECURITY,
  params: zodToRouteSchema(ChannelParamsValidator),
  body: zodToRouteSchema(CreateEntryValidator),
  response: { 201: entryObject, ...commonErrors },
};

export const UpdateEntrySchema: FastifySchema = {
  tags: TAGS,
  summary: 'Atualiza uma senha do canal',
  security: SECURITY,
  params: zodToRouteSchema(EntryParamsValidator),
  body: zodToRouteSchema(UpdateEntryValidator),
  response: { 200: entryObject, ...commonErrors },
};

export const DeleteEntrySchema: FastifySchema = {
  tags: TAGS,
  summary: 'Exclui uma senha do canal',
  security: SECURITY,
  params: zodToRouteSchema(EntryParamsValidator),
  response: {
    200: { type: 'object', properties: { _id: { type: 'string' } } },
    ...commonErrors,
  },
};
