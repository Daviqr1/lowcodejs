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
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { RowAccessControlGuard } from '../../../../extensions/core/plugins/row-access/guard';
import { rowAccessSettingsSchema } from '../../../../extensions/core/plugins/row-access/settings-schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type Input = {
  _id: string;
  tableScope: IExtensionTableScope;
  tableSettings?: {
    tableId: string;
    settings: Record<string, unknown>;
  };
};
type Response = Either<HTTPException, IExtension>;

@Service()
export default class ExtensionConfigureTableScopeUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly rowAccessControlGuard: RowAccessControlGuard,
  ) {}

  async execute({ _id, tableScope, tableSettings }: Input): Promise<Response> {
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

      // Detecta se o plugin é um row-access-guard pelo manifest placement.
      const manifestSnapshot = existing.manifestSnapshot;
      let placement: Record<string, unknown> | undefined;
      if (isRecord(manifestSnapshot.placement)) {
        placement = manifestSnapshot.placement;
      }
      const isRowAccessGuard = placement?.kind === 'row-access-guard';

      // Se houver tableSettings (configuração por tabela do row-access-guard)
      // persiste e chama onTableBound.
      if (isRowAccessGuard && tableSettings) {
        const { tableId, settings } = tableSettings;

        // Valida os settings com o schema do guard.
        const parsed = rowAccessSettingsSchema.safeParse(settings);
        if (!parsed.success) {
          return left(
            HTTPException.BadRequest(
              'Configurações inválidas para o guard de acesso a linhas',
              'INVALID_GUARD_SETTINGS',
              Object.fromEntries(
                parsed.error.issues.map((e) => [
                  e.path.join('.') || 'settings',
                  e.message,
                ]),
              ),
            ),
          );
        }

        // Persiste as settings da tabela.
        const settingsRecord: Record<string, unknown> = { ...parsed.data };
        await this.extensionRepository.updateTableSettings({
          _id,
          tableId,
          settings: settingsRecord,
        });

        // Carrega a tabela para onTableBound.
        const table = await this.tableRepository.findById(tableId);
        if (table) {
          const bindResult = await this.rowAccessControlGuard.onTableBound(
            table,
            settingsRecord,
          );
          if (bindResult.isLeft()) {
            // Rollback: reverte o tableSettings que acabamos de persistir.
            // (Na prática: não há rollback do updateTableSettings — logamos e retornamos o erro)
            return left(bindResult.value);
          }
        }
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
