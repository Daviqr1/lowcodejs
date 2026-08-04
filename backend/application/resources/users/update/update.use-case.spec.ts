import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';

import UserUpdateUseCase from './update.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let groupInMemoryRepository: UserGroupInMemoryRepository;
let passwordService: InMemoryPasswordService;
let emailQueue: InMemoryEmailQueueService;
let sut: UserUpdateUseCase;

describe('User Update Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    groupInMemoryRepository = new UserGroupInMemoryRepository();
    passwordService = new InMemoryPasswordService();
    emailQueue = new InMemoryEmailQueueService();
    sut = new UserUpdateUseCase(
      userInMemoryRepository,
      passwordService,
      emailQueue,
      groupInMemoryRepository,
      new GroupResolverService(groupInMemoryRepository),
    );
  });

  it('deve atualizar usuario com sucesso (sem password)', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Updated',
      email: 'john.updated@example.com',
      group: 'new-group-id',
      status: E_USER_STATUS.ACTIVE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('John Updated');
    expect(result.value.email).toBe('john.updated@example.com');
    expect(result.value.password).toBe('password123');
  });

  it('deve atualizar usuario com nova senha (hasheada)', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'oldpassword',
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Doe',
      email: 'john@example.com',
      group: 'group-id',
      status: E_USER_STATUS.ACTIVE,
      password: 'newpassword',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.password).not.toBe('newpassword');
    expect(result.value.password).not.toBe('oldpassword');
    expect(result.value.password).toBe('hashed_newpassword');
  });

  it('deve permitir alterar status do usuario', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Doe',
      email: 'john@example.com',
      group: 'group-id',
      status: E_USER_STATUS.INACTIVE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.status).toBe(E_USER_STATUS.INACTIVE);
  });

  it('deve retornar erro USER_NOT_FOUND (404) quando usuario nao existe', async () => {
    const result = await sut.execute({
      _id: 'non-existent-id',
      name: 'John Doe',
      email: 'john@example.com',
      group: 'group-id',
      status: E_USER_STATUS.ACTIVE,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('USER_NOT_FOUND');
    expect(result.value.message).toBe('Usuário não encontrado');
  });

  it('enfileira email account-changed quando senha muda', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'oldpassword',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      password: 'newpassword',
    });

    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].template).toBe('user-account-changed');
    expect(jobs[0].to).toEqual(['john@example.com']);
    expect(jobs[0].subject).toBe('Sua conta no LowCodeJS foi atualizada');
    expect(jobs[0].data.recipientType).toBe('current');
    expect(jobs[0].data.changes).toEqual(['Senha alterada']);
  });

  it('enfileira email account-changed quando status muda', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      status: E_USER_STATUS.INACTIVE,
    });

    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].to).toEqual(['john@example.com']);
    expect(jobs[0].data.changes).toEqual(['Conta desativada']);
  });

  it('enfileira DOIS jobs (old + new) quando email muda', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'old@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      email: 'new@example.com',
    });

    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(2);

    const recipients = jobs.map((j) => j.to[0]);
    expect(recipients).toContain('old@example.com');
    expect(recipients).toContain('new@example.com');

    const subjects = jobs.map((j) => j.subject);
    expect(subjects).toContain('Seu email no LowCodeJS foi alterado');
    expect(subjects).toContain('Bem-vindo ao seu novo email no LowCodeJS');

    const recipientTypes = jobs.map((j) => j.data.recipientType);
    expect(recipientTypes).toContain('old');
    expect(recipientTypes).toContain('new');
  });

  it('NAO enfileira email quando apenas name muda', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      name: 'John Updated',
    });

    expect(emailQueue.getJobs()).toHaveLength(0);
  });

  it('NAO enfileira email quando apenas group muda', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      group: 'new-group-id',
    });

    expect(emailQueue.getJobs()).toHaveLength(0);
  });

  it('NAO enfileira email quando email enviado e igual ao atual', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    await sut.execute({
      _id: created._id,
      email: 'john@example.com',
      name: 'John Updated',
    });

    expect(emailQueue.getJobs()).toHaveLength(0);
  });

  it('deve retornar erro UPDATE_USER_ERROR (500) em falha de DB', async () => {
    const findByIdSpy = vi
      .spyOn(userInMemoryRepository, 'findById')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      _id: 'any-id',
      name: 'John Doe',
      email: 'john@example.com',
      group: 'group-id',
      status: E_USER_STATUS.ACTIVE,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_USER_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByIdSpy).toHaveBeenCalledTimes(1);
  });
});
