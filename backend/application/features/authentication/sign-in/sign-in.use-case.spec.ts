import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';

import SignInUseCase from './sign-in.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let passwordService: InMemoryPasswordService;
let sut: SignInUseCase;

describe('Sign In Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    passwordService = new InMemoryPasswordService();
    sut = new SignInUseCase(userInMemoryRepository, passwordService);
  });

  it('deve autenticar usuario com credenciais validas', async () => {
    const hashedPassword = await passwordService.hash('password123');
    await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    const result = await sut.execute({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.email).toBe('john@example.com');
    expect(result.value.name).toBe('John Doe');
    expect(result.value.status).toBe(E_USER_STATUS.ACTIVE);
  });

  it('deve retornar erro 401 quando email nao existir', async () => {
    const result = await sut.execute({
      email: 'nonexistent@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(401);
    expect(result.value.cause).toBe('INVALID_CREDENTIALS');
    expect(result.value.message).toBe('E-mail ou senha inválidos');
  });

  it('deve retornar erro 401 quando senha estiver incorreta', async () => {
    const hashedPassword = await passwordService.hash('correct_password');
    await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    const result = await sut.execute({
      email: 'john@example.com',
      password: 'wrong_password',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(401);
    expect(result.value.cause).toBe('INVALID_CREDENTIALS');
    expect(result.value.message).toBe('E-mail ou senha inválidos');
  });

  it('deve retornar erro 401 quando usuario estiver inativo', async () => {
    const hashedPassword = await passwordService.hash('password123');
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    await userInMemoryRepository.update({
      _id: user._id,
      status: E_USER_STATUS.INACTIVE,
    });

    const result = await sut.execute({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(401);
    expect(result.value.cause).toBe('USER_INACTIVE');
    expect(result.value.message).toBe('Usuário inativo');
  });

  it('deve retornar erro 401 quando usuario estiver na lixeira', async () => {
    const hashedPassword = await passwordService.hash('password123');
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    await userInMemoryRepository.update({
      _id: user._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(401);
    expect(result.value.cause).toBe('INVALID_CREDENTIALS');
    expect(result.value.message).toBe('E-mail ou senha inválidos');
  });

  it('deve retornar erro SIGN_IN_ERROR quando houver falha', async () => {
    const findByEmailSpy = vi
      .spyOn(userInMemoryRepository, 'findByEmail')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SIGN_IN_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByEmailSpy).toHaveBeenCalledTimes(1);
  });
});
