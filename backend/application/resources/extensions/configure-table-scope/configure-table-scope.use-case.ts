/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_EXTENSION_TYPE,
  type IExtension,
  type IExtensionTableScope,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import HTTPException from '@application/core/exception.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

type Input = { _id: string; tableScope: IExtensionTableScope };
type Response = Either<HTTPException, IExtension>;

async function runCompensations(
  compensations: Array<() => Promise<void>>,
): Promise<void> {
  for (const fn of compensations) {
    try {
      await fn();
    } catch (err) {
      console.error('[configure-table-scope][compensation error]:', err);
    }
  }
}

@Service()
export default class ExtensionConfigureTableScopeUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly guardService: RowAccessGuardService,
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
  ) {}

  private async populateFields(table: ITable): Promise<ITable> {
    if (!Array.isArray(table.fields) || table.fields.length === 0) {
      return { ...table, fields: [] };
    }

    // Check if already fully populated (has slug/type properties)
    const isPopulated = table.fields.every(
      (f) =>
        typeof f === 'object' &&
        f !== null &&
        'slug' in (f as object) &&
        'type' in (f as object),
    );
    if (isPopulated) return table;

    // Fields are stub objects {_id: '...'} or strings — fetch full objects
    const ids = table.fields.map((f) =>
      typeof f === 'string' ? f : (f as IField)._id,
    );
    const fields = await this.fieldRepository.findMany({ _ids: ids });
    return { ...table, fields };
  }

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

      // Look up guard for this plugin
      const guardKey = `${existing.pkg}:${existing.extensionId}`;
      const guards = RowAccessGuardService.getRegistered();
      const guard = guards[guardKey];

      // Validate mode='all' against guard.supportsScopeAll
      if (guard && tableScope.mode === 'all' && !guard.supportsScopeAll) {
        return left(
          HTTPException.BadRequest(
            'Este plugin não suporta escopo "Todas as tabelas"',
            'SCOPE_ALL_NOT_SUPPORTED',
          ),
        );
      }

      // Only run onTableBound for mode='specific' with a guard registered
      if (guard && tableScope.mode === 'specific') {
        const existingTableIds = existing.tableScope?.tableIds ?? [];
        const newTableIds = tableScope.tableIds;

        // Compute newly added table IDs (in new but not in old)
        const newlyAdded = newTableIds.filter(
          (id) => !existingTableIds.includes(id),
        );

        const compensations: Array<() => Promise<void>> = [];

        for (const tableId of newlyAdded) {
          const table = await this.tableRepository.findById(tableId);

          if (!table) {
            await runCompensations(compensations);
            return left(
              HTTPException.BadRequest(
                `Tabela ${tableId} não encontrada`,
                'TABLE_NOT_FOUND',
              ),
            );
          }

          // Populate fields so the guard can inspect existing field objects
          const populatedTable = await this.populateFields(table);

          const result = await guard.onTableBound(populatedTable);

          if (result.isLeft()) {
            await runCompensations(compensations);
            return left(result.value);
          }

          if (result.value.wasCreated) {
            // Register compensation: delete the newly created field if rollback needed.
            // We re-load and populate to find the field by slug so we can delete it.
            // We intentionally skip updating the table's fields array here — the
            // field will no longer exist in fieldRepo, so any lookup by those IDs
            // will return nothing, which is the correct post-rollback state.
            compensations.push(async () => {
              const t = await this.tableRepository.findById(tableId);
              if (!t) return;
              const populatedNow = await this.populateFields(t);
              const created = (populatedNow.fields as IField[]).find(
                (f) =>
                  typeof f === 'object' &&
                  f !== null &&
                  'slug' in (f as object) &&
                  (f as IField).slug === 'visibility',
              );
              if (created) {
                await this.fieldRepository.delete(created._id);
              }
            });
          }
        }
      }

      // All onTableBound calls succeeded — persist the new tableScope
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
