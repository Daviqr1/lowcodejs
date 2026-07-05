/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';
import slugify from 'slugify';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_EXTENSION_TYPE,
  E_MENU_ITEM_TYPE,
  type IMenu as Entity,
  type Merge,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import {
  MenuContractRepository,
  type MenuCreatePayload as RepositoryMenuCreatePayload,
} from '@application/repositories/menu/menu-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { MenuCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = Merge<MenuCreatePayload, { owner: string }>;

@Service()
export default class MenuCreateUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      let slug = payload.slug;
      let parent = null;

      if (payload.parent) {
        parent = await this.menuRepository.findById(payload.parent, {
          trashed: false,
        });

        if (!parent)
          return left(
            HTTPException.NotFound(
              'Menu pai não encontrado',
              'PARENT_MENU_NOT_FOUND',
              { parent: 'Menu pai não encontrado' },
            ),
          );

        slug = slugify(slug.concat('-').concat(parent.slug), {
          lower: true,
          trim: true,
        });
      }

      const menu = await this.menuRepository.findBySlug(slug, {
        trashed: false,
      });

      if (menu)
        return left(
          HTTPException.Conflict('Menu já existe', 'MENU_ALREADY_EXISTS', {
            name: 'Menu já existe',
          }),
        );

      if (payload.type === E_MENU_ITEM_TYPE.SEPARATOR && payload.isInitial) {
        return left(
          HTTPException.BadRequest(
            'Separador não pode ser página inicial',
            'INVALID_PARAMETERS',
            {
              isInitial: 'Separador não pode ser página inicial',
            },
          ),
        );
      }

      if (
        payload.type === E_MENU_ITEM_TYPE.TABLE ||
        payload.type === E_MENU_ITEM_TYPE.FORM
      ) {
        if (!payload.table)
          return left(
            HTTPException.BadRequest(
              'ID da tabela é obrigatório para tipos tabela/formulário',
              'INVALID_PARAMETERS',
              {
                table:
                  'ID da tabela é obrigatório para tipos tabela/formulário',
              },
            ),
          );

        const table = await this.tableRepository.findById(payload.table);

        if (!table)
          return left(
            HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND', {
              table: 'Tabela não encontrada',
            }),
          );

        if (payload.type === E_MENU_ITEM_TYPE.TABLE)
          payload.url = '/tables/'.concat(table.slug);

        if (payload.type === E_MENU_ITEM_TYPE.FORM)
          payload.url = '/tables/'.concat(table.slug).concat('/row/create');
      }

      if (payload.type === E_MENU_ITEM_TYPE.PAGE) {
        payload.url = '/pages/'.concat(slug);
      }

      if (payload.type === E_MENU_ITEM_TYPE.EXTENSION_MODULE) {
        const ref = payload.extension;
        if (!ref?.pkg || !ref?.extensionId) {
          return left(
            HTTPException.BadRequest(
              'Selecione um módulo de extensão',
              'INVALID_PARAMETERS',
              { extension: 'Selecione um módulo de extensão' },
            ),
          );
        }

        const extension = await this.extensionRepository.findByKey(
          ref.pkg,
          E_EXTENSION_TYPE.MODULE,
          ref.extensionId,
        );

        if (!extension) {
          return left(
            HTTPException.NotFound(
              'Módulo de extensão não encontrado',
              'EXTENSION_NOT_FOUND',
              { extension: 'Módulo de extensão não encontrado' },
            ),
          );
        }

        if (!extension.enabled || !extension.available) {
          return left(
            HTTPException.BadRequest(
              'Módulo de extensão não está ativo',
              'EXTENSION_NOT_ACTIVE',
              { extension: 'Módulo de extensão não está ativo' },
            ),
          );
        }

        payload.url = '/e/'.concat(ref.pkg).concat('/').concat(ref.extensionId);
      }

      let order = payload.order;

      if (order === undefined) {
        // Auto-assign order: count siblings and place at end
        order = await this.menuRepository.count({
          parent: payload.parent ?? null,
          trashed: false,
        });
      }

      const created = await this.menuRepository.create({
        ...payload,
        slug,
        owner: payload.owner,
        order,
      });

      if (created.isInitial) {
        await this.menuRepository.setOnlyInitial(created._id);
      }

      return right(created);
    } catch (error) {
      console.error('[menu > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_MENU_ERROR',
        ),
      );
    }
  }
}
