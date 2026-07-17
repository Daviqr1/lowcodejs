import { z } from 'zod';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_MENU_ITEM_TYPE,
  E_PERMISSION_TARGET,
  E_TABLE_STYLE,
  E_USER_STATUS,
  PASSWORD_REGEX,
  TABLE_NAME_REGEX,
} from './constant';

// ============== AUTHENTICATION ==============
export const SignInBodySchema = z.object({
  email: z.email().trim(),
  password: z.string().trim().min(1),
});

export const SignUpBodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.email().trim(),
  password: z.string().trim().min(8),
});

export const RequestCodeBodySchema = z.object({
  email: z.email().trim(),
});

export const ValidateCodeBodySchema = z.object({
  code: z.string().trim(),
});

export const ResetPasswordBodySchema = z.object({
  password: z.string().trim().min(8),
});

export const ResetPasswordParamsSchema = z.object({
  _id: z.string().trim(),
});

// ============== USER ==============
export const UserBaseSchema = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  email: z
    .string({ message: 'O email é obrigatório' })
    .trim()
    .email('Digite um email válido'),
  group: z
    .string({ message: 'O grupo é obrigatório' })
    .min(1, 'O grupo é obrigatório'),
  groups: z.array(z.string().trim()).default([]),
});

export const UserCreateBodySchema = UserBaseSchema.extend({
  password: z
    .string({ message: 'A senha é obrigatória' })
    .trim()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .regex(
      PASSWORD_REGEX,
      'A senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
    ),
});

export const UserUpdateBodySchema = UserBaseSchema.partial().extend({
  password: z
    .string({ message: 'A senha deve ser um texto' })
    .trim()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .regex(
      PASSWORD_REGEX,
      'A senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
    )
    .optional(),
  status: z
    .enum([E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE], {
      message: 'O status deve ser ACTIVE ou INACTIVE',
    })
    .optional(),
});

export const UserUpdateFormSchema = UserBaseSchema.extend({
  password: z
    .string()
    .refine(
      (val) => val === '' || (val.length >= 6 && PASSWORD_REGEX.test(val)),
      'A senha deve ter 6+ caracteres com: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
    ),
  status: z.enum([E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE], {
    message: 'O status deve ser ACTIVE ou INACTIVE',
  }),
  // Form sempre provê `groups` (default []); sem `.default()` o input do schema
  // fica `string[]` (não opcional), casando com UserUpdateFormValues no validador.
  groups: z.array(z.string().trim()),
});

export const UserUpdateParamsSchema = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

// ============== USER GROUP ==============
export const UserGroupCreateBodySchema = z.object({
  name: z.string().trim(),
  description: z.string().trim().nullable(),
  permissions: z.array(z.string().trim()).default([]),
  encompasses: z.array(z.string().trim()).default([]),
});

export const UserGroupUpdateParamsSchema = z.object({
  _id: z.string(),
});

export const UserGroupUpdateBodySchema = z.object({
  name: z.string().trim().optional(),
  description: z.string().trim().nullable().optional(),
  permissions: z.array(z.string().trim()).default([]),
  encompasses: z.array(z.string().trim()).default([]),
});

// ============== MENU ==============
const MenuTypeEnum = z.enum([
  E_MENU_ITEM_TYPE.TABLE,
  E_MENU_ITEM_TYPE.PAGE,
  E_MENU_ITEM_TYPE.FORM,
  E_MENU_ITEM_TYPE.EXTERNAL,
  E_MENU_ITEM_TYPE.SEPARATOR,
  E_MENU_ITEM_TYPE.EXTENSION_MODULE,
]);

const MenuExtensionRefSchema = z.object({
  pkg: z.string(),
  extensionId: z.string(),
});

// Visibilidade da opção de menu (Grupo|Public|Nobody).
const MenuVisibilitySchema = z
  .object({
    kind: z.enum([
      E_PERMISSION_TARGET.PUBLIC,
      E_PERMISSION_TARGET.NOBODY,
      E_PERMISSION_TARGET.GROUP,
    ]),
    group: z.string().nullable().default(null),
  })
  .optional();

export const MenuCreateBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    type: MenuTypeEnum,
    table: z.string().default(''),
    parent: z.string().default(''),
    html: z.string().default(''),
    url: z.string().default(''),
    icon: z.string().nullable().default(null),
    order: z.number().default(0),
    isInitial: z.boolean().default(false),
    extension: MenuExtensionRefSchema.nullable().optional(),
    visibility: MenuVisibilitySchema,
  })
  .superRefine((data, ctx) => {
    if (
      (data.type === E_MENU_ITEM_TYPE.TABLE ||
        data.type === E_MENU_ITEM_TYPE.FORM) &&
      (!data.table || data.table.trim() === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['table'],
        message: 'Tabela é obrigatória',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.PAGE &&
      (!data.html || data.html.trim() === '' || data.html === '<p></p>')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['html'],
        message: 'Conteúdo HTML é obrigatório',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.EXTERNAL &&
      (!data.url || data.url.trim() === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'URL é obrigatória',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.EXTENSION_MODULE &&
      (!data.extension?.pkg || !data.extension?.extensionId)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['extension'],
        message: 'Selecione um módulo de extensão',
      });
    }
  });

export const MenuUpdateParamsSchema = z.object({
  _id: z.string().min(1, 'ID é obrigatório'),
});

export const MenuUpdateBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    type: MenuTypeEnum,
    table: z.string().default(''),
    parent: z.string().default(''),
    html: z.string().default(''),
    url: z.string().default(''),
    icon: z.string().nullable().default(null),
    order: z.number().default(0),
    isInitial: z.boolean().default(false),
    extension: MenuExtensionRefSchema.nullable().optional(),
    visibility: MenuVisibilitySchema,
  })
  .superRefine((data, ctx) => {
    if (
      (data.type === E_MENU_ITEM_TYPE.TABLE ||
        data.type === E_MENU_ITEM_TYPE.FORM) &&
      (!data.table || data.table.trim() === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['table'],
        message: 'Tabela é obrigatória',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.PAGE &&
      (!data.html || data.html.trim() === '' || data.html === '<p></p>')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['html'],
        message: 'Conteúdo HTML é obrigatório',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.EXTERNAL &&
      (!data.url || data.url.trim() === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'URL é obrigatória',
      });
    }

    if (
      data.type === E_MENU_ITEM_TYPE.EXTENSION_MODULE &&
      (!data.extension?.pkg || !data.extension?.extensionId)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['extension'],
        message: 'Selecione um módulo de extensão',
      });
    }
  });

// ============== TABLE ==============
export const TableStyleSchema = z
  .enum([
    E_TABLE_STYLE.GALLERY,
    E_TABLE_STYLE.LIST,
    E_TABLE_STYLE.DOCUMENT,
    E_TABLE_STYLE.CARD,
    E_TABLE_STYLE.MOSAIC,
    E_TABLE_STYLE.KANBAN,
    E_TABLE_STYLE.FORUM,
    E_TABLE_STYLE.CALENDAR,
  ])
  .default(E_TABLE_STYLE.LIST);

export const TableFieldOrderListSchema = z.array(z.string().trim()).default([]);

export const TableFieldOrderFormSchema = z.array(z.string().trim()).default([]);

export const TableFieldOrderFilterSchema = z
  .array(z.string().trim())
  .default([]);

export const TableFieldOrderDetailSchema = z
  .array(z.string().trim())
  .default([]);

export const TableCreateBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(40, 'Nome deve ter no máximo 40 caracteres')
    .regex(
      TABLE_NAME_REGEX,
      'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
    ),
  owner: z.string().trim().optional(),
  logo: z.string().trim().nullable().optional(),
  style: TableStyleSchema.optional(),
  fieldOrderList: TableFieldOrderListSchema.optional(),
  fieldOrderForm: TableFieldOrderFormSchema.optional(),
  fieldOrderFilter: TableFieldOrderFilterSchema.optional(),
  fieldOrderDetail: TableFieldOrderDetailSchema.optional(),
});

export const TableMethodSchema = z.object({
  beforeSave: z.object({
    code: z.string().trim().nullable(),
  }),
  afterSave: z.object({
    code: z.string().trim().nullable(),
  }),
  onLoad: z.object({
    code: z.string().trim().nullable(),
  }),
});

export const TableUpdateBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(40, 'Nome deve ter no máximo 40 caracteres')
    .regex(
      TABLE_NAME_REGEX,
      'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
    ),
  description: z.string().trim().nullable(),
  logo: z.string().trim().nullable(),
  style: TableStyleSchema,
  fieldOrderList: TableFieldOrderListSchema,
  fieldOrderForm: TableFieldOrderFormSchema,
  fieldOrderFilter: TableFieldOrderFilterSchema,
  fieldOrderDetail: TableFieldOrderDetailSchema,
  methods: TableMethodSchema,
});

export const TableUpdateParamsSchema = z.object({
  slug: z.string().trim(),
});

// ============== FIELD ==============
const CategorySchema = z.object({
  id: z.string().trim(),
  label: z.string().trim(),
  children: z.array(z.unknown()).default([]),
});

const RelationshipLabelPartSchema = z.object({
  path: z.string().trim().min(1),
  label: z.string().trim().optional(),
});

const RelationshipSchema = z.object({
  table: z.object({
    _id: z.string().trim(),
    slug: z.string().trim(),
  }),
  field: z.object({
    _id: z.string().trim(),
    slug: z.string().trim(),
  }),
  order: z.enum(['asc', 'desc']).default('asc'),
  customLabel: z.boolean().default(false),
  labelParts: z.array(RelationshipLabelPartSchema).default([]),
  labelSeparator: z.string().default(' - '),
  visible: z.boolean().optional(),
  onDelete: z.enum(['CASCADE', 'SET_NULL', 'RESTRICT']).optional(),
  mirror: z
    .object({
      multiple: z.boolean().default(false),
      visible: z.boolean().default(false),
      label: z.string().trim().optional(),
    })
    .optional(),
});

const DropdownSchema = z.object({
  id: z.string().trim(),
  label: z.string().trim(),
  color: z.string().nullable().optional(),
});

// Schema base para propriedades flat de campos
export const FieldBaseSchema = z.object({
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  format: z
    .enum([
      E_FIELD_FORMAT.ALPHA_NUMERIC,
      E_FIELD_FORMAT.INTEGER,
      E_FIELD_FORMAT.DECIMAL,
      E_FIELD_FORMAT.URL,
      E_FIELD_FORMAT.EMAIL,
      E_FIELD_FORMAT.RICH_TEXT,
      E_FIELD_FORMAT.PLAIN_TEXT,
      E_FIELD_FORMAT.DD_MM_YYYY,
      E_FIELD_FORMAT.MM_DD_YYYY,
      E_FIELD_FORMAT.YYYY_MM_DD,
      E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
      E_FIELD_FORMAT.MM_DD_YYYY_HH_MM_SS,
      E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS,
      E_FIELD_FORMAT.DD_MM_YYYY_DASH,
      E_FIELD_FORMAT.MM_DD_YYYY_DASH,
      E_FIELD_FORMAT.YYYY_MM_DD_DASH,
      E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS_DASH,
      E_FIELD_FORMAT.MM_DD_YYYY_HH_MM_SS_DASH,
      E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH,
    ])
    .nullable()
    .default(null),
  showInFilter: z.boolean().default(false),
  showInParentList: z.boolean().default(false),
  widthInForm: z.number().nullable().default(50),
  widthInList: z.number().nullable().default(10),
  tip: z.string().nullable().default(null),
  locked: z.boolean().default(false),
  defaultValue: z.string().nullable().default(null),
  relationship: RelationshipSchema.nullable().default(null),
  dropdown: z.array(DropdownSchema).default([]),
  allowCustomDropdownOptions: z.boolean().default(false),
  allowCreateRelationshipRecords: z.boolean().default(false),
  fillWithCurrentUserWhenEmpty: z.boolean().default(false),
  category: z.array(CategorySchema).default([]),
  group: z
    .object({
      _id: z.string().trim().optional(),
      slug: z.string().trim(),
    })
    .nullable()
    .default(null),
});

export const FieldCreateBodySchema = z
  .object({
    name: z.string().trim(),
    type: z.enum([
      E_FIELD_TYPE.TEXT_SHORT,
      E_FIELD_TYPE.TEXT_LONG,
      E_FIELD_TYPE.DROPDOWN,
      E_FIELD_TYPE.DATE,
      E_FIELD_TYPE.RELATIONSHIP,
      E_FIELD_TYPE.FILE,
      E_FIELD_TYPE.FIELD_GROUP,
      E_FIELD_TYPE.REACTION,
      E_FIELD_TYPE.EVALUATION,
      E_FIELD_TYPE.CATEGORY,
      E_FIELD_TYPE.USER,
      E_FIELD_TYPE.USER_GROUP,
    ]),
  })
  .merge(FieldBaseSchema);

export const FieldCreateParamsSchema = z.object({
  slug: z.string().trim(),
});

export const FieldUpdateBodySchema = z
  .object({
    name: z.string().trim(),
    type: z.enum([
      E_FIELD_TYPE.TEXT_SHORT,
      E_FIELD_TYPE.TEXT_LONG,
      E_FIELD_TYPE.DROPDOWN,
      E_FIELD_TYPE.DATE,
      E_FIELD_TYPE.RELATIONSHIP,
      E_FIELD_TYPE.FILE,
      E_FIELD_TYPE.FIELD_GROUP,
      E_FIELD_TYPE.REACTION,
      E_FIELD_TYPE.EVALUATION,
      E_FIELD_TYPE.CATEGORY,
      E_FIELD_TYPE.USER,
      E_FIELD_TYPE.USER_GROUP,
    ]),
    trashed: z.boolean().default(false),
    trashedAt: z.string().nullable().default(null),
  })
  .merge(FieldBaseSchema);

export const FieldUpdateParamsSchema = z.object({
  slug: z.string().trim(),
  _id: z.string().trim(),
});

// ============== ROW ==============
export const RowDataSchema = z.record(
  z.string(),
  z.union([
    z.string().trim(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string().trim()),
    z.array(z.number()),
    z.array(
      z
        .object({
          _id: z.string().trim().optional(),
        })
        .loose(),
    ),
    z.object({}).loose(),
  ]),
);

export const RowCreateParamsSchema = z.object({
  slug: z.string().trim(),
});

export const RowUpdateParamsSchema = z.object({
  slug: z.string().trim(),
  _id: z.string().trim(),
});

// ============== PROFILE ==============
export const ProfileUpdateBodySchema = z.object({
  name: z.string().trim(),
  email: z.email().trim(),
  group: z.string().trim(),
  currentPassword: z.string().trim().optional(),
  newPassword: z.string().trim().optional(),
  allowPasswordChange: z.coerce.boolean().default(false),
});

export const ProfileUpdateParamsSchema = z.object({
  _id: z.string().trim(),
});

// ============== SETTING ==============
export const SettingUpdateBodySchema = z.object({
  LOCALE: z.string().optional(),
  FILE_UPLOAD_MAX_SIZE: z.number().optional(),
  FILE_UPLOAD_ACCEPTED: z.array(z.string()).optional(),
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: z.number().optional(),
  PAGINATION_PER_PAGE: z.number().optional(),
  LOGO_SMALL_URL: z.string().optional(),
  LOGO_LARGE_URL: z.string().optional(),
  LOGO_SMALL_DARK_URL: z.string().optional(),
  LOGO_LARGE_DARK_URL: z.string().optional(),
  MODEL_CLONE_TABLES: z.string().optional(),
  EMAIL_PROVIDER_HOST: z.string().optional(),
  EMAIL_PROVIDER_PORT: z.number().optional(),
  EMAIL_PROVIDER_USER: z.string().optional(),
  EMAIL_PROVIDER_PASSWORD: z.string().optional(),
});

// ============== INFERRED TYPES ==============
// Tipos de payload estão em /lib/payloads.ts
// Apenas RowData é inferido aqui pois representa o conteúdo dinâmico do registro
export type RowData = z.infer<typeof RowDataSchema>;
