import {
  E_FIELD_TYPE,
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  E_USER_STATUS,
  type IField,
  type IGroup,
  type IPermission,
  type IStorage,
  type IUser,
} from '@application/core/entity.core';

// Fixtures de entidade para os in-memory repositories. Os doubles guardam apenas
// o `_id` de uma ref populada, mas o contrato exige a entidade inteira. Estes
// builders devolvem uma entidade completa e valida (defaults inertes) a partir
// de um id — evitando asercao de tipo (`as`) sobre um objeto parcial.

type BaseFields = {
  _id: string;
  createdAt: Date;
  updatedAt: Date | null;
  trashedAt: Date | null;
  trashed: boolean;
};

function baseFields(id: string): BaseFields {
  return {
    _id: id,
    createdAt: new Date(),
    updatedAt: null,
    trashedAt: null,
    trashed: false,
  };
}

export function makePermission(id: string): IPermission {
  return {
    ...baseFields(id),
    name: id,
    slug: id,
    description: null,
  };
}

export function makeGroup(id: string): IGroup {
  return {
    ...baseFields(id),
    name: id,
    slug: id,
    description: null,
    permissions: [],
    encompasses: [],
  };
}

export function makeUser(id: string): IUser {
  return {
    ...baseFields(id),
    name: id,
    email: `${id}@example.com`,
    password: '',
    status: E_USER_STATUS.INACTIVE,
    group: makeGroup(id),
    groups: [],
    notificationsEnabled: true,
  };
}

export function makeStorage(id: string): IStorage {
  return {
    ...baseFields(id),
    url: '',
    filename: id,
    mimetype: 'application/octet-stream',
    originalName: id,
    size: 0,
    location: E_STORAGE_LOCATION.LOCAL,
    migration_status: E_STORAGE_MIGRATION_STATUS.IDLE,
  };
}

export function makeField(id: string): IField {
  return {
    ...baseFields(id),
    name: id,
    slug: id,
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    validations: [],
  };
}
