import type { Either } from '@application/core/either.core';
import type { IField, ITable } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export type ResolvedTableGroup = {
  table: ITable;
  /** Campo `FIELD_GROUP` da tabela que aponta para o grupo pedido. */
  groupField: IField;
};

/**
 * Resolucao de tabela + campo de grupo a partir dos slugs da rota. Os oito
 * use-cases de `table-group-rows` abriam com o mesmo par de buscas e os mesmos
 * dois 404 (`TABLE_NOT_FOUND`, `GROUP_NOT_FOUND`).
 */
export abstract class TableGroupContractService {
  abstract resolve(
    tableSlug: string,
    groupSlug: string,
  ): Promise<Either<HTTPException, ResolvedTableGroup>>;
}
