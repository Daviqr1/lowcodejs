import type { FastifySchema } from 'fastify';

import {
  MenuListResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';

export const MenuListSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Listar itens de menu visíveis ao usuário',
  security: [{ cookieAuth: [] }],
  response: {
    200: MenuListResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_MENU_ERROR'),
  },
};
