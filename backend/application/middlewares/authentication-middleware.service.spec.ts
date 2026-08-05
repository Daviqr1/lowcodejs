import type { FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_JWT_TYPE,
  E_ROLE,
  E_USER_STATUS,
  type IJWTPayload,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import type { TokenPair } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';

import AuthenticationMiddlewareService from './authentication-middleware.service';

/**
 * Double minimo: o middleware so consome `getRequestCookie` e `verifyToken`.
 * O resto do contrato existe para satisfazer a classe abstrata.
 */
class StubSessionService extends SessionContractService {
  cookie: string | undefined = 'token';
  payload: IJWTPayload | null = null;

  async verifyToken(): Promise<IJWTPayload | null> {
    return this.payload;
  }
  getRequestCookie(): string | undefined {
    return this.cookie;
  }

  async createTokens(): Promise<TokenPair> {
    throw new Error('nao usado');
  }
  extractLastCookieValue(): string | undefined {
    return undefined;
  }
  getActiveAccountId(): string | undefined {
    return undefined;
  }
  readAccountSessions(): Record<string, string> {
    return {};
  }
  listAccountIds(): string[] {
    return [];
  }
  setActiveAccountCookie(): void {}
  clearActiveAccountCookie(): void {}
  writeAccountSessions(): void {}
  clearAccountSessions(): void {}
  setCookieTokens(): void {}
  clearCookieTokens(): void {}
  setActiveSession(): void {}
  clearAllSessions(): void {}
}

let session: StubSessionService;
let userRepository: UserInMemoryRepository;
let sut: AuthenticationMiddlewareService;

/**
 * O middleware so escreve `request.user` e repassa o request ao stub de sessao,
 * entao um objeto vazio basta — `Object.assign` estreita sem asercao de tipo.
 */
function makeRequest(): FastifyRequest {
  return Object.assign(Object.create(null), {});
}

async function makeUser(): Promise<{ _id: string; email: string }> {
  const user = await userRepository.create({
    name: 'Fulano',
    email: 'fulano@example.com',
    password: 'hash',
    group: 'group-id',
  });
  return user;
}

function tokenFor(
  user: { _id: string; email: string },
  sessionVersion?: number,
): IJWTPayload {
  return {
    sub: user._id,
    email: user.email,
    role: E_ROLE.REGISTERED,
    type: E_JWT_TYPE.ACCESS,
    ...(sessionVersion !== undefined && { sessionVersion }),
  };
}

describe('Authentication Middleware Service', () => {
  beforeEach(() => {
    session = new StubSessionService();
    userRepository = new UserInMemoryRepository();
    sut = new AuthenticationMiddlewareService(session, userRepository);
  });

  it('deve popular request.user quando a geracao de sessao e a corrente', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user, 0);

    const request = makeRequest();
    await sut.handle({ optional: false })(request);

    expect(request.user?.sub).toBe(user._id);
  });

  it('deve aceitar token anterior ao campo, tratando a geracao ausente como 0', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user);

    const request = makeRequest();
    await sut.handle({ optional: false })(request);

    expect(request.user?.sub).toBe(user._id);
  });

  it('deve recusar token emitido antes da troca de senha', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user, 0);

    await userRepository.revokeSessions(user._id);

    const request = makeRequest();
    await expect(
      sut.handle({ optional: false })(request),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  it('deve recusar usuario desativado', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user, 0);

    await userRepository.update({
      _id: user._id,
      status: E_USER_STATUS.INACTIVE,
    });

    const request = makeRequest();
    await expect(
      sut.handle({ optional: false })(request),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  it('deve recusar usuario removido', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user, 0);

    await userRepository.delete(user._id);

    const request = makeRequest();
    await expect(
      sut.handle({ optional: false })(request),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  it('deve seguir sem usuario, e sem erro, quando a rota e opcional', async () => {
    const user = await makeUser();
    session.payload = tokenFor(user, 0);

    await userRepository.revokeSessions(user._id);

    const request = makeRequest();
    await sut.handle({ optional: true })(request);

    expect(request.user).toBeUndefined();
  });
});
