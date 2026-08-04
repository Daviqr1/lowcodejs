import type {
  FindOptions,
  IValidationToken,
} from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  ValidationTokenContractRepository,
  ValidationTokenCreatePayload,
  ValidationTokenQueryPayload,
  ValidationTokenUpdatePayload,
} from './validation-token-contract.repository';

const fixtures = new EntityFixtures();

export default class ValidationTokenInMemoryRepository
  extends InMemoryRepository
  implements ValidationTokenContractRepository
{
  items: IValidationToken[] = [];

  async create(
    payload: ValidationTokenCreatePayload,
  ): Promise<IValidationToken> {
    const userId = payload.user;
    const token: IValidationToken = {
      ...payload,
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
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
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findByCode(
    code: string,
    options?: FindOptions,
  ): Promise<IValidationToken | null> {
    const item = this.items.find((i) => {
      if (i.code !== code) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
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

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: ValidationTokenUpdatePayload): Promise<IValidationToken> {
    const token = this.items.find((t) => t._id === _id);
    if (!token) throw new Error('ValidationToken not found');
    Object.assign(token, payload, { updatedAt: new Date() });
    return token;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((t) => t._id === _id);
    if (index === -1) throw new Error('ValidationToken not found');
    this.items.splice(index, 1);
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
