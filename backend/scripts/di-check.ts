/**
 * Verificacao do grafo de DI.
 *
 * Registra as dependencias e resolve os services com mais arestas, conferindo
 * que nenhum campo injetado ficou `undefined`. Existe porque a falha tipica
 * deste container e silenciosa: quando o SWC nao emite o `design:paramtypes`
 * (import por barrel, por exemplo), a injecao vira `undefined` e o erro so
 * aparece em runtime, longe da causa.
 *
 *   npm run di:check
 */
import 'reflect-metadata';

import { getInstanceByToken } from 'fastify-decorators';

import { registerDependencies } from '../application/core/di-registry';
import CsvExportService from '../application/services/csv-export/csv-export.service';
import ExtensionLoaderService from '../application/services/extension-loader/extension-loader.service';
import FieldValidationService from '../application/services/field-validation/field-validation.service';
import LoggerAuditService from '../application/services/logger-audit/logger-audit.service';
import BcryptRowPasswordService from '../application/services/row-password/row-password.service';
import RowPayloadValidatorService from '../application/services/row-payload-validator/row-payload-validator.service';
import SandboxBuilderService from '../application/services/script-execution/sandbox-builder.service';
import NodeVmScriptExecutionService from '../application/services/script-execution/script-execution.service';
import MongooseModelBuilder from '../application/services/table/model-builder.service';
import MongooseQueryBuilder from '../application/services/table/query-builder.service';

const TARGETS = [
  ['SandboxBuilderService', SandboxBuilderService],
  ['NodeVmScriptExecutionService', NodeVmScriptExecutionService],
  ['MongooseModelBuilder', MongooseModelBuilder],
  ['MongooseQueryBuilder', MongooseQueryBuilder],
  ['CsvExportService', CsvExportService],
  ['FieldValidationService', FieldValidationService],
  ['RowPayloadValidatorService', RowPayloadValidatorService],
  ['BcryptRowPasswordService', BcryptRowPasswordService],
  ['LoggerAuditService', LoggerAuditService],
  ['ExtensionLoaderService', ExtensionLoaderService],
] as const;

async function main(): Promise<void> {
  await registerDependencies();

  let failed = 0;

  for (const [name, token] of TARGETS) {
    try {
      const instance: Record<string, unknown> = getInstanceByToken(token);
      const missing = Object.entries(instance)
        .filter(([, value]) => value === undefined)
        .map(([key]) => key);

      if (missing.length > 0) {
        console.error(
          `❌ ${name}: dependencia undefined → ${missing.join(', ')}`,
        );
        failed += 1;
        continue;
      }

      console.info(`✅ ${name}`);
    } catch (error) {
      let message = String(error);
      if (error instanceof Error) message = error.message;
      console.error(`❌ ${name}: ${message}`);
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} service(s) com injecao quebrada.`);
    process.exit(1);
  }

  console.info('\nGrafo de DI integro.');
  process.exit(0);
}

await main();
