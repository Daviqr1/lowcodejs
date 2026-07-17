import { E_ROLE } from '@application/core/entity.core';
import { Setting } from '@application/model/setting.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';

import { TaskLogger } from '../shared/task-logger';

export default async function Seed(): Promise<void> {
  const masterGroup = await UserGroup.findOne({ slug: E_ROLE.MASTER });

  let hasMaster = false;

  if (masterGroup) {
    const exists = await User.exists({
      group: masterGroup._id,
      trashed: false,
    });
    hasMaster = Boolean(exists);
  }

  let update: Record<string, unknown>;
  let detail = '';
  if (hasMaster) {
    update = { $set: { SETUP_COMPLETED: true, SETUP_CURRENT_STEP: null } };
    detail = 'SETUP_COMPLETED (MASTER já existe)';
  } else {
    update = { $setOnInsert: {} };
  }

  await Setting.findOneAndUpdate({}, update, {
    upsert: true,
    setDefaultsOnInsert: true,
    new: true,
  });

  new TaskLogger('Configurações').ok(detail);
}
