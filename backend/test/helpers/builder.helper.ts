import NotificationMongooseRepository from '@application/repositories/notification/notification.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import DateService from '@application/services/date/date.service';
import NodemailerEmailService from '@application/services/email/email.service';
import FieldValueService from '@application/services/field-value/field-value.service';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import NotificationService from '@application/services/notification/notification.service';
import SandboxBuilderService from '@application/services/script-execution/sandbox-builder.service';
import NodeVmScriptExecutionService from '@application/services/script-execution/script-execution.service';
import NodeVmRunnerService from '@application/services/script-execution/vm-runner.service';
import SearchService from '@application/services/search/search.service';
import SlugService from '@application/services/slug/slug.service';
import MongooseFieldGroupBuilder from '@application/services/table/field-group-builder.service';
import MongooseModelBuilder from '@application/services/table/model-builder.service';
import MongooseSchemaBuilder from '@application/services/table/schema-builder.service';

/**
 * Monta o `MongooseSchemaBuilder` com o grafo de dependencias real.
 *
 * Specs unitarios nao importam `@start/kernel`, entao o container de DI esta
 * vazio e `getInstanceByToken` falharia. Construir a mao aqui funciona tanto no
 * unit quanto no e2e e nao depende da ordem de boot.
 */
export function makeSchemaBuilder(): MongooseSchemaBuilder {
  return new MongooseSchemaBuilder(
    new MongooseFieldGroupBuilder(new SearchService()),
  );
}

/** Monta o `MongooseModelBuilder` com o grafo de dependencias real. */
export function makeModelBuilder(): MongooseModelBuilder {
  const userRepository = new UserMongooseRepository(new SearchService());
  const sandboxBuilder = new SandboxBuilderService(
    new NodemailerEmailService(),
    new NotificationService(new NotificationMongooseRepository()),
    userRepository,
    new FieldValueService(),
    new SlugService(),
    new DateService(),
    new MongooseIdentifierService(),
  );
  const scriptExecution = new NodeVmScriptExecutionService(
    sandboxBuilder,
    new NodeVmRunnerService(),
  );
  return new MongooseModelBuilder(makeSchemaBuilder(), scriptExecution);
}
