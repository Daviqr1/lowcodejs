import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import UserCreateUseCase from './create.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let passwordService: InMemoryPasswordService;
let emailQueue: InMemoryEmailQueueService;
let groupRepository: UserGroupInMemoryRepository;
let groupId: string;
let sut: UserCreateUseCase;

describe('User Create Use Case', () => {
  beforeEach(async () => {
    userInMemoryRepository = new UserInMemoryRepository();
    passwordService = new InMemoryPasswordService();
    emailQueue = new InMemoryEmailQueueService();
    groupRepository = new UserGroupInMemoryRepository();
    sut = new UserCreateUseCase(
      userInMemoryRepository,
      passwordService,
      emailQueue,
      groupRepository,
      new UserMapperService(),
    );

    // O use-case exige que o grupo exista, nao so que venha no payload.
    const group = await groupRepository.create({
      name: 'Registrados',
      slug: 'REGISTERED',
      permissions: [],
    });
    groupId = group._id;
  });

  it('deve criar um usuario com sucesso', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: groupId,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('John Doe');
    expect(result.value.email).toBe('john@example.com');
    // A resposta nao carrega mais o hash; confere na fonte.
    const stored = await userInMemoryRepository.findById(result.value._id);
    expect(stored?.password).toBe('hashed_password123');
    expect(result.value.status).toBe(E_USER_STATUS.ACTIVE);
  });

  it('deve retornar GROUP_NOT_FOUND quando o grupo informado nao existir', async () => {
    // Antes so a presenca era checada: um ObjectId valido porem inexistente
    // era gravado como FK fantasma.
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'grupo-que-nao-existe',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
  });

  it('deve retornar erro GROUP_NOT_INFORMED quando group nao for informado', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: '',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('GROUP_NOT_INFORMED');
    expect(result.value.message).toBe('Grupo não informado');
  });

  it('deve retornar erro USER_ALREADY_EXISTS quando email ja existe', async () => {
    const existing = await userInMemoryRepository.create({
      name: 'Existing User',
      email: 'existing@example.com',
      password: 'password123',
      group: groupId,
    });

    const result = await sut.execute({
      name: 'New User',
      email: 'existing@example.com',
      password: 'password123',
      group: groupId,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('USER_ALREADY_EXISTS');
    expect(result.value.message).toBe('Usuário já existe');

    const found = await userInMemoryRepository.findByEmail(
      'existing@example.com',
    );
    expect(found?._id).toBe(existing._id);
    expect(found?.name).toBe('Existing User');
  });

  it('deve enfileirar email de boas-vindas apos criar usuario', async () => {
    await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: groupId,
    });

    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].template).toBe('user-created');
    expect(jobs[0].to).toContain('john@example.com');
    expect(jobs[0].subject).toBe('Sua conta no LowCodeJS foi criada');
  });

  it('deve retornar erro CREATE_USER_ERROR quando houver falha', async () => {
    const findByEmailSpy = vi
      .spyOn(userInMemoryRepository, 'findByEmail')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: groupId,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_USER_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByEmailSpy).toHaveBeenCalledTimes(1);
  });
});
