/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge } from '@application/core/entity.core';
import { E_FIELD_TYPE, E_ROW_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowPayloadValidator } from '@application/core/row-payload-validator.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

type Response = Either<HTTPException, Record<string, unknown>>;
type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    rowId: string;
    groupSlug: string;
    creator?: string | null;
  }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class GroupRowCreateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Encontra o campo FIELD_GROUP correspondente
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

      // Valida os campos do item contra os campos do grupo
      const groupFields: IField[] = group.fields || [];

      const errors = RowPayloadValidator.validate(
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

      // Hash password fields se necessário
      await this.rowPasswordService.hash(payload, groupFields);

      // Remove campos de controle do payload para que o Mongoose gere um novo _id
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
        if (isRecord(candidate)) {
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
