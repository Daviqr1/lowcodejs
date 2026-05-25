/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IExtension } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

type ExtensionWithGuardMeta = IExtension & {
  supportsScopeAll: boolean;
  category: string | null;
  hasSettingsSchema: boolean;
};

type Response = Either<HTTPException, ExtensionWithGuardMeta[]>;

@Service()
export default class ExtensionListUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const extensions = await this.extensionRepository.findMany();
      const guards = RowAccessGuardService.getRegistered();

      const enriched: ExtensionWithGuardMeta[] = extensions.map((ext) => {
        const guardKey = `${ext.pkg}:${ext.extensionId}`;
        const guard = guards[guardKey];
        return {
          ...ext,
          supportsScopeAll: guard ? guard.supportsScopeAll : true,
          category: guard ? guard.category : null,
          hasSettingsSchema: guard ? Boolean(guard.settingsSchema) : false,
        };
      });

      return right(enriched);
    } catch (error) {
      console.error('[extensions > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_EXTENSIONS_ERROR',
        ),
      );
    }
  }
}
