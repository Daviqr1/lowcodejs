import { subMinutes } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TOKEN_STATUS } from '@application/core/entity.core';
import ValidationTokenInMemoryRepository from '@application/repositories/validation-token/validation-token-in-memory.repository';

import ValidateCodeUseCase from './validate-code.use-case';

let validationTokenInMemoryRepository: ValidationTokenInMemoryRepository;
let sut: ValidateCodeUseCase;

describe('Validate Code Use Case', () => {
  beforeEach(() => {
    validationTokenInMemoryRepository = new ValidationTokenInMemoryRepository();
    sut = new ValidateCodeUseCase(validationTokenInMemoryRepository);
  });

  it('deve validar codigo com sucesso', async () => {
    await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.REQUESTED,
      user: 'user-id',
    });

    const result = await sut.execute({
      code: '123456',
      email: 'user-id@example.com',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.user._id).toBe('user-id');
  });

  it('deve marcar token como VALIDATED apos validacao bem-sucedida', async () => {
    const token = await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.REQUESTED,
      user: 'user-id',
    });

    await sut.execute({ code: '123456', email: 'user-id@example.com' });

    const updated = await validationTokenInMemoryRepository.findById(token._id);
    expect(updated?.status).toBe(E_TOKEN_STATUS.VALIDATED);
  });

  it('deve retornar erro VALIDATION_TOKEN_NOT_FOUND quando codigo nao existir', async () => {
    const result = await sut.execute({
      code: 'invalid-code',
      email: 'user-id@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('VALIDATION_TOKEN_NOT_FOUND');
    expect(result.value.message).toBe('Token de validação não encontrado');
  });

  it('deve retornar VALIDATION_TOKEN_NOT_FOUND quando o codigo pertencer a outra conta', async () => {
    await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.REQUESTED,
      user: 'user-id',
    });

    const result = await sut.execute({
      code: '123456',
      email: 'outra-pessoa@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('VALIDATION_TOKEN_NOT_FOUND');
  });

  it('deve retornar VALIDATION_TOKEN_ALREADY_USED quando o codigo ja foi usado', async () => {
    await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.VALIDATED,
      user: 'user-id',
    });

    const result = await sut.execute({
      code: '123456',
      email: 'user-id@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('VALIDATION_TOKEN_ALREADY_USED');
  });

  it('deve retornar erro VALIDATION_TOKEN_EXPIRED quando token ja estiver expirado', async () => {
    await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.EXPIRED,
      user: 'user-id',
    });

    const result = await sut.execute({
      code: '123456',
      email: 'user-id@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(410);
    expect(result.value.cause).toBe('VALIDATION_TOKEN_EXPIRED');
    expect(result.value.message).toBe('Código expirado');
  });

  it('deve retornar erro VALIDATION_TOKEN_EXPIRED quando codigo tiver mais de 10 minutos', async () => {
    const token = await validationTokenInMemoryRepository.create({
      code: '123456',
      status: E_TOKEN_STATUS.REQUESTED,
      user: 'user-id',
    });

    // Simular token criado ha 15 minutos
    Object.assign(token, { createdAt: subMinutes(new Date(), 15) });

    const result = await sut.execute({
      code: '123456',
      email: 'user-id@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(410);
    expect(result.value.cause).toBe('VALIDATION_TOKEN_EXPIRED');
    expect(result.value.message).toBe('Código expirado');

    const updated = await validationTokenInMemoryRepository.findById(token._id);
    expect(updated?.status).toBe(E_TOKEN_STATUS.EXPIRED);
  });

  it('deve retornar erro VALIDATE_CODE_ERROR quando houver falha', async () => {
    const findByCodeSpy = vi
      .spyOn(validationTokenInMemoryRepository, 'findByCode')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      code: '123456',
      email: 'user-id@example.com',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('VALIDATE_CODE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByCodeSpy).toHaveBeenCalledTimes(1);
  });
});
