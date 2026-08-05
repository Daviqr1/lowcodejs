import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import ValidationTokenInMemoryRepository from '@application/repositories/validation-token/validation-token-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';

import RequestCodeUseCase from './request-code.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let validationTokenInMemoryRepository: ValidationTokenInMemoryRepository;
let emailQueue: InMemoryEmailQueueService;
let sut: RequestCodeUseCase;

describe('Request Code Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    validationTokenInMemoryRepository = new ValidationTokenInMemoryRepository();
    emailQueue = new InMemoryEmailQueueService();
    sut = new RequestCodeUseCase(
      userInMemoryRepository,
      validationTokenInMemoryRepository,
      emailQueue,
    );
  });

  it('deve criar codigo de validacao com sucesso', async () => {
    const user = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password',
      group: 'group-id',
    });

    const result = await sut.execute({ email: 'john@example.com' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const tokens = validationTokenInMemoryRepository.items.filter(
      (t) => t.user._id === user._id,
    );
    expect(tokens).toHaveLength(1);
    const jobs = emailQueue.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].template).toBe('recovery-code');
    expect(jobs[0].to).toContain('john@example.com');
  });

  it('deve gerar codigo numerico de 6 digitos', async () => {
    await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password',
      group: 'group-id',
    });

    await sut.execute({ email: 'john@example.com' });

    const tokens = validationTokenInMemoryRepository.items;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].code).toMatch(/^\d{6}$/);
    expect(Number(tokens[0].code)).toBeGreaterThanOrEqual(100000);
    expect(Number(tokens[0].code)).toBeLessThanOrEqual(999999);
  });

  it('deve retornar erro EMAIL_NOT_FOUND quando email nao existir', async () => {
    const result = await sut.execute({ email: 'nonexistent@example.com' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('EMAIL_NOT_FOUND');
    expect(result.value.message).toBe('E-mail não encontrado');

    expect(validationTokenInMemoryRepository.items).toHaveLength(0);
  });

  it('deve retornar erro REQUEST_CODE_ERROR quando houver falha', async () => {
    const findByEmailSpy = vi
      .spyOn(userInMemoryRepository, 'findByEmail')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({ email: 'john@example.com' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('REQUEST_CODE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByEmailSpy).toHaveBeenCalledTimes(1);
  });
});
