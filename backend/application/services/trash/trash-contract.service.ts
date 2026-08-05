export type TrashableEntity = { _id: string; trashed?: boolean };

/**
 * Recorte de repositorio que a lixeira usa. Menu, User e UserGroup ja expoem
 * exatamente esses quatro metodos com a mesma forma de payload.
 */
export type TrashableRepository<
  TEntity extends TrashableEntity = TrashableEntity,
> = {
  findById(
    _id: string,
    options?: { trashed?: boolean },
  ): Promise<TEntity | null>;
  findManyTrashed(): Promise<TEntity[]>;
  updateMany(payload: {
    _ids: string[];
    filterTrashed?: boolean;
    data: { trashed?: boolean; trashedAt?: Date | null };
  }): Promise<number>;
  deleteMany(_ids: string[]): Promise<number>;
};

/**
 * Guarda extra do recurso (dono de tabela ativa, grupo do sistema, usuarios
 * atribuidos). Quem devolve `false` fica de fora da operacao em massa.
 */
export type TrashEligibility<TEntity extends TrashableEntity> = (
  entity: TEntity,
) => Promise<boolean>;

/**
 * Miolo das operacoes de lixeira em massa, identico em menu, users e
 * user-groups: o patch `trashed`/`trashedAt`, a coleta dos ids ja na lixeira e
 * o `deleteMany`. As guardas proprias de cada recurso entram por `isEligible`.
 */
export abstract class TrashContractService {
  abstract bulkTrash<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
  ): Promise<number>;

  abstract bulkRestore<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
  ): Promise<number>;

  abstract bulkDelete<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
    isEligible?: TrashEligibility<TEntity>,
  ): Promise<number>;

  abstract emptyTrash<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    isEligible?: TrashEligibility<TEntity>,
  ): Promise<number>;
}
