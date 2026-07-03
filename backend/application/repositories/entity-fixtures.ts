import {
  E_AI_LLM_PROVIDER,
  E_FIELD_TYPE,
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  E_USER_STATUS,
  type IField,
  type IGroup,
  type IPermission,
  type ISetting,
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

// ISetting nao estende Base: e um objeto plano de configuracao global. Defaults
// alinhados ao schema Mongoose (setting.model.ts) e ao seeder.
export function makeSetting(): ISetting {
  return {
    SYSTEM_NAME: 'LowCodeJs',
    SYSTEM_DESCRIPTION: 'Plataforma Oficial',
    LOCALE: 'pt-br',
    STORAGE_DRIVER: 'local',
    FILE_UPLOAD_MAX_SIZE: 10485760,
    FILE_UPLOAD_ACCEPTED: 'jpg;jpeg;png;pdf',
    FILE_UPLOAD_MAX_FILES_PER_UPLOAD: 10,
    PAGINATION_PER_PAGE: 20,
    MODEL_CLONE_TABLES: [],
    EMAIL_PROVIDER_HOST: null,
    EMAIL_PROVIDER_PORT: null,
    EMAIL_PROVIDER_USER: null,
    EMAIL_PROVIDER_PASSWORD: null,
    EMAIL_PROVIDER_FROM: null,
    OPENAI_API_KEY: null,
    AI_ASSISTANT_ENABLED: false,
    CHAT_HISTORY_ENABLED: false,
    MCP_SERVER_URL: null,
    MCP_SERVER_TOKEN: null,
    MCP_LOWCODE_API_URL: null,
    OPENAI_MODEL: 'gpt-4.1-nano',
    AI_LLM_PROVIDER: E_AI_LLM_PROVIDER.OPENAI,
    LLM_API_KEY: null,
    LLM_MODEL: 'gpt-4.1-nano',
    LLM_BASE_URL: null,
    SETUP_COMPLETED: false,
    SETUP_CURRENT_STEP: 'admin',
    MIGRATION_DUAL_CONNECTION_AT: null,
    MIGRATION_DUAL_CONNECTION_DROPPED_AT: null,
    MIGRATION_STORAGE_LOCATION_AT: null,
    STORAGE_MIGRATION_LAST_RUN_AT: null,
    MIGRATION_ROW_STATUS_TRASHED_AT: null,
  };
}
