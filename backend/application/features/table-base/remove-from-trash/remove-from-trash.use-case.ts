import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { ITable as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableRemoveFromTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableRemoveFromTrashPayload;

@Service()
export default class TableRemoveFromTrashUseCase {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // Busca explicitamente a tabela na lixeira: pode coexistir outra ativa
      // com o mesmo slug (resíduo de importações antigas), e findBySlug sem
      // filtro retornaria qualquer uma das duas.
      const table = await this.tableRepository.findBySlug(payload.slug, {
        trashed: true,
      });

      if (!table) {
        const active = await this.tableRepository.findBySlug(payload.slug, {
          trashed: false,
        });

        if (active)
          return left(
            HTTPException.Conflict('Tabela não está na lixeira', 'NOT_TRASHED'),
          );

        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // Impede restaurar quando já existe uma tabela ativa com o mesmo slug —
      // restaurar duplicaria a coleção dinâmica (chaveada pelo slug).
      const active = await this.tableRepository.findBySlug(payload.slug, {
        trashed: false,
      });

      if (active)
        return left(
          HTTPException.Conflict(
            'Já existe uma tabela ativa com este slug. Renomeie ou exclua a tabela ativa antes de restaurar.',
            'SLUG_ALREADY_ACTIVE',
          ),
        );

      const updated = await this.tableRepository.update({
        _id: table._id,
        trashed: false,
        trashedAt: null,
      });

      return right(updated);
    } catch (error) {
      console.error('[table-base > remove-from-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REMOVE_TABLE_FROM_TRASH_ERROR',
        ),
      );
    }
  }
}
