import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';

import UpdatePasswordRecoveryUseCase from './reset-password.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let passwordService: InMemoryPasswordService;
let emailQueue: InMemoryEmailQueueService;
let sut: UpdatePasswordRecoveryUseCase;

describe('Reset Password Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    passwordService = new InMemoryPasswordService();
    emailQueue = new InMemoryEmailQueueService();
    sut = new UpdatePasswordRecoveryUseCase(
      userInMemoryRepository,
      passwordService,
      emailQueue,
    );
  });

  it('deve atualizar senha com sucesso', async () => {
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'old_password',
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: user._id,
      password: 'new_password',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const updated = await userInMemoryRepository.findById(user._id);
    expect(updated?.password).toBe('hashed_new_password');
  });

  it('deve armazenar senha hasheada e nao em texto plano', async () => {
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'old_password',
      group: 'group-id',
    });

    await sut.execute({
      _id: user._id,
      password: 'new_password',
    });

    const updatedUser = await userInMemoryRepository.findById(user._id);
    expect(updatedUser).not.toBeNull();
    if (!updatedUser) throw new Error('Expected user');
    expect(updatedUser.password).toBe('hashed_new_password');
    expect(updatedUser.password).not.toBe('new_password');
  });

  it('deve enfileirar email de confirmação apos redefinir senha', async () => {
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'old_password',
      group: 'group-id',
    });

    await sut.execute({
      _id: user._id,
      password: 'new_password',
    });

    const job = emailQueue.getLastJob();
    expect(job).toBeDefined();
    expect(job?.template).toBe('reset-password-confirmation');
    expect(job?.to).toContain(user.email);
    expect(job?.subject).toBe('Senha redefinida com sucesso');
  });

  it('deve retornar erro USER_NOT_FOUND quando usuário nao existir', async () => {
    const result = await sut.execute({
      _id: 'non-existent-id',
      password: 'new_password',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('USER_NOT_FOUND');
    expect(result.value.message).toBe('Usuário não encontrado');
  });

  it('deve retornar erro UPDATE_PASSWORD_ERROR quando houver falha', async () => {
    const findByIdSpy = vi
      .spyOn(userInMemoryRepository, 'findById')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      _id: 'some-id',
      password: 'new_password',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_PASSWORD_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByIdSpy).toHaveBeenCalledTimes(1);
  });
});
