import { Service } from 'fastify-decorators';

import type { IField, IUser } from '@application/core/entity.core';
import {
  E_PERMISSION_TARGET,
  E_TABLE_PERMISSION,
} from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { PermissionContractService } from '@application/services/permission/permission-contract.service';

import type {
  FieldVisibilityContext,
  FieldVisibilityInput,
} from './field-visibility-contract.service';
import { FieldVisibilityContractService } from './field-visibility-contract.service';

@Service()
export default class FieldVisibilityService implements FieldVisibilityContractService {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly permission: PermissionContractService,
  ) {}

  async hiddenSlugs(input: FieldVisibilityInput): Promise<Set<string>> {
    const hidden = new Set<string>();

    // Dono/admin da tabela (sinais do TableAccessMiddleware): nada oculto.
    if (input.isOwner || input.isAdministrator) return hidden;

    // Campos nativos (_id, creator, createdAt, trashed...) nunca sao ocultados:
    // sao estruturais.
    const candidates: IField[] = [];
    for (const field of input.fields) {
      if (!field.native) candidates.push(field);
    }

    if (candidates.length === 0) return hidden;

    // Carrega o usuario uma vez: necessario tanto para o privilegio (fecho de
    // grupos) quanto para os bindings GROUP.
    let user: IUser | null = null;
    if (input.userId) {
      user = await this.userRepository.findById(input.userId);
    }

    // Privilegiado (MASTER/ADMINISTRATOR no fecho de grupos): nada oculto.
    if (await this.groupResolver.isPrivileged(user)) return hidden;

    // So resolve o fecho de grupos/capacidades quando algum binding do contexto
    // e GROUP (intersecao: precisa do grupo no fecho E da capacidade VIEW_FIELD).
    let groupIds = new Set<string>();
    let capabilities = new Set<string>();
    if (this.needsGroupResolution(candidates, input.context)) {
      groupIds = await this.groupResolver.resolveUserGroupIds(user);
      capabilities = await this.groupResolver.resolveCapabilities(user);
    }

    for (const field of candidates) {
      if (!this.isFieldVisible(field, input.context, groupIds, capabilities)) {
        hidden.add(field.slug);
      }
    }

    return hidden;
  }

  project<T extends Record<string, unknown>>(
    target: T,
    hidden: Set<string>,
  ): T {
    if (hidden.size === 0) return target;

    for (const slug of hidden) {
      if (slug in target) delete target[slug];
    }

    return target;
  }

  private needsGroupResolution(
    fields: IField[],
    context: FieldVisibilityContext,
  ): boolean {
    for (const field of fields) {
      if (field.permissions?.[context]?.kind === E_PERMISSION_TARGET.GROUP) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sem binding o campo e visivel (convencao do modelo novo, espelha o
   * `userSatisfiesBinding` do frontend); GROUP exige a intersecao com
   * VIEW_FIELD, como as acoes de tabela.
   */
  private isFieldVisible(
    field: IField,
    context: FieldVisibilityContext,
    groupIds: Set<string>,
    capabilities: Set<string>,
  ): boolean {
    return this.permission.bindingAllows(field.permissions?.[context], {
      groupIds,
      capabilities,
      requiredCapability: E_TABLE_PERMISSION.VIEW_FIELD,
      whenAbsent: true,
    });
  }
}
