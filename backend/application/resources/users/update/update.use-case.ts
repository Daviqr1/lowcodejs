import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_ROLE,
  E_USER_STATUS,
  type IUser as Entity,
  type Merge,
  type ValueOf,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { EmailQueueContractService } from '@application/services/email-queue/email-queue-contract.service';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { PasswordContractService } from '@application/services/password/password-contract.service';

import type { UserUpdatePayload } from './update.validator';

type Response = Either<HTTPException, Entity>;
type Payload = Merge<UserUpdatePayload, { actorId?: string }>;
type RecipientType = 'current' | 'old' | 'new';

const STATUS_CHANGE_LABELS: Record<ValueOf<typeof E_USER_STATUS>, string> = {
  [E_USER_STATUS.ACTIVE]: 'Conta reativada',
  [E_USER_STATUS.INACTIVE]: 'Conta desativada',
};

@Service()
export default class UserUpdateUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly passwordService: PasswordContractService,
    private readonly emailQueue: EmailQueueContractService,
    private readonly groupRepository: UserGroupContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  /**
   * Nada impedia atribuir a si mesmo (ou a terceiros) o grupo MASTER/ADMINISTRATOR:
   * quem tinha MANAGE_USERS se autopromovia num request, e privilegiado bypassa
   * todos os guards. Espelha a protecao ja existente no `send-to-trash`.
   */
  private async canAssignGroup(
    payload: Payload,
    actorId?: string,
  ): Promise<boolean> {
    const targetIds = [payload.group, ...(payload.groups ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    if (targetIds.length === 0) return true;

    const groups = await Promise.all(
      targetIds.map((id) => this.groupRepository.findById(id)),
    );
    const grantsPrivilege = groups.some(
      (group) =>
        group?.slug === E_ROLE.MASTER || group?.slug === E_ROLE.ADMINISTRATOR,
    );
    if (!grantsPrivilege) return true;

    const actor = await this.userRepository.findById(actorId ?? '');
    return this.groupResolver.isMaster(actor);
  }

  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await this.userRepository.findById(payload._id);

      if (!user)
        return left(
          HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'),
        );

      if (!(await this.canAssignGroup(payload, payload.actorId))) {
        return left(
          HTTPException.Forbidden(
            'Apenas MASTER pode atribuir grupos privilegiados',
            'CANNOT_ASSIGN_PRIVILEGED_GROUP',
          ),
        );
      }

      // O create ja bloqueia e-mail duplicado; o update gravava direto.
      if (payload.email && payload.email !== user.email) {
        const existing = await this.userRepository.findByEmail(payload.email);
        if (existing && existing._id.toString() !== user._id.toString()) {
          return left(
            HTTPException.Conflict(
              'E-mail já cadastrado',
              'EMAIL_ALREADY_EXISTS',
            ),
          );
        }
      }

      const oldEmail = user.email;
      const oldStatus = user.status;

      const changes: string[] = [];
      if (payload.password) changes.push('Senha alterada');
      if (payload.email && payload.email !== oldEmail) {
        changes.push(`Email alterado para ${payload.email}`);
      }
      if (payload.status && payload.status !== oldStatus) {
        changes.push(STATUS_CHANGE_LABELS[payload.status]);
      }

      const updated = await this.userRepository.update({
        ...payload,
        ...(payload.password && {
          password: await this.passwordService.hash(payload.password),
        }),
      });

      if (changes.length > 0) {
        const emailChanged = Boolean(
          payload.email && payload.email !== oldEmail,
        );

        if (emailChanged) {
          await this.enqueueAccountChangedEmail(
            oldEmail,
            updated.name,
            changes,
            'old',
          );
          await this.enqueueAccountChangedEmail(
            updated.email,
            updated.name,
            changes,
            'new',
          );
        } else {
          await this.enqueueAccountChangedEmail(
            updated.email,
            updated.name,
            changes,
            'current',
          );
        }
      }

      return right(updated);
    } catch (error) {
      console.error('[users > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_USER_ERROR',
        ),
      );
    }
  }

  private async enqueueAccountChangedEmail(
    to: string,
    name: string,
    changes: string[],
    recipientType: RecipientType,
  ): Promise<void> {
    const subjects: Record<RecipientType, string> = {
      current: 'Sua conta no LowCodeJS foi atualizada',
      old: 'Seu email no LowCodeJS foi alterado',
      new: 'Bem-vindo ao seu novo email no LowCodeJS',
    };

    await this.emailQueue.enqueue({
      template: 'user-account-changed',
      data: { name, changes, recipientType },
      to: [to],
      subject: subjects[recipientType],
    });
  }
}
