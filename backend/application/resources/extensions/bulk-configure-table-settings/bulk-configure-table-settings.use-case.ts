/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, ITable } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
// NAO usar `import type` aqui: fastify-decorators DI resolve dependencias do
// construtor por referencia em runtime (reflect-metadata).
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type {
  BulkConfigureTableSettingsFailure,
  BulkConfigureTableSettingsInput,
  BulkConfigureTableSettingsOutput,
} from './bulk-configure-table-settings.dto';

type Response = Either<HTTPException, BulkConfigureTableSettingsOutput>;

@Service()
export default class BulkConfigureTableSettingsUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
  ) {}

  private async populateFields(table: ITable): Promise<ITable> {
    if (!Array.isArray(table.fields) || table.fields.length === 0) {
      return { ...table, fields: [] };
    }
    const isPopulated = table.fields.every(
      (f) =>
        typeof f === 'object' &&
        f !== null &&
        'slug' in (f as object) &&
        'type' in (f as object),
    );
    if (isPopulated) return table;
    const ids = table.fields.map((f) =>
      typeof f === 'string' ? f : (f as IField)._id,
    );
    const fields = await this.fieldRepository.findMany({ _ids: ids });
    return { ...table, fields };
  }

  async execute({
    _id,
    tableIds,
    settings,
    expectedUpdatedAt,
  }: BulkConfigureTableSettingsInput): Promise<Response> {
    try {
      // 1. Carrega extension
      const extension = await this.extensionRepository.findById(_id);
      if (!extension) {
        return left(
          HTTPException.NotFound(
            'Extensão não encontrada',
            'EXTENSION_NOT_FOUND',
          ),
        );
      }

      // 2. Obtém guard registrado
      const guardKey = `${extension.pkg}:${extension.extensionId}`;
      const guards = RowAccessGuardService.getRegistered();
      const guard = guards[guardKey];
      if (!guard) {
        return left(
          HTTPException.BadRequest(
            'Esta extensão não é um row-access-guard',
            'EXTENSION_NOT_GUARD',
          ),
        );
      }

      // 3. Valida settings (uma única vez — aplicados a todas as tabelas)
      if (guard.settingsSchema) {
        try {
          guard.settingsSchema.parse(settings);
        } catch (err) {
          return left(
            HTTPException.BadRequest(
              `Settings inválidos: ${(err as Error).message}`,
              'ROW_GUARD_SETTINGS_INVALID',
            ),
          );
        }
      }

      // 4. Para cada tableId: chama onTableBound, separa success/failed
      const success: string[] = [];
      const failed: BulkConfigureTableSettingsFailure[] = [];

      // Itera sequencial (não paralelo) pra evitar race em backfill/syncModel
      // de tabelas distintas que poderiam afetar o mesmo schema cache.
      for (const tableId of tableIds) {
        const table = await this.tableRepository.findById(tableId);
        if (!table) {
          failed.push({
            tableId,
            reason: 'TABLE_NOT_FOUND',
            message: 'Tabela não encontrada',
          });
          continue;
        }
        const populated = await this.populateFields(table);

        const bindResult = await guard.onTableBound(populated, settings);
        if (bindResult.isLeft()) {
          failed.push({
            tableId,
            reason: bindResult.value.cause ?? 'ROW_GUARD_BIND_FAILED',
            message: bindResult.value.message,
          });
          continue;
        }
        success.push(tableId);
      }

      // 5. Se nenhum sucesso, retorna sem mexer no DB
      if (success.length === 0) {
        return left(
          HTTPException.BadRequest(
            'Nenhuma tabela pôde ser configurada',
            'BULK_ALL_FAILED',
          ),
        );
      }

      // 6. Constrói novo tableSettings + tableScope.tableIds (união)
      const currentSettings = extension.tableSettings ?? {};
      const nextSettings: Record<string, Record<string, unknown>> = {
        ...currentSettings,
      };
      for (const tid of success) {
        nextSettings[tid] = settings;
      }

      const currentTableIds = extension.tableScope?.tableIds ?? [];
      const nextTableIds = Array.from(
        new Set([...currentTableIds, ...success]),
      );

      // 7. Persiste tudo com optimistic lock GLOBAL
      const updated = await this.extensionRepository.bulkUpdateTableSettings({
        _id,
        tableSettings: nextSettings,
        tableScope: {
          mode: 'specific',
          tableIds: nextTableIds,
        },
        expectedUpdatedAt,
      });

      if (!updated) {
        return left(
          HTTPException.Conflict(
            'Configuração modificada por outro usuário, recarregue e tente novamente',
            'ROW_GUARD_SETTINGS_CONFLICT',
          ),
        );
      }

      return right({ extension: updated, success, failed });
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
