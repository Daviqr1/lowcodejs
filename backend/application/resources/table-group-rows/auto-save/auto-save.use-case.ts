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
import { DraftTable } from '@application/resources/table-rows/auto-save/draft-table';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

type Response = Either<HTTPException, Record<string, unknown>>;
type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    rowId: string;
    groupSlug: string;
    _id?: string;
    creator?: string | null;
  }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class GroupRowAutoSaveUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      console.log('[group-rows > auto-save][payload]:', payload);
      const { slug, rowId, groupSlug, _id: itemId, creator, ...body } = payload;

      const table = await this.tableRepository.findBySlug(slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const groupField = table.fields?.find(
        (f) =>
          f.type === E_FIELD_TYPE.FIELD_GROUP && f.group?.slug === groupSlug,
      );

      if (!groupField) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      const group = table.groups?.find((g) => g.slug === groupSlug);

      if (!group) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      const groupFields: IField[] = group.fields || [];

      // Valida apenas formato/tipo dos campos que possuem valor real. O
      // auto-save de grupo NUNCA bloqueia por obrigatorio ausente: o item e
      // persistido como rascunho (status='draft') com os dados parciais reais.
      const fieldsWithValue = groupFields.filter((field) => {
        return (
          !field.native &&
          !field.trashed &&
          field.slug in body &&
          this.hasValue(body[field.slug])
        );
      });

      const errors = RowPayloadValidator.validate(
        body,
        fieldsWithValue,
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

      // Schema dedicado com todos os campos opcionais: addGroupItem/
      // updateGroupItem usam row.save(), que roda os validators do subdoc. O
      // core nao e tocado; a tabela original segue exigindo required nas ops
      // normais.
      const draftTable = DraftTable.from(table);

      await this.rowPasswordService.hash(body, groupFields);

      if (!itemId) {
        const row = await this.rowRepository.addGroupItem({
          table: draftTable,
          rowId,
          groupFieldSlug: groupField.slug,
          data: {
            ...body,
            ...draftState,
            creator: creator || null,
          },
        });

        const created = this.lastItem(row[groupField.slug]);

        if (created) {
          this.rowPasswordService.mask(created, groupFields);
          return right(created);
        }

        return right(row);
      }

      const existingRow = await this.rowRepository.findOne({
        table,
        query: { _id: rowId },
      });

      if (!existingRow)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      if (!this.itemExists(existingRow[groupField.slug], itemId))
        return left(
          HTTPException.NotFound('Item não encontrado', 'ITEM_NOT_FOUND'),
        );

      const row = await this.rowRepository.updateGroupItem({
        table: draftTable,
        rowId,
        groupFieldSlug: groupField.slug,
        itemId,
        data: {
          ...body,
          ...draftState,
        },
      });

      const updated = this.findItem(row[groupField.slug], itemId);

      if (updated) {
        this.rowPasswordService.mask(updated, groupFields);
        return right(updated);
      }

      return right(row);
    } catch (error) {
      console.error('[group-rows > auto-save][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'AUTO_SAVE_GROUP_ROW_ERROR',
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

  private lastItem(items: unknown): Record<string, unknown> | undefined {
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const candidate = items[items.length - 1];
    if (isRecord(candidate)) return candidate;
    return undefined;
  }

  private itemExists(items: unknown, itemId: string): boolean {
    if (!Array.isArray(items)) return false;
    return items.some((item) => this.matchesId(item, itemId));
  }

  private findItem(
    items: unknown,
    itemId: string,
  ): Record<string, unknown> | undefined {
    if (!Array.isArray(items)) return undefined;
    for (const item of items) {
      if (this.matchesId(item, itemId) && isRecord(item)) return item;
    }
    return undefined;
  }

  private matchesId(item: unknown, itemId: string): boolean {
    if (!isRecord(item)) return false;
    const id = item._id;
    if (typeof id === 'string') return id === itemId;
    if (isRecord(id) && typeof id.toString === 'function') {
      return id.toString() === itemId;
    }
    return false;
  }
}
