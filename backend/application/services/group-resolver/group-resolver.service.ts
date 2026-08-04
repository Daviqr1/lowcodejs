import { Service } from 'fastify-decorators';

import { E_ROLE, type IGroup, type IUser } from '@application/core/entity.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import { GroupResolverContractService } from './group-resolver-contract.service';

@Service()
export default class GroupResolverService implements GroupResolverContractService {
  hasCycle(
    groupId: string,
    encompasses: string[],
    groups: Array<Pick<IGroup, '_id' | 'encompasses'>>,
  ): boolean {
    const graph = new Map<string, string[]>();
    for (const group of groups) {
      graph.set(group._id, group.encompasses ?? []);
    }
    // Simula o estado pos-update: as arestas propostas substituem as atuais.
    graph.set(groupId, encompasses);

    const visited = new Set<string>();
    const queue: string[] = [...encompasses];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) continue;
      if (current === groupId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(graph.get(current) ?? []));
    }

    return false;
  }
  constructor(private readonly groupRepository: UserGroupContractRepository) {}

  async resolveUserGroupIds(user: IUser | null): Promise<Set<string>> {
    const closure = await this.resolveClosure(user);
    return new Set(closure.map((group) => group._id));
  }

  async resolveCapabilities(user: IUser | null): Promise<Set<string>> {
    const closure = await this.resolveClosure(user);

    const capabilities = new Set<string>();
    for (const group of closure) {
      for (const permission of group.permissions ?? []) {
        capabilities.add(permission.slug);
      }
    }

    return capabilities;
  }

  async isPrivileged(user: IUser | null): Promise<boolean> {
    const closure = await this.resolveClosure(user);
    return closure.some(
      (group) =>
        group.slug === E_ROLE.MASTER || group.slug === E_ROLE.ADMINISTRATOR,
    );
  }

  async isMaster(user: IUser | null): Promise<boolean> {
    const closure = await this.resolveClosure(user);
    return closure.some((group) => group.slug === E_ROLE.MASTER);
  }

  async shouldHideMaster(user: IUser | null): Promise<boolean> {
    const closure = await this.resolveClosure(user);

    let hasMaster = false;
    let hasPrivileged = false;
    for (const group of closure) {
      if (group.slug === E_ROLE.MASTER) hasMaster = true;
      if (group.slug === E_ROLE.MASTER || group.slug === E_ROLE.ADMINISTRATOR) {
        hasPrivileged = true;
      }
    }

    return hasPrivileged && !hasMaster;
  }

  /**
   * Calcula o fecho transitivo dos grupos do usuario seguindo `encompasses`.
   * Carrega todos os grupos uma vez (sao poucos) e faz uma BFS em memoria sobre
   * o mapa id -> grupo, evitando populate recursivo no Mongoose.
   */
  private async resolveClosure(user: IUser | null): Promise<IGroup[]> {
    if (!user) return [];

    const directIds = this.directGroupIds(user);
    if (directIds.length === 0) return [];

    const groups = await this.groupRepository.findMany();
    const byId = new Map(groups.map((group) => [group._id, group]));

    const visited = new Set<string>();
    const queue = [...directIds];

    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) continue;
      if (visited.has(id)) continue;

      visited.add(id);

      const group = byId.get(id);
      if (!group) continue;

      for (const encompassedId of group.encompasses ?? []) {
        if (!visited.has(encompassedId)) queue.push(encompassedId);
      }
    }

    const closure: IGroup[] = [];
    for (const id of visited) {
      const group = byId.get(id);
      if (group) closure.push(group);
    }

    return closure;
  }

  /**
   * Ids dos grupos diretos do usuario: o grupo principal mais os adicionais.
   */
  private directGroupIds(user: IUser): string[] {
    const ids: string[] = [];

    if (user.group?._id) ids.push(user.group._id);

    for (const group of user.groups ?? []) {
      if (group?._id) ids.push(group._id);
    }

    return ids;
  }
}
