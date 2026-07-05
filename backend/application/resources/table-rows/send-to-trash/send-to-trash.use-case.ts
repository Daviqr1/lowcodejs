/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRow, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { resolveCreatorId } from '@application/core/row-ownership.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableRowSendToTrashPayload } from './send-to-trash.validator';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<
  TableRowSendToTrashPayload,
  {
    __actorUserId?: string;
    // Convidado contributor: só pode enviar para lixeira os próprios registros.
    __ownOnly?: boolean;
  }
>;

@Service()
export default class TableRowSendToTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
        populate: false,
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      // Convidado contributor só envia para lixeira o que criou.
      if (payload.__ownOnly) {
        const creatorId = resolveCreatorId(row.creator);
        if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode remover os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      if (row.trashedAt) {
        return left(
          HTTPException.Conflict(
            'Registro já está na lixeira',
            'ALREADY_TRASHED',
          ),
        );
      }

      const updated = await this.rowRepository.update({
        table,
        _id: payload._id,
        data: { trashedAt: new Date() },
      });

      if (!updated) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      return right(updated);
    } catch (error) {
      console.error('[table-rows > send-to-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SEND_ROW_TABLE_TO_TRASH_ERROR',
        ),
      );
    }
  }
}
