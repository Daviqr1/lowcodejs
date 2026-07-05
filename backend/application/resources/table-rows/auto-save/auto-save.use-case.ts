import { Service } from 'fastify-decorators';

import { Either, left, right } from '@application/core/either.core';
import { E_ROW_STATUS, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowPayloadValidator } from '@application/core/row-payload-validator.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { TableRowAutoSavePayload } from './auto-save.validator';
import { DraftTable } from './draft-table';

type Response = Either<HTTPException, IRow>;

type Payload = TableRowAutoSavePayload;

@Service()
export default class TableRowAutoSaveUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async execute({ slug, _id: rowId, ...payload }: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Valida apenas formato/tipo dos campos que possuem valor real. O
      // auto-save NUNCA bloqueia por obrigatorio ausente: o registro e
      // persistido como rascunho (status='draft') com os dados parciais
      // reais e so vira 'published' quando o usuario clica em Salvar.
      const fields = table.fields.filter((field) => {
        return (
          !field.native &&
          !field.trashed &&
          field.slug in payload &&
          this.hasValue(payload[field.slug])
        );
      });

      const errors = RowPayloadValidator.validate(
        payload,
        fields,
        table.groups,
      );

      if (errors) {
        return left(
          HTTPException.BadRequest(
            'Requisição inválida',
            'INVALID_PAYLOAD_FORMAT',
            errors,
          ),
        );
      }

      const draftState = {
        status: E_ROW_STATUS.DRAFT,
        draftAt: new Date(),
      };

      // Schema dedicado com todos os campos opcionais: o auto-save persiste
      // rascunhos parciais sem disparar os validators de obrigatoriedade do
      // Mongoose. O core nao e tocado; a tabela original segue exigindo
      // required no create/update normal.
      const draftTable = DraftTable.from(table);

      if (!rowId) {
        const created = await this.rowRepository.create({
          data: {
            ...payload,
            ...draftState,
          },
          table: draftTable,
        });

        return right(created);
      }

      const row = await this.rowRepository.findOne({
        query: { _id: rowId },
        table,
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      const updated = await this.rowRepository.update({
        _id: rowId.toString(),
        data: {
          ...payload,
          ...draftState,
        },
        table: draftTable,
      });

      if (!updated)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      return right(updated);
    } catch (error) {
      console.error('[table-rows > auto-save][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'AUTO_SAVE_ROW_ERROR',
        ),
      );
    }
  }

  private hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
