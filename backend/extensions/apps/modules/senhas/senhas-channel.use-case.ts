import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import { PasswordChannelModel, PasswordEntryModel } from './senhas.model';
import type {
  CreateChannelInput,
  IPasswordChannel,
  IPasswordUserRef,
  UpdateChannelInput,
} from './senhas.types';

@Service()
export default class SenhasChannelUseCase {
  private toId(value: unknown): string {
    if (value && typeof value === 'object' && '_id' in value) {
      return String(value._id);
    }
    return String(value);
  }

  /**
   * Regras de acesso (passbolt-like):
   * - owner: criador do canal. Único que gerencia (renomear/excluir/membros).
   * - member: owner OU presente em `members`. Pode ler e editar entradas.
   * - canal público (`private: false`): leitura liberada a qualquer autenticado.
   */
  constructor(private readonly userRepository: UserContractRepository) {}

  isMember(
    channel: { owner: unknown; members: Array<unknown> },
    userId: string,
  ): boolean {
    if (this.toId(channel.owner) === userId) return true;
    return channel.members.some((m) => this.toId(m) === userId);
  }

  canView(
    channel: { owner: unknown; members: Array<unknown>; private: boolean },
    userId: string,
  ): boolean {
    if (!channel.private) return true;
    return this.isMember(channel, userId);
  }

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

  private serialize(
    channel: {
      _id: unknown;
      name: string;
      description?: string | null;
      private: boolean;
      owner: unknown;
      members: Array<unknown>;
      createdAt: Date;
      updatedAt: Date;
    },
    users: Map<string, IPasswordUserRef>,
    entriesCount: number,
  ): IPasswordChannel {
    const ownerId = this.toId(channel.owner);
    return {
      _id: this.toId(channel._id),
      name: channel.name,
      description: channel.description ?? null,
      private: channel.private,
      owner: users.get(ownerId) ?? ownerId,
      members: channel.members.map((m) => {
        const id = this.toId(m);
        return users.get(id) ?? id;
      }),
      entriesCount,
      createdAt: new Date(channel.createdAt).toISOString(),
      updatedAt: new Date(channel.updatedAt).toISOString(),
    };
  }

  /** Lista os canais que o usuário pode ver (owner, membro ou público). */
  async list(
    userId: string,
  ): Promise<Either<HTTPException, Array<IPasswordChannel>>> {
    try {
      const channels = await PasswordChannelModel.find({
        $or: [{ owner: userId }, { members: userId }, { private: false }],
      })
        .sort({ updatedAt: -1 })
        .lean();

      const userIds = channels.flatMap((c) => [
        this.toId(c.owner),
        ...c.members.map((id) => this.toId(id)),
      ]);
      const users = await this.resolveUsers(userIds);

      const counts = await Promise.all(
        channels.map((c) =>
          PasswordEntryModel.countDocuments({ channel: c._id }),
        ),
      );

      return right(
        channels.map((c, i) => this.serialize(c, users, counts[i] ?? 0)),
      );
    } catch (error) {
      console.error('[apps/senhas > channel.list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao listar canais de senhas',
          'SENHAS_CHANNEL_LIST_ERROR',
        ),
      );
    }
  }

  async create(
    userId: string,
    input: CreateChannelInput,
  ): Promise<Either<HTTPException, IPasswordChannel>> {
    try {
      // O owner é sempre membro: incluímos ele na lista (deduplicada) para que
      // apareça na UI e a contagem de membros fique consistente.
      const members = Array.from(new Set([userId, ...(input.members ?? [])]));

      const created = await PasswordChannelModel.create({
        name: input.name,
        description: input.description ?? null,
        private: input.private ?? true,
        owner: userId,
        members,
      });

      const users = await this.resolveUsers(members);
      return right(this.serialize(created.toObject(), users, 0));
    } catch (error) {
      console.error('[apps/senhas > channel.create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao criar canal de senhas',
          'SENHAS_CHANNEL_CREATE_ERROR',
        ),
      );
    }
  }

  async update(
    userId: string,
    channelId: string,
    input: UpdateChannelInput,
  ): Promise<Either<HTTPException, IPasswordChannel>> {
    try {
      const channel = await PasswordChannelModel.findById(channelId).lean();
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      if (this.toId(channel.owner) !== userId) {
        return left(
          HTTPException.Forbidden(
            'Apenas o dono do canal pode editá-lo',
            'SENHAS_CHANNEL_OWNER_REQUIRED',
          ),
        );
      }

      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.description !== undefined)
        update.description = input.description ?? null;
      if (input.private !== undefined) update.private = input.private;
      if (input.members !== undefined) {
        // Garante o owner sempre presente (não pode se remover do canal).
        update.members = Array.from(
          new Set([this.toId(channel.owner), ...input.members]),
        );
      }

      const updated = await PasswordChannelModel.findByIdAndUpdate(
        channelId,
        { $set: update },
        { new: true },
      ).lean();

      const count = await PasswordEntryModel.countDocuments({
        channel: channelId,
      });
      const users = await this.resolveUsers([
        this.toId(updated!.owner),
        ...updated!.members.map((id) => this.toId(id)),
      ]);
      return right(this.serialize(updated!, users, count));
    } catch (error) {
      console.error('[apps/senhas > channel.update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao atualizar canal de senhas',
          'SENHAS_CHANNEL_UPDATE_ERROR',
        ),
      );
    }
  }

  /** Exclusão definitiva do canal e de TODAS as suas entradas (hard delete). */
  async remove(
    userId: string,
    channelId: string,
  ): Promise<Either<HTTPException, { _id: string }>> {
    try {
      const channel = await PasswordChannelModel.findById(channelId).lean();
      if (!channel) {
        return left(
          HTTPException.NotFound(
            'Canal não encontrado',
            'SENHAS_CHANNEL_NOT_FOUND',
          ),
        );
      }
      if (this.toId(channel.owner) !== userId) {
        return left(
          HTTPException.Forbidden(
            'Apenas o dono do canal pode excluí-lo',
            'SENHAS_CHANNEL_OWNER_REQUIRED',
          ),
        );
      }

      await PasswordEntryModel.deleteMany({ channel: channelId });
      await PasswordChannelModel.findByIdAndDelete(channelId);

      return right({ _id: channelId });
    } catch (error) {
      console.error('[apps/senhas > channel.remove][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao excluir canal de senhas',
          'SENHAS_CHANNEL_REMOVE_ERROR',
        ),
      );
    }
  }
}
