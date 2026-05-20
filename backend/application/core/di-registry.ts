import { injectablesHolder } from 'fastify-decorators';

import { EvaluationContractRepository } from '@application/repositories/evaluation/evaluation-contract.repository';
import EvaluationMongooseRepository from '@application/repositories/evaluation/evaluation-mongoose.repository';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import ExtensionMongooseRepository from '@application/repositories/extension/extension-mongoose.repository';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import FieldMongooseRepository from '@application/repositories/field/field-mongoose.repository';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import MenuMongooseRepository from '@application/repositories/menu/menu-mongoose.repository';
import { PermissionContractRepository } from '@application/repositories/permission/permission-contract.repository';
import PermissionMongooseRepository from '@application/repositories/permission/permission-mongoose.repository';
import { ReactionContractRepository } from '@application/repositories/reaction/reaction-contract.repository';
import ReactionMongooseRepository from '@application/repositories/reaction/reaction-mongoose.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import RowMongooseRepository from '@application/repositories/row/row-mongoose.repository';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import SettingMongooseRepository from '@application/repositories/setting/setting-mongoose.repository';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import StorageMongooseRepository from '@application/repositories/storage/storage-mongoose.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table-mongoose.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user-mongoose.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import UserGroupMongooseRepository from '@application/repositories/user-group/user-group-mongoose.repository';
import { ValidationTokenContractRepository } from '@application/repositories/validation-token/validation-token-contract.repository';
import ValidationTokenMongooseRepository from '@application/repositories/validation-token/validation-token-mongoose.repository';
import { EmailContractService } from '@application/services/email/email-contract.service';
import NodemailerEmailService from '@application/services/email/nodemailer-email.service';
import { KanbanCommentMentionContractService } from '@application/services/kanban-comment-mention/kanban-comment-mention-contract.service';
import KanbanCommentMentionService from '@application/services/kanban-comment-mention/kanban-comment-mention.service';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import BcryptPasswordService from '@application/services/password/bcrypt-password.service';
import { PasswordContractService } from '@application/services/password/password-contract.service';
import { PermissionContractService } from '@application/services/permission/permission-contract.service';
import PermissionService from '@application/services/permission/permission.service';
import { RowContextContractService } from '@application/services/row-context/row-context-contract.service';
import RowContextService from '@application/services/row-context/row-context.service';
import BcryptRowPasswordService from '@application/services/row-password/bcrypt-row-password.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import NodeVmScriptExecutionService from '@application/services/script-execution/node-vm-script-execution.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';
import { StorageContractService } from '@application/services/storage/storage-contract.service';
import StorageService from '@application/services/storage/storage.service';
import BullMQStorageMigrationQueueService from '@application/services/storage-migration/bullmq-storage-migration-queue.service';
import { StorageMigrationQueueContractService } from '@application/services/storage-migration/storage-migration-queue-contract.service';
import { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';
import TableSchemaMongooseService from '@application/services/table-schema/table-schema-mongoose.service';

/**
 * Registro explícito de dependências.
 * Quando trocar de ORM, altere apenas os imports e registros aqui.
 */
export function registerDependencies(): void {
  injectablesHolder.injectService(
    EvaluationContractRepository,
    EvaluationMongooseRepository,
  );

  injectablesHolder.injectService(
    ExtensionContractRepository,
    ExtensionMongooseRepository,
  );

  injectablesHolder.injectService(
    FieldContractRepository,
    FieldMongooseRepository,
  );

  injectablesHolder.injectService(
    MenuContractRepository,
    MenuMongooseRepository,
  );

  injectablesHolder.injectService(
    PermissionContractRepository,
    PermissionMongooseRepository,
  );

  injectablesHolder.injectService(RowContractRepository, RowMongooseRepository);

  injectablesHolder.injectService(
    ReactionContractRepository,
    ReactionMongooseRepository,
  );

  injectablesHolder.injectService(
    SettingContractRepository,
    SettingMongooseRepository,
  );

  injectablesHolder.injectService(
    StorageContractRepository,
    StorageMongooseRepository,
  );

  injectablesHolder.injectService(
    TableContractRepository,
    TableMongooseRepository,
  );

  injectablesHolder.injectService(
    UserContractRepository,
    UserMongooseRepository,
  );

  injectablesHolder.injectService(
    UserGroupContractRepository,
    UserGroupMongooseRepository,
  );

  injectablesHolder.injectService(
    ValidationTokenContractRepository,
    ValidationTokenMongooseRepository,
  );

  injectablesHolder.injectService(EmailContractService, NodemailerEmailService);

  injectablesHolder.injectService(StorageContractService, StorageService);

  injectablesHolder.injectService(
    PasswordContractService,
    BcryptPasswordService,
  );

  injectablesHolder.injectService(PermissionContractService, PermissionService);

  injectablesHolder.injectService(
    TableSchemaContractService,
    TableSchemaMongooseService,
  );

  injectablesHolder.injectService(
    RowPasswordContractService,
    BcryptRowPasswordService,
  );

  injectablesHolder.injectService(
    ScriptExecutionContractService,
    NodeVmScriptExecutionService,
  );

  injectablesHolder.injectService(RowContextContractService, RowContextService);

  injectablesHolder.injectService(
    StorageMigrationQueueContractService,
    BullMQStorageMigrationQueueService,
  );

  injectablesHolder.injectService(
    KanbanCommentMentionContractService,
    KanbanCommentMentionService,
  );

  injectablesHolder.injectService(RowAccessGuardService, RowAccessGuardService);
}
