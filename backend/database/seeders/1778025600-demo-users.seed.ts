import bcrypt from 'bcryptjs';

import { E_ROLE, E_USER_STATUS, ValueOf } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { Env } from '@start/env';

import { TaskLogger } from '../shared/task-logger';

const SALT_ROUNDS = 10;

type DemoUser = {
  name: string;
  email: string;
  password: string;
  role: ValueOf<typeof E_ROLE>;
};

type DemoBulkOp = {
  updateOne: {
    filter: { email: string };
    update: {
      $set: {
        name: string;
        email: string;
        password: string;
        status: ValueOf<typeof E_USER_STATUS>;
        group: unknown;
        trashed: boolean;
        trashedAt: Date | null;
      };
    };
    upsert: true;
  };
};

const DEMO_USERS: DemoUser[] = [
  {
    name: 'Admin Demo',
    email: 'admin@admin.com',
    password: 'Admin@2026',
    role: E_ROLE.ADMINISTRATOR,
  },
  {
    name: 'Registered Demo',
    email: 'registered@registered.com',
    password: 'Registered@2026',
    role: E_ROLE.REGISTERED,
  },
];

async function buildOp(
  user: DemoUser,
  groupBySlug: Record<string, unknown>,
): Promise<DemoBulkOp> {
  return {
    updateOne: {
      filter: { email: user.email },
      update: {
        $set: {
          name: user.name,
          email: user.email,
          password: await bcrypt.hash(user.password, SALT_ROUNDS),
          status: E_USER_STATUS.ACTIVE,
          group: groupBySlug[user.role],
          trashed: false,
          trashedAt: null,
        },
      },
      upsert: true,
    },
  };
}

export default async function Seed(): Promise<void> {
  if (Env.DEMO_MODE !== true) {
    new TaskLogger('Usuários demo').noop('ignorado (DEMO_MODE=false)');
    return;
  }

  const [adminGroup, registeredGroup] = await Promise.all([
    UserGroup.findOne({ slug: E_ROLE.ADMINISTRATOR, trashed: false }),
    UserGroup.findOne({ slug: E_ROLE.REGISTERED, trashed: false }),
  ]);

  if (!adminGroup || !registeredGroup) {
    throw new Error(
      'Demo seed: ADMINISTRATOR ou REGISTERED group ausente. Rode 1720448445-user-group.seed.ts antes.',
    );
  }

  const groupBySlug: Record<string, unknown> = {
    [E_ROLE.ADMINISTRATOR]: adminGroup._id,
    [E_ROLE.REGISTERED]: registeredGroup._id,
  };

  const ops = await Promise.all(
    DEMO_USERS.map((user): Promise<DemoBulkOp> => buildOp(user, groupBySlug)),
  );

  // @ts-expect-error IUser.group é tipado como IGroup (populado), mas o schema guarda ObjectId
  await User.bulkWrite(ops);
  new TaskLogger('Usuários demo').ok();
}
