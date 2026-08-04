import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge } from '@application/core/entity.core';
import { E_ROW_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowOwnershipContractService } from '@application/services/row-ownership/row-ownership-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RowPayloadValidatorContractService } from '@application/services/row-payload-validator/row-payload-validator-contract.service';
import { TableGroupContractService } from '@application/services/table-group/table-group-contract.service';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';

type Response = Either<HTTPException, Record<string, unknown>>;
type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    rowId: string;
    groupSlug: string;
    creator?: string | null;
    __actorUserId?: string;
    /** Convidado contributor: só altera itens da row pai que ele criou. */
    __ownOnly?: boolean;
  }
>;

@Service()
export default class GroupRowCreateUseCase {
  constructor(
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly rowOwnership: RowOwnershipContractService,
    private readonly rowPayloadValidator: RowPayloadValidatorContractService,
    private readonly typeGuard: TypeGuardContractService,
    private readonly tableGroup: TableGroupContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const resolved = await this.tableGroup.resolve(
        payload.slug,
        payload.groupSlug,
      );
      if (resolved.isLeft()) return left(resolved.value);
      const { table, groupField } = resolved.value;

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);

      if (!group) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      // Valida os campos do item contra os campos do grupo
      const groupFields: IField[] = group.fields || [];

      const errors = this.rowPayloadValidator.validate(
        payload,
        groupFields,
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

      // A row pai nao era carregada: `addGroupItem` com rowId inexistente
      // lancava (500 em vez de 404) e nada aplicava o guard nem o escopo do
      // contributor, ao contrario de update/delete.
      const existingRow = await this.rowRepository.findOne({
        table,
        query: { _id: payload.rowId },
      });

      if (!existingRow)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (payload.__ownOnly) {
        const creatorId = this.rowOwnership.resolveCreatorId(
          existingRow.creator,
        );
        if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode alterar os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      const denied = await this.rowAccessGuard.assertCanWriteParentRow({
        table,
        row: existingRow,
        actorUserId: payload.__actorUserId,
        operation: 'update',
      });
      if (denied) return left(denied);

      // Hash password fields se necessário
      await this.rowPasswordService.hash(payload, groupFields);

      // Remove campos de controle do payload para que o Mongoose gere um novo _id
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- desestrutura para omitir chaves do rest
      const { _id, slug, rowId, groupSlug, ...itemData } = payload;

      const row = await this.rowRepository.addGroupItem({
        table,
        rowId: payload.rowId,
        groupFieldSlug: groupField.slug,
        data: {
          ...itemData,
          creator: itemData.creator || null,
          // Salvar via create publica o item de grupo.
          status: E_ROW_STATUS.PUBLISHED,
          draftAt: null,
          trashedAt: null,
        },
      });

      // Retorna o último item adicionado
      const groupItems = row[groupField.slug];
      let lastItem: Record<string, unknown> | undefined;

      if (Array.isArray(groupItems) && groupItems.length > 0) {
        const candidate = groupItems[groupItems.length - 1];
        if (this.typeGuard.isRecord(candidate)) {
          lastItem = candidate;
        }
      }

      if (lastItem) {
        this.rowPasswordService.mask(lastItem, groupFields);
      }

      if (lastItem) {
        return right(lastItem);
      }

      return right(row);
    } catch (error) {
      console.error('[group-rows > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_GROUP_ROW_ERROR',
        ),
      );
    }
  }
}
