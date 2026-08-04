import type {
  FindOptions,
  IValidationToken,
} from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  ValidationTokenContractRepository,
  ValidationTokenCreatePayload,
  ValidationTokenQueryPayload,
  ValidationTokenUpdatePayload,
} from './validation-token-contract.repository';

const fixtures = new EntityFixtures();

export default class ValidationTokenInMemoryRepository
  extends InMemoryCollectionRepository<IValidationToken>
  implements ValidationTokenContractRepository
{
  async create(
    payload: ValidationTokenCreatePayload,
  ): Promise<IValidationToken> {
    const userId = payload.user;
    const token: IValidationToken = {
      ...payload,
      ...this.stamp(),
      // Double de teste: ref populada de usuário com defaults inertes.
      user: fixtures.makeUser(userId),
    };
    this.items.push(token);
    return token;
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IValidationToken | null> {
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findByCode(
    code: string,
    options?: FindOptions,
  ): Promise<IValidationToken | null> {
    const item = this.items.find((i) => {
      if (i.code !== code) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findMany(
    payload?: ValidationTokenQueryPayload,
  ): Promise<IValidationToken[]> {
    let filtered = this.items;

    if (payload?.user) {
      filtered = filtered.filter((t) => t.user._id === payload.user);
    }

    if (payload?.status) {
      filtered = filtered.filter((t) => t.status === payload.status);
    }

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: ValidationTokenUpdatePayload): Promise<IValidationToken> {
    return this.patchById(_id, payload, 'ValidationToken');
  }

  async delete(_id: string): Promise<void> {
    this.removeById(_id, 'ValidationToken');
  }

  async count(payload?: ValidationTokenQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
