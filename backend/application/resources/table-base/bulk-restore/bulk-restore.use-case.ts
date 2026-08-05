import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { BulkRestorePayload } from '../_shared.validator';

type Response = Either<HTTPException, { modified: number; skipped?: string[] }>;

@Service()
export default class BulkRestoreUseCase {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async execute(payload: BulkRestorePayload): Promise<Response> {
    try {
      // Só restaura tabelas na lixeira cujo slug NÃO colide com uma tabela
      // ativa. Slug é a chave da coleção dinâmica — restaurar um slug já ativo
      // duplicaria os registros e deixaria duas tabelas iguais na lista.
      const restorableIds: string[] = [];
      const skipped: string[] = [];

      for (const id of payload.ids) {
        const table = await this.tableRepository.findById(id, {
          trashed: true,
        });
        if (!table) continue; // não existe ou não está na lixeira

        const active = await this.tableRepository.findBySlug(table.slug, {
          trashed: false,
        });
        if (active) {
          skipped.push(table.slug);
          continue;
        }

        restorableIds.push(table._id);
      }

      let modified = 0;
      if (restorableIds.length > 0) {
        modified = await this.tableRepository.updateMany({
          _ids: restorableIds,
          filterTrashed: true,
          data: {
            trashed: false,
            trashedAt: null,
          },
        });
      }

      return right({ modified, ...(skipped.length > 0 && { skipped }) });
    } catch (error) {
      console.error('[table-base > bulk-restore][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_RESTORE_TABLES_ERROR',
        ),
      );
    }
  }
}
