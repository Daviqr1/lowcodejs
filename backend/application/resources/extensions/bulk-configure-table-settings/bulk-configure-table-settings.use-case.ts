import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { RowAccessControlGuard } from '../../../../extensions/core/plugins/row-access/guard.service';
import { rowAccessSettingsSchema } from '../../../../extensions/core/plugins/row-access/settings-schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type Input = {
  _id: string;
  tableSettings: Record<string, Record<string, unknown>>;
};

type Output = {
  applied: number;
  skipped: number;
  errors: string[];
};

type Response = Either<HTTPException, Output>;

@Service()
export default class BulkConfigureTableSettingsUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly rowAccessControlGuard: RowAccessControlGuard,
  ) {}

  async execute({ _id, tableSettings }: Input): Promise<Response> {
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
            'Configuração de tabelas só se aplica a plugins',
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
      if (placement?.kind !== 'row-access-guard') {
        return left(
          HTTPException.BadRequest(
            'Configuração em lote só é suportada por plugins row-access-guard',
            'TABLE_SCOPE_NOT_APPLICABLE',
          ),
        );
      }

      let applied = 0;
      let skipped = 0;
      const errors: string[] = [];
      const appliedTableIds: string[] = [];

      for (const [tableId, rawSettings] of Object.entries(tableSettings)) {
        // Valida settings com o schema do guard.
        const parsed = rowAccessSettingsSchema.safeParse(rawSettings);
        if (!parsed.success) {
          const msgs = parsed.error.issues.map(
            (e) => `${e.path.join('.')}: ${e.message}`,
          );
          errors.push(`tableId=${tableId}: ${msgs.join('; ')}`);
          skipped++;
          continue;
        }

        // Persiste.
        const settingsRecord: Record<string, unknown> = { ...parsed.data };
        await this.extensionRepository.updateTableSettings({
          _id,
          tableId,
          settings: settingsRecord,
        });

        // onTableBound.
        const table = await this.tableRepository.findById(tableId);
        if (table) {
          const bindResult = await this.rowAccessControlGuard.onTableBound(
            table,
            settingsRecord,
          );
          if (bindResult.isLeft()) {
            errors.push(`tableId=${tableId}: ${bindResult.value.message}`);
            skipped++;
            continue;
          }
        }

        appliedTableIds.push(tableId);
        applied++;
      }

      // Vincula explicitamente via tableScope.mode='specific'. Sem isso, o
      // default 'all' do tableScope faria o RowAccessGuardService ignorar o
      // guard (supportsScopeAll=false) — e/ou afetar tabelas não configuradas.
      if (appliedTableIds.length > 0) {
        const existingIds = existing.tableScope?.tableIds ?? [];
        const tableIds = Array.from(
          new Set([...existingIds, ...appliedTableIds]),
        );
        await this.extensionRepository.updateTableScope({
          _id,
          tableScope: { mode: 'specific', tableIds },
        });
      }

      return right({ applied, skipped, errors });
    } catch (error) {
      console.error(
        '[extensions > bulk-configure-table-settings][error]:',
        error,
      );
      return left(
        HTTPException.InternalServerError(
          'Erro ao configurar settings em lote',
          'BULK_CONFIGURE_TABLE_SETTINGS_ERROR',
        ),
      );
    }
  }
}
