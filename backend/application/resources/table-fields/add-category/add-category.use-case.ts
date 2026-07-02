/* eslint-disable no-unused-vars */
import { randomUUID } from 'crypto';
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
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableFieldAddCategoryPayload } from './add-category.validator';

type Response = Either<
  HTTPException,
  {
    node: {
      id: string;
      label: string;
      parentId: string | null;
    };
    field: IField;
  }
>;

type Payload = TableFieldAddCategoryPayload;

function addCategoryNode(
  nodes: Array<ICategory>,
  parentId: string,
  newNode: ICategory,
): { updated: Array<ICategory>; inserted: boolean } {
  let inserted = false;

  const updated = nodes.map((node) => {
    if (node.id === parentId) {
      inserted = true;
      return {
        ...node,
        children: [...(node.children ?? []), newNode],
      };
    }

    if (node.children?.length) {
      const result = addCategoryNode(
        // ICategory.children é unknown[]; a árvore é recursivamente ICategory.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        node.children as Array<ICategory>,
        parentId,
        newNode,
      );
      if (result.inserted) {
        inserted = true;
        return {
          ...node,
          children: result.updated,
        };
      }
    }

    return node;
  });

  return { updated, inserted };
}

@Service()
export default class TableFieldAddCategoryUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
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

      const newNode: ICategory = {
        id: randomUUID(),
        label: payload.label,
        children: [],
      };

      let existingCategories: ICategory[] = [];
      if (Array.isArray(field.category)) existingCategories = field.category;

      const parentId = payload.parentId ?? null;

      let updated: ICategory[];
      let inserted: boolean;
      if (parentId === null) {
        updated = [...existingCategories, newNode];
        inserted = true;
      } else {
        const result = addCategoryNode(existingCategories, parentId, newNode);
        updated = result.updated;
        inserted = result.inserted;
      }

      if (!inserted) {
        return left(
          HTTPException.NotFound(
            'Categoria pai não encontrada',
            'PARENT_CATEGORY_NOT_FOUND',
          ),
        );
      }

      const updatedField = await this.fieldRepository.update({
        _id: field._id,
        category: updated,
      });

      return right({
        node: {
          id: newNode.id,
          label: newNode.label,
          parentId,
        },
        field: updatedField,
      });
    } catch (error) {
      console.error('[table-fields > add-category][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADD_CATEGORY_OPTION_ERROR',
        ),
      );
    }
  }
}
