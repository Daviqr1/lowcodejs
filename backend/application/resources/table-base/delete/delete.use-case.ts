import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RelationshipDeletionContractService } from '@application/services/relationship/relationship-deletion-contract.service';

import type { TableDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = TableDeletePayload;

@Service()
export default class TableDeleteUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly relationshipDeletion: RelationshipDeletionContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug, {
        // Exclusao definitiva age sobre a tabela na lixeira.
        includeTrashed: true,
      });

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Excluir campos associados à tabela
      const fieldIds = table.fields?.map((f) => f._id) ?? [];
      if (fieldIds.length > 0) {
        await this.fieldRepository.deleteMany(fieldIds);
      }

      // Remove definitions e links de relacionamento que tocam esta tabela (§9).
      await this.relationshipDeletion.cleanupTable(table._id);

      // Dropar a coleção dinâmica (registros da tabela)
      await this.tableRepository.dropCollection(table.slug);

      // Excluir o documento da tabela
      await this.tableRepository.delete(table._id);

      return right(null);
    } catch (error) {
      console.error('[table-base > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_TABLE_ERROR',
        ),
      );
    }
  }
}
