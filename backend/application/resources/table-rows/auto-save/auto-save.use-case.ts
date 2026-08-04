import { Service } from 'fastify-decorators';

import { Either, left, right } from '@application/core/either.core';
import { E_ROW_STATUS, IRow, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { DraftTableContractService } from '@application/services/draft-table/draft-table-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowOwnershipContractService } from '@application/services/row-ownership/row-ownership-contract.service';
import { RowPayloadValidatorContractService } from '@application/services/row-payload-validator/row-payload-validator-contract.service';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    /** Vem da query string; ausente significa "criar rascunho". */
    _id?: string;
    __actorUserId?: string;
    /** Convidado contributor: só pode editar os próprios registros. */
    __ownOnly?: boolean;
  }
>;

@Service()
export default class TableRowAutoSaveUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly rowOwnership: RowOwnershipContractService,
    private readonly rowPayloadValidator: RowPayloadValidatorContractService,
    private readonly draftTable: DraftTableContractService,
  ) {}

  async execute({
    slug,
    _id: rowId,
    __actorUserId: actorUserId,
    __ownOnly: ownOnly,
    ...payload
  }: Payload): Promise<Response> {
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

      const errors = this.rowPayloadValidator.validate(
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
      const draftTable = this.draftTable.from(table);
      const ctx = await this.rowAccessGuard.resolveContext(actorUserId);
      const tableId = table._id.toString();
      const payloadRecord: Record<string, unknown> = payload;

      if (!rowId) {
        const decision = await this.rowAccessGuard.composeWriteDecision(
          tableId,
          null,
          ctx,
          table,
          payloadRecord,
          'create',
        );
        if (decision.decision === 'deny') {
          return left(
            HTTPException.Forbidden(
              decision.reason ?? 'Acesso negado',
              'ROW_WRITE_RESTRICTED',
            ),
          );
        }

        const created = await this.rowRepository.create({
          data: {
            ...(await this.rowAccessGuard.composeSanitize(
              tableId,
              payloadRecord,
              ctx,
              table,
              'create',
              null,
            )),
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

      // Sem isto qualquer usuario com CREATE_ROW sobrescrevia o rascunho de
      // outro — e o `draftState` ainda despublicava o registro alheio.
      if (ownOnly) {
        const creatorId = this.rowOwnership.resolveCreatorId(row.creator);
        if (!actorUserId || creatorId !== actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode editar os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      const decision = await this.rowAccessGuard.composeWriteDecision(
        tableId,
        row,
        ctx,
        table,
        payloadRecord,
        'update',
      );
      if (decision.decision === 'deny') {
        return left(
          HTTPException.Forbidden(
            decision.reason ?? 'Acesso negado',
            'ROW_WRITE_RESTRICTED',
          ),
        );
      }

      const updated = await this.rowRepository.update({
        _id: rowId.toString(),
        data: {
          ...(await this.rowAccessGuard.composeSanitize(
            tableId,
            payloadRecord,
            ctx,
            table,
            'update',
            row,
          )),
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
