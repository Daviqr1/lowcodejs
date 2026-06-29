/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

// Slug fixo do campo de texto que recebe o IP (convenção do plugin). A tabela
// que quiser registrar IP cria esse campo e o marca como oculto.
const IP_FIELD_SLUG = 'ip';

type Payload = { slug: string; rowId: string; ip: string };
type Response = Either<HTTPException, { ip: string }>;

@Service()
export default class RegisterIpUseCase {
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

      // Exige um campo de texto (não-nativo) com o slug convencionado. Sem ele,
      // não há onde gravar — erro claro em vez de gravar silenciosamente fora.
      const ipField = table.fields.find(
        (field) => field.slug === IP_FIELD_SLUG && !field.native,
      );

      if (!ipField) {
        return left(
          HTTPException.BadRequest(
            'Esta tabela não possui um campo de texto com slug "ip".',
            'IP_FIELD_NOT_FOUND',
          ),
        );
      }

      // Gravação direta na linha: contorna o descarte de campo oculto do
      // create/update use-case do core (que só roda naquele caminho).
      const updated = await this.rowRepository.update({
        table,
        _id: payload.rowId,
        data: { [IP_FIELD_SLUG]: payload.ip },
      });

      if (!updated) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      return right({ ip: payload.ip });
    } catch (error) {
      console.error('[plugins > register-ip][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REGISTER_IP_ERROR',
        ),
      );
    }
  }
}
