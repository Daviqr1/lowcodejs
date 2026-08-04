import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import { SecretCryptoContractService } from './secret-crypto-contract.service';
import SenhasChannelUseCase from './senhas-channel.use-case';
import { PasswordChannelModel, PasswordEntryModel } from './senhas.model';
import type {
  CreateEntryInput,
  IPasswordEntry,
  IPasswordUserRef,
  UpdateEntryInput,
} from './senhas.types';

function toId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String(value._id);
  }
  return String(value);
}

type ChannelLean = {
  _id: unknown;
  owner: unknown;
  members: Array<unknown>;
  private: boolean;
} | null;

@Service()
export default class SenhasEntryUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly crypto: SecretCryptoContractService,
    private readonly channel: SenhasChannelUseCase,
  ) {}

  private async resolveUsers(
    ids: Array<string>,
  ): Promise<Map<string, IPasswordUserRef>> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return new Map();
    const users = await this.userRepository.findMany({ _ids: unique });
    return new Map(
      users.map((u) => [
        String(u._id),
        { _id: String(u._id), name: u.name, email: u.email },
      ]),
    );
  }

  /** Decifra os campos sensíveis e serializa para resposta. */
  private serialize(
    entry: {
      _id: unknown;
      channel: unknown;
      title: string;
      username?: string | null;
      url?: string | null;
      secret: string;
      notes?: string | null;
      author: unknown;
      createdAt: Date;
      updatedAt: Date;
    },
    users: Map<string, IPasswordUserRef>,
  ): IPasswordEntry {
    const authorId = toId(entry.author);
    return {
      _id: toId(entry._id),
      channel: toId(entry.channel),
      title: entry.title,
      username: entry.username ?? null,
      url: entry.url ?? null,
      secret: this.crypto.decrypt(entry.secret) ?? '',
      notes: this.crypto.decrypt(entry.notes),
      author: users.get(authorId) ?? authorId,
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    };
  }

  private async loadChannel(channelId: string): Promise<ChannelLean> {
    return PasswordChannelModel.findById(channelId).lean();
  }

  /** Lista as entradas (DECIFRADAS) de um canal que o usuário pode ver. */
  async list(
    userId: string,
    channelId: string,
  ): Promise<Either<HTTPException, Array<IPasswordEntry>>> {
    try {
      const channel = await this.loadChannel(channelId);
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      if (!this.channel.canView(channel, userId)) {
        return left(
          HTTPException.Forbidden(
            'Você não tem acesso a este canal',
            'SENHAS_CHANNEL_ACCESS_DENIED',
          ),
        );
      }

      const entries = await PasswordEntryModel.find({ channel: channelId })
        .sort({ updatedAt: -1 })
        .lean();

      const users = await this.resolveUsers(entries.map((e) => toId(e.author)));
      return right(entries.map((e) => this.serialize(e, users)));
    } catch (error) {
      console.error('[apps/senhas > entry.list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao listar senhas',
          'SENHAS_ENTRY_LIST_ERROR',
        ),
      );
    }
  }

  async create(
    userId: string,
    channelId: string,
    input: CreateEntryInput,
  ): Promise<Either<HTTPException, IPasswordEntry>> {
    try {
      const channel = await this.loadChannel(channelId);
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      // Escrita exige ser membro/owner — mesmo em canal público.
      if (!this.channel.isMember(channel, userId)) {
        return left(
          HTTPException.Forbidden(
            'Apenas membros do canal podem adicionar senhas',
            'SENHAS_CHANNEL_MEMBER_REQUIRED',
          ),
        );
      }

      const created = await PasswordEntryModel.create({
        channel: channelId,
        title: input.title,
        username: input.username ?? null,
        url: input.url ?? null,
        secret: this.crypto.encrypt(input.secret),
        notes: this.crypto.encrypt(input.notes ?? null),
        author: userId,
      });

      const users = await this.resolveUsers([userId]);
      return right(this.serialize(created.toObject(), users));
    } catch (error) {
      console.error('[apps/senhas > entry.create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao criar senha',
          'SENHAS_ENTRY_CREATE_ERROR',
        ),
      );
    }
  }

  async update(
    userId: string,
    channelId: string,
    entryId: string,
    input: UpdateEntryInput,
  ): Promise<Either<HTTPException, IPasswordEntry>> {
    try {
      const channel = await this.loadChannel(channelId);
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      if (!this.channel.isMember(channel, userId)) {
        return left(
          HTTPException.Forbidden(
            'Apenas membros do canal podem editar senhas',
            'SENHAS_CHANNEL_MEMBER_REQUIRED',
          ),
        );
      }

      const entry = await PasswordEntryModel.findOne({
        _id: entryId,
        channel: channelId,
      }).lean();
      if (!entry) {
        return left(
          HTTPException.NotFound(
            'Senha não encontrada',
            'SENHAS_ENTRY_NOT_FOUND',
          ),
        );
      }

      const update: Record<string, unknown> = {};
      if (input.title !== undefined) update.title = input.title;
      if (input.username !== undefined)
        update.username = input.username ?? null;
      if (input.url !== undefined) update.url = input.url ?? null;
      if (input.secret !== undefined)
        update.secret = this.crypto.encrypt(input.secret);
      if (input.notes !== undefined)
        update.notes = this.crypto.encrypt(input.notes ?? null);

      const updated = await PasswordEntryModel.findByIdAndUpdate(
        entryId,
        { $set: update },
        { new: true },
      ).lean();

      const users = await this.resolveUsers([toId(updated!.author)]);
      return right(this.serialize(updated!, users));
    } catch (error) {
      console.error('[apps/senhas > entry.update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao atualizar senha',
          'SENHAS_ENTRY_UPDATE_ERROR',
        ),
      );
    }
  }

  async remove(
    userId: string,
    channelId: string,
    entryId: string,
  ): Promise<Either<HTTPException, { _id: string }>> {
    try {
      const channel = await this.loadChannel(channelId);
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      if (!this.channel.isMember(channel, userId)) {
        return left(
          HTTPException.Forbidden(
            'Apenas membros do canal podem excluir senhas',
            'SENHAS_CHANNEL_MEMBER_REQUIRED',
          ),
        );
      }

      const deleted = await PasswordEntryModel.findOneAndDelete({
        _id: entryId,
        channel: channelId,
      }).lean();
      if (!deleted) {
        return left(
          HTTPException.NotFound(
            'Senha não encontrada',
            'SENHAS_ENTRY_NOT_FOUND',
          ),
        );
      }

      return right({ _id: entryId });
    } catch (error) {
      console.error('[apps/senhas > entry.remove][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao excluir senha',
          'SENHAS_ENTRY_REMOVE_ERROR',
        ),
      );
    }
  }
}
