import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_EXTENSION_TYPE,
  type IExtension,
  type IExtensionTableScope,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

type Input = {
  _id: string;
  tableScope: IExtensionTableScope;
};
type Response = Either<HTTPException, IExtension>;

@Service()
export default class ExtensionConfigureTableScopeUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute({ _id, tableScope }: Input): Promise<Response> {
    try {
      const existing = await this.extensionRepository.findById(_id);

      if (!existing) {
        return left(
          HTTPException.NotFound(
            'Extensão não encontrada',
            'EXTENSION_NOT_FOUND',
          ),
        );
      }

      if (existing.type !== E_EXTENSION_TYPE.PLUGIN) {
        return left(
          HTTPException.BadRequest(
            'Escopo por tabela só se aplica a plugins',
            'TABLE_SCOPE_NOT_APPLICABLE',
          ),
        );
      }

      const updated = await this.extensionRepository.updateTableScope({
        _id,
        tableScope,
      });
      return right(updated);
    } catch (error) {
      console.error('[extensions > configure-table-scope][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao configurar escopo de tabelas',
          'CONFIGURE_TABLE_SCOPE_ERROR',
        ),
      );
    }
  }
}
