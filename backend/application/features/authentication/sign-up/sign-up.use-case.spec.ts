import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_ROLE, E_USER_STATUS } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';

import SignUpUseCase from './sign-up.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let emailQueue: InMemoryEmailQueueService;
let passwordService: InMemoryPasswordService;
let sut: SignUpUseCase;

describe('Sign Up Use Case', () => {
  beforeEach(async () => {
    userInMemoryRepository = new UserInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    emailQueue = new InMemoryEmailQueueService();
    passwordService = new InMemoryPasswordService();
    sut = new SignUpUseCase(
      userInMemoryRepository,
      userGroupInMemoryRepository,
      emailQueue,
      passwordService,
    );

    await userGroupInMemoryRepository.create({
      name: 'Registered',
      slug: E_ROLE.REGISTERED,
      permissions: [],
    });
  });

  it('deve registrar usuario com sucesso', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('John Doe');
    expect(result.value.email).toBe('john@example.com');
    expect(result.value.status).toBe(E_USER_STATUS.ACTIVE);
    expect(result.value.password).toBe('hashed_password123');

    const found = await userInMemoryRepository.findByEmail('john@example.com');
    expect(found?._id).toBe(result.value._id);
  });

  it('deve enfileirar email de boas-vindas apos registro', async () => {
    await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].template).toBe('sign-up');
    expect(jobs[0].to).toContain('john@example.com');
    expect(jobs[0].subject).toBe('Bem-vindo ao LowCodeJS!');
  });

  it('deve retornar erro USER_ALREADY_EXISTS quando email ja existir', async () => {
    const existing = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('USER_ALREADY_EXISTS');
    expect(result.value.message).toBe('Usuário já existe');

    const found = await userInMemoryRepository.findByEmail('john@example.com');
    expect(found?._id).toBe(existing._id);
  });

  it('deve retornar erro USER_ALREADY_EXISTS quando email estiver na lixeira', async () => {
    const existing = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await userInMemoryRepository.update({
      _id: existing._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('USER_ALREADY_EXISTS');
  });

  it('deve retornar erro GROUP_NOT_FOUND quando grupo REGISTERED nao existir', async () => {
    const newUserRepo = new UserInMemoryRepository();
    const newGroupRepo = new UserGroupInMemoryRepository();
    const newEmailQueue = new InMemoryEmailQueueService();
    const newPasswordService = new InMemoryPasswordService();
    const newSut = new SignUpUseCase(
      newUserRepo,
      newGroupRepo,
      newEmailQueue,
      newPasswordService,
    );

    const result = await newSut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo não encontrado');
  });

  it('deve retornar erro SIGN_UP_ERROR quando houver falha', async () => {
    const findByEmailSpy = vi
      .spyOn(userInMemoryRepository, 'findByEmail')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SIGN_UP_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByEmailSpy).toHaveBeenCalledTimes(1);
  });
});
