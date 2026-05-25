/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IExtension } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
// NAO usar `import type` aqui: fastify-decorators DI resolve dependencias do
// construtor por referencia em runtime (reflect-metadata). Type-only e apagado
// no build e quebra o registro.
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { ConfigureTableSettingsInput } from './configure-table-settings.dto';

type Response = Either<HTTPException, IExtension>;

@Service()
export default class ExtensionConfigureTableSettingsUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly tableRepository: TableContractRepository,
  ) {}

  async execute({
    _id,
    tableId,
    settings,
    expectedUpdatedAt,
  }: ConfigureTableSettingsInput): Promise<Response> {
    try {
      // 1. Busca extension
      const extension = await this.extensionRepository.findById(_id);
      if (!extension) {
        return left(
          HTTPException.NotFound(
            'Extensão não encontrada',
            'EXTENSION_NOT_FOUND',
          ),
        );
      }

      // 2. Busca tabela
      const table = await this.tableRepository.findById(tableId);
      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // 3. Obtém guard via mapa estático público
      // Decisão: usar RowAccessGuardService.getRegistered() que já é public static,
      // evitando adicionar novo método ao service (que o orchestrador controla).
      const guardKey = `${extension.pkg}:${extension.extensionId}`;
      const guards = RowAccessGuardService.getRegistered();
      const guard = guards[guardKey];

      // 4. Valida settings via Zod schema do guard (se houver)
      if (guard?.settingsSchema) {
        try {
          guard.settingsSchema.parse(settings);
        } catch {
          return left(
            HTTPException.BadRequest(
              'Settings inválidos para este guard',
              'ROW_GUARD_SETTINGS_INVALID',
            ),
          );
        }
      }

      // 5. Chama onTableBound do guard para re-validar bind com as novas settings
      if (guard) {
        const bindResult = await guard.onTableBound(table, settings);
        if (bindResult.isLeft()) {
          return left(
            HTTPException.BadRequest(
              bindResult.value.message,
              'ROW_GUARD_BIND_FAILED',
            ),
          );
        }
      }

      // 6. Persiste com optimistic lock
      const updated = await this.extensionRepository.updateTableSettings({
        _id,
        tableId,
        settings,
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

      return right(updated);
    } catch (error) {
      console.error(
        '[extensions > configure-table-settings][error]:',
        error,
      );
      return left(
        HTTPException.InternalServerError(
          'Erro ao configurar settings de tabela',
          'CONFIGURE_TABLE_SETTINGS_ERROR',
        ),
      );
    }
  }
}
