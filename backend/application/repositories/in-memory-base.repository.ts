import type { FindOptions, Merge } from '@application/core/entity.core';

/**
 * Base dos doubles in-memory. Carrega so o que era byte-a-byte identico nos 12:
 * a simulacao de erro que os specs usam para cobrir o catch dos use-cases.
 *
 * A colecao fica em cada subclasse — o double de row guarda um `Map` por tabela
 * e por isso estende esta classe direto; os que guardam um array `items` usam a
 * `InMemoryCollectionRepository` abaixo.
 *
 * Nao entra no DI: o scanner so pareia `<base>-contract.repository.ts` com o
 * irmao, e esta classe nao tem contract.
 */
export abstract class InMemoryRepository {
  private forcedErrors = new Map<string, Error>();

  /** Faz a proxima chamada de `method` lancar `error` — uma vez so. */
  simulateError(method: string, error: Error): void {
    this.forcedErrors.set(method, error);
  }

  protected checkError(method: string): void {
    const error = this.forcedErrors.get(method);
    if (error) {
      this.forcedErrors.delete(method);
      throw error;
    }
  }
}

type IdentifiedDocument = { _id: string };

type PagePayload = { page?: number; perPage?: number };

/** Campos que todo double preenche no `create`, iguais em todas as entidades. */
type DocumentStamp = {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  trashedAt: Date | null;
  trashed: boolean;
};

/**
 * Base dos doubles que guardam a colecao num array `items`. Carrega o CRUD que
 * era identico nos 13 (paginacao por slice, filtro de lixeira, remocao e patch
 * por `_id`, carimbo do `create`) — o que sobra na subclasse e a query propria
 * da entidade.
 */
export abstract class InMemoryCollectionRepository<
  TEntity extends IdentifiedDocument,
> extends InMemoryRepository {
  items: TEntity[] = [];

  /** Carimbo do `create`: `create({ ...payload, ...this.stamp() })`. */
  protected stamp(): DocumentStamp {
    return {
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
  }

  /** `true` quando o item bate com o filtro de lixeira (ausente = passa). */
  protected matchesTrashed(
    item: { trashed: boolean },
    options?: FindOptions,
  ): boolean {
    if (options?.trashed === undefined) return true;
    return item.trashed === options.trashed;
  }

  /**
   * Primeiro item que casa com `match`, ou `null`. O filtro de lixeira entra
   * pelo proprio `match` (`this.matchesTrashed(item, options)`) — nem toda
   * entidade tem `trashed`.
   */
  protected findOneWhere(match: (item: TEntity) => boolean): TEntity | null {
    return this.items.find(match) ?? null;
  }

  /** Recorte da pagina; sem `page`/`perPage` devolve a lista inteira. */
  protected paginate(items: TEntity[], payload?: PagePayload): TEntity[] {
    if (!payload?.page || !payload?.perPage) return items;

    const start = (payload.page - 1) * payload.perPage;
    return items.slice(start, start + payload.perPage);
  }

  /** Remove por `_id`; lanca `<label> not found` quando nao existe. */
  protected removeById(_id: string, label: string): void {
    const index = this.items.findIndex((item) => item._id === _id);
    if (index === -1) throw new Error(`${label} not found`);
    this.items.splice(index, 1);
  }

  /** Aplica o patch por `_id` e renova `updatedAt`. */
  protected patchById(
    _id: string,
    payload: object,
    label: string,
  ): Merge<TEntity, { updatedAt: Date }> {
    const item = this.items.find((candidate) => candidate._id === _id);
    if (!item) throw new Error(`${label} not found`);
    return Object.assign(item, payload, { updatedAt: new Date() });
  }
}
