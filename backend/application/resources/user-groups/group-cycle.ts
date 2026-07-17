import type { IGroup } from '@application/core/entity.core';

// Detector de ciclos no grafo de englobamento de grupos (`encompasses`). Quem
// pertence a um grupo herda o acesso de tudo que ele engloba (fecho
// transitivo), entao a hierarquia precisa ser um DAG: um grupo nao pode
// englobar, direta ou indiretamente, a si mesmo.
export class GroupCycle {
  // Diz se atribuir `encompasses` ao grupo `groupId` cria um ciclo, considerando
  // o estado atual de todos os grupos (`groups`). Faz BFS a partir dos grupos
  // propostos seguindo as arestas de englobamento; se voltar a `groupId`, ha
  // ciclo. Cobre tambem a auto-referencia (groupId dentro de `encompasses`).
  static hasCycle(
    groupId: string,
    encompasses: string[],
    groups: Pick<IGroup, '_id' | 'encompasses'>[],
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
}
