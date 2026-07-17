import { beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE, type IGroup } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';

import GroupResolverService from './group-resolver.service';

function makeGroup(
  id: string,
  slug: string,
  encompasses: Array<string> = [],
): IGroup {
  return {
    _id: id,
    name: slug,
    slug,
    description: null,
    permissions: [],
    encompasses,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

let userRepository: UserInMemoryRepository;
let groupRepository: UserGroupInMemoryRepository;
let sut: GroupResolverService;

describe('Group Resolver — isMaster / shouldHideMaster', () => {
  beforeEach(() => {
    userRepository = new UserInMemoryRepository();
    groupRepository = new UserGroupInMemoryRepository();
    groupRepository.items.push(
      makeGroup('g-master', E_ROLE.MASTER),
      makeGroup('g-admin', E_ROLE.ADMINISTRATOR),
      makeGroup('g-registered', E_ROLE.REGISTERED),
      // Grupo custom que engloba MASTER.
      makeGroup('g-custom', 'custom', ['g-master']),
    );
    sut = new GroupResolverService(groupRepository);
  });

  it('isMaster: true para MASTER no grupo principal', async () => {
    const user = await userRepository.create({
      name: 'M',
      email: 'm@x.com',
      password: 'x',
      group: 'g-master',
    });

    expect(await sut.isMaster(user)).toBe(true);
  });

  it('isMaster: true para MASTER em grupo adicional (groups[])', async () => {
    const user = await userRepository.create({
      name: 'M2',
      email: 'm2@x.com',
      password: 'x',
      group: 'g-registered',
      groups: ['g-master'],
    });

    expect(await sut.isMaster(user)).toBe(true);
  });

  it('isMaster: true via grupo que engloba MASTER (encompasses)', async () => {
    const user = await userRepository.create({
      name: 'M3',
      email: 'm3@x.com',
      password: 'x',
      group: 'g-custom',
    });

    expect(await sut.isMaster(user)).toBe(true);
  });

  it('isMaster: false para ADMINISTRATOR', async () => {
    const user = await userRepository.create({
      name: 'A',
      email: 'a@x.com',
      password: 'x',
      group: 'g-admin',
    });

    expect(await sut.isMaster(user)).toBe(false);
    expect(await sut.isPrivileged(user)).toBe(true);
  });

  it('shouldHideMaster: true para ADMINISTRATOR (privilegiado, não MASTER)', async () => {
    const user = await userRepository.create({
      name: 'A2',
      email: 'a2@x.com',
      password: 'x',
      group: 'g-admin',
    });

    expect(await sut.shouldHideMaster(user)).toBe(true);
  });

  it('shouldHideMaster: false para MASTER', async () => {
    const user = await userRepository.create({
      name: 'M4',
      email: 'm4@x.com',
      password: 'x',
      group: 'g-master',
    });

    expect(await sut.shouldHideMaster(user)).toBe(false);
  });

  it('shouldHideMaster: false para não privilegiado (REGISTERED)', async () => {
    const user = await userRepository.create({
      name: 'R',
      email: 'r@x.com',
      password: 'x',
      group: 'g-registered',
    });

    expect(await sut.shouldHideMaster(user)).toBe(false);
  });
});
