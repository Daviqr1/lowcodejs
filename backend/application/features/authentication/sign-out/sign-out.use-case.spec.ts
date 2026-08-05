import { beforeEach, describe, expect, it } from 'vitest';

import SignOutUseCase from './sign-out.use-case';

let sut: SignOutUseCase;

describe('Sign Out Use Case', () => {
  beforeEach(() => {
    sut = new SignOutUseCase();
  });

  it('deve retornar sucesso ao fazer sign out', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.message).toBe('Logout realizado com sucesso');
  });

  it('deve sempre retornar Right (nunca Left)', async () => {
    const result = await sut.execute();

    expect(result.isLeft()).toBe(false);
    expect(result.isRight()).toBe(true);
  });
});
