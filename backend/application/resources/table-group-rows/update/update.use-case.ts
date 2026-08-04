import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge } from '@application/core/entity.core';
import { E_FIELD_TYPE, E_ROW_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowOwnershipContractService } from '@application/services/row-ownership/row-ownership-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RowPayloadValidatorContractService } from '@application/services/row-payload-validator/row-payload-validator-contract.service';

type Response = Either<HTTPException, Record<string, unknown>>;
type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    rowId: string;
    groupSlug: string;
    itemId: string;
    __actorUserId?: string;
    // Convidado contributor: só altera itens da própria row pai.
    __ownOnly?: boolean;
  }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class GroupRowUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly rowOwnership: RowOwnershipContractService,
    private readonly rowPayloadValidator: RowPayloadValidatorContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const groupField = table.fields?.find(
        (f) =>
          f.type === E_FIELD_TYPE.FIELD_GROUP &&
          f.group?.slug === payload.groupSlug,
      );

      if (!groupField) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);

      if (!group) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      // Valida os campos do item contra os campos do grupo (skipMissing)
      const groupFields: IField[] = group.fields || [];

      const errors = this.rowPayloadValidator.validate(
        payload,
        groupFields,
        table.groups,
        {
          skipMissing: true,
        },
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

      // Remove campos PASSWORD mascarados/vazios e hash dos novos
      this.rowPasswordService.stripMasked(payload, groupFields);
      await this.rowPasswordService.hash(payload, groupFields);

      // Verifica se a row existe
      const existingRow = await this.rowRepository.findOne({
        table,
        query: { _id: payload.rowId },
      });

      if (!existingRow)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      // Convidado contributor só altera itens da row pai que ele criou.
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

      // Verifica se o item existe na row
      const existingItems = existingRow[groupField.slug];
      let itemExists = false;

      if (Array.isArray(existingItems)) {
        itemExists = existingItems.some((item: unknown) => {
          if (isRecord(item)) {
            const itemId = item._id;
            if (typeof itemId === 'string') {
              return itemId === payload.itemId;
            }
            if (isRecord(itemId) && typeof itemId.toString === 'function') {
              return itemId.toString() === payload.itemId;
            }
          }
          return false;
        });
      }

      if (!itemExists)
        return left(
          HTTPException.NotFound('Item não encontrado', 'ITEM_NOT_FOUND'),
        );

      // Atualiza o subdocumento com os dados do payload
      const {
        slug: _slug,
        rowId: _rowId,
        groupSlug: _groupSlug,
        itemId: _itemId,
        __actorUserId,
        __ownOnly,
        ...itemData
      } = payload;

      // O ato de salvar via update publica o item de grupo (rascunho -> publicado).
      itemData.status = E_ROW_STATUS.PUBLISHED;
      itemData.draftAt = null;

      const row = await this.rowRepository.updateGroupItem({
        table,
        rowId: payload.rowId,
        groupFieldSlug: groupField.slug,
        itemId: payload.itemId,
        data: itemData,
      });

      // Retorna o item atualizado
      const items = row[groupField.slug];
      let updatedItem: Record<string, unknown> | undefined;

      if (Array.isArray(items)) {
        for (const item of items) {
          if (!isRecord(item)) {
            continue;
          }
          const id = item._id;
          if (typeof id === 'string' && id === payload.itemId) {
            updatedItem = item;
            break;
          }
          if (
            isRecord(id) &&
            typeof id.toString === 'function' &&
            id.toString() === payload.itemId
          ) {
            updatedItem = item;
            break;
          }
        }
      }

      if (updatedItem) {
        this.rowPasswordService.mask(updatedItem, groupFields);
      }

      if (updatedItem) {
        return right(updatedItem);
      }

      return right(row);
    } catch (error) {
      console.error('[group-rows > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_GROUP_ROW_ERROR',
        ),
      );
    }
  }
}
