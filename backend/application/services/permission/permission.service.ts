import { Service } from 'fastify-decorators';

import {
  E_PERMISSION_TARGET,
  E_PROFILE_ACCESS,
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_USER_STATUS,
  TABLE_PROFILE_MATRIX,
  type IPermissionBinding,
  type ITable,
  type IUser,
  type ValueOf,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type {
  AccessCheckInput,
  AccessCheckResult,
  BindingCheck,
} from './permission-contract.service';
import { PermissionContractService } from './permission-contract.service';

@Service()
export default class PermissionService implements PermissionContractService {
  constructor(private readonly groupResolver: GroupResolverContractService) {}

  async checkUserHasPermission(
    user: IUser | null,
    permission: ValueOf<typeof E_TABLE_PERMISSION>,
  ): Promise<void> {
    if (!user) {
      throw HTTPException.Forbidden('Usuário não encontrado', 'USER_NOT_FOUND');
    }

    if (user.status !== E_USER_STATUS.ACTIVE) {
      throw HTTPException.Forbidden(
        'Usuário não está ativo',
        'USER_NOT_ACTIVE',
      );
    }

    // Considera o fecho de grupos (grupo principal + adicionais + englobados),
    // nao apenas o grupo direto. Um Manager satisfaz permissoes de Registered.
    const capabilities = await this.groupResolver.resolveCapabilities(user);

    if (!capabilities.has(permission)) {
      throw HTTPException.Forbidden(
        `Permissão negada. Necessário: ${permission}`,
        'INSUFFICIENT_PERMISSIONS',
      );
    }
  }

  async checkUserIsActive(user: IUser | null): Promise<void> {
    if (!user || user.status !== E_USER_STATUS.ACTIVE) {
      throw HTTPException.Forbidden(
        'Usuário não está ativo',
        'USER_NOT_ACTIVE',
      );
    }
  }

  isPublicAccess(input: AccessCheckInput): boolean {
    const { table, requiredPermission } = input;
    if (!table?.permissions) return false;

    // A acao e publica quando seu binding aponta para PUBLIC.
    const binding = table.permissions[requiredPermission];
    return binding?.kind === E_PERMISSION_TARGET.PUBLIC;
  }

  async checkTableAccess(input: AccessCheckInput): Promise<AccessCheckResult> {
    const { table, userId, userRole, user, requiredPermission } = input;

    if (!userId || !userRole) {
      // Log diagnostico: ajuda a entender 401 em URL amigavel via SSR (request
      // sem cookie -> visitante -> tabela nao publica nega aqui).
      console.warn(
        '[permission][401]',
        'table:',
        table?.slug,
        'requiredPermission:',
        requiredPermission,
        'hasUser:',
        Boolean(userId),
      );
      throw HTTPException.Unauthorized(
        'Usuário não autenticado',
        'USER_NOT_AUTHENTICATED',
      );
    }

    // Privilegiado (MASTER/ADMINISTRATOR no fecho de grupos, nao apenas no grupo
    // principal) tem acesso total se ativo.
    if (await this.groupResolver.isPrivileged(user ?? null)) {
      await this.checkUserIsActive(user ?? null);
      return { allowed: true };
    }

    // CREATE_TABLE: apenas verificar permissao do grupo
    if (requiredPermission === E_TABLE_PERMISSION.CREATE_TABLE) {
      await this.checkUserHasPermission(user ?? null, requiredPermission);
      return { allowed: true };
    }

    if (!table) {
      throw HTTPException.BadRequest(
        'Tabela é obrigatória para esta ação',
        'TABLE_REQUIRED',
      );
    }

    // Dono da tabela: acesso total. O dono pode vir do campo `owner` (legado) ou
    // de um membro com perfil OWNER.
    const member = table.members?.find((m) => m.user?.toString() === userId);
    const isOwner =
      userId === table.owner?.toString() ||
      member?.profile === E_TABLE_PROFILE.OWNER;

    if (isOwner) {
      await this.checkUserIsActive(user ?? null);
      return {
        allowed: true,
        ownership: { isOwner: true, isAdministrator: false },
      };
    }

    // Exige usuario ativo para qualquer acao alem das publicas.
    await this.checkUserIsActive(user ?? null);

    const ownership = {
      isOwner: false,
      isAdministrator: member?.profile === E_TABLE_PROFILE.ADMIN,
    };

    // 1. O perfil de convidado concede a acao?
    if (member) {
      const access = TABLE_PROFILE_MATRIX[member.profile][requiredPermission];
      if (access === E_PROFILE_ACCESS.ALLOW) {
        return { allowed: true, ownership };
      }
      if (access === E_PROFILE_ACCESS.OWN) {
        return { allowed: true, ownership: { ...ownership, ownOnly: true } };
      }
      // DENY: ainda pode ser liberado pelo binding por grupo abaixo.
    }

    // 2. O binding da acao (Grupo|Public|Nobody) libera?
    if (
      await this.actionBindingAllows(table, requiredPermission, user ?? null)
    ) {
      return { allowed: true, ownership };
    }

    throw HTTPException.Forbidden(
      `Permissão negada. Necessário: ${requiredPermission}`,
      'INSUFFICIENT_PERMISSIONS',
    );
  }

  /**
   * Avalia o binding de uma acao: PUBLIC libera todos; GROUP libera por
   * intersecao (o usuario precisa do grupo do binding no fecho E da capacidade
   * global da acao no fecho de grupos); NOBODY nega.
   *
   * Intersecao (grupo E tabela): liberar a tabela para um grupo so concede a
   * acao a quem tambem tem a permissao global correspondente. Ex.: tabela com
   * VIEW_ROW liberado para o grupo X nao deixa o membro de X ver registros se X
   * nao possui a permissao "Visualizar registro". PUBLIC e visitantes nao
   * dependem de grupo/capacidade.
   */
  bindingAllows(
    binding: IPermissionBinding | null | undefined,
    check: BindingCheck,
  ): boolean {
    if (!binding) return check.whenAbsent;

    if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return true;
    if (binding.kind !== E_PERMISSION_TARGET.GROUP) return false;

    if (!binding.group) return false;
    if (
      check.requiredCapability !== null &&
      !check.capabilities.has(check.requiredCapability)
    ) {
      return false;
    }

    return check.groupIds.has(binding.group);
  }

  /** Binding de uma acao de tabela, resolvendo o fecho do usuario na hora. */
  private async actionBindingAllows(
    table: ITable,
    action: ValueOf<typeof E_TABLE_PERMISSION>,
    user: IUser | null,
  ): Promise<boolean> {
    const binding = table.permissions?.[action];

    // Resolver o fecho custa duas consultas — so o ramo GROUP precisa dele.
    if (binding?.kind !== E_PERMISSION_TARGET.GROUP) {
      return this.bindingAllows(binding, {
        groupIds: new Set(),
        capabilities: new Set(),
        requiredCapability: action,
        whenAbsent: false,
      });
    }

    return this.bindingAllows(binding, {
      groupIds: await this.groupResolver.resolveUserGroupIds(user),
      capabilities: await this.groupResolver.resolveCapabilities(user),
      requiredCapability: action,
      whenAbsent: false,
    });
  }
}
