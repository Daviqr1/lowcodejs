import type { FindOptions } from '@application/core/entity.core';

/**
 * Base das implementacoes Mongoose. Carrega o que era identico nos 13
 * repositorios: a conversao de documento para entidade, o recorte de paginacao
 * e a clausula de lixeira.
 *
 * Nao entra no DI: o scanner so pareia `<base>-contract.repository.ts` com o
 * irmao, e esta classe nao tem contract. As subclasses continuam `@Service()`.
 */
export abstract class MongooseRepository<TEntity> {
  /**
   * Documento Mongoose -> entidade do dominio. O `_id` sai como string; o resto
   * vem do `toJSON` com os ObjectIds ja achatados.
   */
  protected transform(entity: {
    toJSON(options: { flattenObjectIds: boolean }): TEntity;
    _id: { toString(): string };
  }): TEntity {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  /**
   * `skip`/`limit` para o `find`. Sem `page`/`perPage` devolve `0`/`0` — que no
   * Mongoose significa "do inicio" e "sem limite".
   */
  protected paginate(payload?: { page?: number; perPage?: number }): {
    skip: number;
    limit: number;
  } {
    if (!payload?.page || !payload?.perPage) return { skip: 0, limit: 0 };

    return {
      skip: (payload.page - 1) * payload.perPage,
      limit: payload.perPage,
    };
  }

  /**
   * Aplica o filtro de lixeira no `where` quando ele foi pedido. Sem opcao
   * explicita cai no `fallback` — alguns repositorios escondem o que esta na
   * lixeira por padrao (`false`, `{ $ne: true }`); sem `fallback`, nao filtra.
   */
  protected trashedClause(
    where: Record<string, unknown>,
    options?: FindOptions,
    fallback?: unknown,
  ): Record<string, unknown> {
    if (options?.trashed !== undefined) where.trashed = options.trashed;
    else if (fallback !== undefined) where.trashed = fallback;
    return where;
  }
}
