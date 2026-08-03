import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  E_JWT_TYPE,
  E_ROLE,
  type IJWTPayload,
  type IUser,
} from '@application/core/entity.core';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Confere assinatura RS256 e expiracao. `jwt.decode` apenas desserializa e
 * aceitaria um token forjado — nunca usar para autorizar.
 *
 * Devolve `null` (em vez de lancar) porque os chamadores ja tratam token
 * ausente e token invalido pelo mesmo caminho de 401.
 */
export const verifyToken = async (
  request: FastifyRequest,
  token: string,
): Promise<IJWTPayload | null> => {
  try {
    return await request.server.jwt.verify<IJWTPayload>(token);
  } catch {
    return null;
  }
};

export const createTokens = async (
  user: Pick<IUser, '_id' | 'email' | 'group'>,
  response: FastifyReply,
): Promise<TokenPair> => {
  const slug = user?.group?.slug?.toUpperCase();
  const role =
    Object.values(E_ROLE).find((item) => item === slug) ?? E_ROLE.REGISTERED;

  const jwt: IJWTPayload = {
    sub: user._id.toString(),
    email: user.email,
    role,
    type: E_JWT_TYPE.ACCESS,
  };

  const accessToken = await response.jwtSign(jwt, {
    sub: user._id.toString(),
    expiresIn: '24h',
  });

  const refreshToken = await response.jwtSign(
    {
      sub: user._id.toString(),
      type: E_JWT_TYPE.REFRESH,
    },
    {
      sub: user._id.toString(),
      expiresIn: '7d',
    },
  );

  return { accessToken, refreshToken };
};
