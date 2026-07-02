/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_FIELD_TYPE,
  type ICategory,
  type IField,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableFieldDeleteCategoryPayload } from './delete-category.validator';

type Response = Either<
  HTTPException,
  {
    field: IField;
    removedIds: Array<string>;
  }
>;

type Payload = TableFieldDeleteCategoryPayload;

function collectIds(node: ICategory): Array<string> {
  const ids = [node.id];
  // ICategory.children é unknown[]; a árvore é recursivamente ICategory.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const children = (node.children ?? []) as Array<ICategory>;
  for (const child of children) {
    ids.push(...collectIds(child));
  }
  return ids;
}

function removeCategoryNode(
  nodes: Array<ICategory>,
  categoryId: string,
): { updated: Array<ICategory>; removedIds: Array<string> } {
  let removedIds: Array<string> = [];

  const updated = nodes
    .filter((node) => {
      if (node.id === categoryId) {
        removedIds = collectIds(node);
        return false;
      }
      return true;
    })
    .map((node) => {
      if (!node.children?.length) return node;

      const result = removeCategoryNode(
        // ICategory.children é unknown[]; a árvore é recursivamente ICategory.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        node.children as Array<ICategory>,
        categoryId,
      );
      if (result.removedIds.length) {
        removedIds = result.removedIds;
        return { ...node, children: result.updated };
      }
      return node;
    });

  return { updated, removedIds };
}

@Service()
export default class TableFieldDeleteCategoryUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const field = await this.fieldRepository.findById(payload._id);

      if (!field)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      const inTable = table.fields.some((f) => f._id === field._id);
      if (!inTable)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      if (field.type !== E_FIELD_TYPE.CATEGORY) {
        return left(
          HTTPException.BadRequest(
            'Campo não é do tipo CATEGORY',
            'INVALID_FIELD_TYPE',
          ),
        );
      }

      let existingCategories: Array<ICategory> = [];
      if (Array.isArray(field.category)) {
        existingCategories = field.category;
      }

      const { updated, removedIds } = removeCategoryNode(
        existingCategories,
        payload.categoryId,
      );

      if (!removedIds.length) {
        return left(
          HTTPException.NotFound(
            'Categoria não encontrada',
            'CATEGORY_NOT_FOUND',
          ),
        );
      }

      const updatedField = await this.fieldRepository.update({
        _id: field._id,
        category: updated,
      });

      await this.rowRepository.pullCategoryValues(
        table,
        field.slug,
        removedIds,
      );

      return right({
        field: updatedField,
        removedIds,
      });
    } catch (error) {
      console.error('[table-fields > delete-category][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_CATEGORY_OPTION_ERROR',
        ),
      );
    }
  }
}
