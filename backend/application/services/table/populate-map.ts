import type mongoose from 'mongoose';

import type { ValueOf } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import { Evaluation } from '@application/model/evaluation.model';
import { Reaction } from '@application/model/reaction.model';
import { Storage } from '@application/model/storage.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';

type PopulateByFieldType = Partial<
  Record<
    ValueOf<typeof E_FIELD_TYPE>,
    Pick<mongoose.PopulateOptions, 'model' | 'select'>
  >
>;

// Refs simples, iguais dentro e fora de grupo. Estavam escritas duas vezes,
// caractere a caractere, no populate-builder e no field-group-builder.
const REF_POPULATE: PopulateByFieldType = {
  [E_FIELD_TYPE.FILE]: { model: Storage },
  [E_FIELD_TYPE.USER]: { model: User, select: 'name email _id' },
  [E_FIELD_TYPE.USER_GROUP]: { model: UserGroup, select: 'name slug _id' },
  [E_FIELD_TYPE.CREATOR]: { model: User, select: 'name email _id' },
  [E_FIELD_TYPE.UPDATER]: { model: User, select: 'name email _id' },
};

/**
 * Campo top-level: as refs simples + reacao e avaliacao. RELATIONSHIP e
 * FIELD_GROUP nao entram (tem logica propria de ciclo/subarvore).
 */
export const POPULATE_BY_FIELD_TYPE: PopulateByFieldType = {
  ...REF_POPULATE,
  [E_FIELD_TYPE.REACTION]: { model: Reaction, select: 'user type' },
  [E_FIELD_TYPE.EVALUATION]: { model: Evaluation, select: 'user value' },
};

/**
 * Campo dentro de `FIELD_GROUP` (path nested `${field.slug}.${groupField.slug}`):
 * so as refs simples — reacao e avaliacao nao existem dentro de grupo.
 */
export const GROUP_POPULATE_BY_FIELD_TYPE: PopulateByFieldType = REF_POPULATE;
