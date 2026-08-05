import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryPasswordService from '@application/services/password/in-memory-password.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import ProfileUpdateUseCase from './update.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let passwordService: InMemoryPasswordService;
let sut: ProfileUpdateUseCase;

describe('Profile Update Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    passwordService = new InMemoryPasswordService();
    sut = new ProfileUpdateUseCase(
      userInMemoryRepository,
      passwordService,
      new UserMapperService(),
    );
  });

  it('deve atualizar o perfil do usuario sem alterar senha', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Updated',
      email: 'john.updated@example.com',
      allowPasswordChange: false,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('John Updated');
    expect(result.value.email).toBe('john.updated@example.com');
    // A resposta nao carrega mais o hash; confere na fonte.
    const untouched = await userInMemoryRepository.findById(result.value._id);
    expect(untouched?.password).toBe('hashed_password');
  });

  it('deve atualizar o perfil e senha quando senha atual estiver correta', async () => {
    const hashedPassword = await passwordService.hash('old_password');

    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Updated',
      email: 'john.updated@example.com',
      allowPasswordChange: true,
      currentPassword: 'old_password',
      newPassword: 'new_password',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('John Updated');
    const stored = await userInMemoryRepository.findById(result.value._id);
    expect(stored?.password).not.toBe(hashedPassword);
    expect(stored?.password).toBe('hashed_new_password');
  });

  it('deve retornar erro INVALID_CREDENTIALS quando senha atual estiver incorreta', async () => {
    const hashedPassword = await passwordService.hash('correct_password');
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      group: 'group-id',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'John Updated',
      email: 'john.updated@example.com',
      allowPasswordChange: true,
      currentPassword: 'wrong_password',
      newPassword: 'new_password',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(401);
    expect(result.value.cause).toBe('INVALID_CREDENTIALS');
    expect(result.value.message).toBe('Senha atual incorreta');
  });

  it('deve retornar erro USER_NOT_FOUND quando usuario nao existe', async () => {
    const result = await sut.execute({
      _id: 'non-existent-id',
      name: 'John',
      email: 'john@example.com',
      allowPasswordChange: false,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('USER_NOT_FOUND');
    expect(result.value.message).toBe('Usuário não encontrado');
  });

  it('deve retornar erro UPDATE_USER_PROFILE_ERROR quando houver falha', async () => {
    userInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      _id: 'some-id',
      name: 'John',
      email: 'john@example.com',
      allowPasswordChange: false,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_USER_PROFILE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
