export const queryKeys = {
  authentication: {
    all: ['authentication'] as const,
    accounts: () => [...queryKeys.authentication.all, 'accounts'] as const,
  },
  tables: {
    all: ['tables'] as const,
    lists: () => [...queryKeys.tables.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.tables.lists(), params] as const,
    infinite: (params: Record<string, unknown>) =>
      [...queryKeys.tables.all, 'infinite', params] as const,
    details: () => [...queryKeys.tables.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.tables.details(), slug] as const,
  },
  rows: {
    all: (tableSlug: string) => ['tables', tableSlug, 'rows'] as const,
    lists: (tableSlug: string) =>
      [...queryKeys.rows.all(tableSlug), 'list'] as const,
    list: (tableSlug: string, params: Record<string, unknown>) =>
      [...queryKeys.rows.lists(tableSlug), params] as const,
    details: (tableSlug: string) =>
      [...queryKeys.rows.all(tableSlug), 'detail'] as const,
    detail: (tableSlug: string, rowId: string) =>
      [...queryKeys.rows.details(tableSlug), rowId] as const,
    bySlug: (tableSlug: string, rowSlug: string) =>
      [...queryKeys.rows.all(tableSlug), 'by-slug', rowSlug] as const,
  },
  relationships: {
    all: ['relationships'] as const,
    rows: (
      fieldSlug: string,
      tableSlug: string,
      search?: string,
      excludeSelfId?: string,
    ) =>
      [
        ...queryKeys.relationships.all,
        fieldSlug,
        tableSlug,
        search,
        excludeSelfId,
      ] as const,
    infinite: (
      fieldSlug: string,
      tableSlug: string,
      search?: string,
      excludeLinked?: boolean,
      excludeForRecordId?: string,
      excludeSelfId?: string,
    ) =>
      [
        ...queryKeys.relationships.all,
        'infinite',
        fieldSlug,
        tableSlug,
        search,
        excludeLinked,
        excludeForRecordId,
        excludeSelfId,
      ] as const,
    links: (relationshipId: string, side: string, recordId: string) =>
      [
        ...queryKeys.relationships.all,
        'links',
        relationshipId,
        side,
        recordId,
      ] as const,
    linksPaginated: (
      relationshipId: string,
      side: string,
      recordId: string,
      params: Record<string, unknown>,
    ) =>
      [
        ...queryKeys.relationships.links(relationshipId, side, recordId),
        'paginated',
        params,
      ] as const,
  },
  fields: {
    all: (tableSlug: string) => ['tables', tableSlug, 'fields'] as const,
    detail: (tableSlug: string, fieldId: string) =>
      [...queryKeys.fields.all(tableSlug), fieldId] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.users.lists(), params] as const,
    infinite: (params: Record<string, unknown>) =>
      [...queryKeys.users.all, 'infinite', params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (userId: string) => [...queryKeys.users.details(), userId] as const,
  },
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.groups.lists(), params] as const,
    details: () => [...queryKeys.groups.all, 'detail'] as const,
    detail: (groupId: string) =>
      [...queryKeys.groups.details(), groupId] as const,
  },
  menus: {
    all: ['menus'] as const,
    lists: () => [...queryKeys.menus.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.menus.lists(), params] as const,
    details: () => [...queryKeys.menus.all, 'detail'] as const,
    detail: (menuId: string) => [...queryKeys.menus.details(), menuId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (sub?: string) => [...queryKeys.profile.all, sub] as const,
  },
  pages: {
    all: ['pages'] as const,
    detail: (slug: string) => [...queryKeys.pages.all, slug] as const,
  },
  groupFields: {
    all: (tableSlug: string, groupSlug: string) =>
      ['tables', tableSlug, 'groups', groupSlug, 'fields'] as const,
    details: (tableSlug: string, groupSlug: string) =>
      [...queryKeys.groupFields.all(tableSlug, groupSlug), 'detail'] as const,
    detail: (tableSlug: string, groupSlug: string, fieldId: string) =>
      [
        ...queryKeys.groupFields.details(tableSlug, groupSlug),
        fieldId,
      ] as const,
  },
  groupRows: {
    all: (tableSlug: string, rowId: string, groupSlug: string) =>
      ['tables', tableSlug, 'rows', rowId, 'groups', groupSlug] as const,
    lists: (tableSlug: string, rowId: string, groupSlug: string) =>
      [
        ...queryKeys.groupRows.all(tableSlug, rowId, groupSlug),
        'list',
      ] as const,
    paginated: (
      tableSlug: string,
      rowId: string,
      groupSlug: string,
      params: Record<string, unknown>,
    ) =>
      [
        ...queryKeys.groupRows.lists(tableSlug, rowId, groupSlug),
        'paginated',
        params,
      ] as const,
    details: (tableSlug: string, rowId: string, groupSlug: string) =>
      [
        ...queryKeys.groupRows.all(tableSlug, rowId, groupSlug),
        'detail',
      ] as const,
    detail: (
      tableSlug: string,
      rowId: string,
      groupSlug: string,
      itemId: string,
    ) =>
      [
        ...queryKeys.groupRows.details(tableSlug, rowId, groupSlug),
        itemId,
      ] as const,
  },
  permissions: {
    all: ['permissions'] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  storageMigration: {
    all: ['storage-migration'] as const,
    status: () => [...queryKeys.storageMigration.all, 'status'] as const,
  },
  setup: {
    all: ['setup'] as const,
    status: () => [...queryKeys.setup.all, 'status'] as const,
  },

  loggers: {
    all: ['loggers'] as const,
    lists: () => [...queryKeys.loggers.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.loggers.lists(), params] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    paginated: (params: Record<string, unknown>) =>
      [...queryKeys.notifications.all, 'paginated', params] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  docTranscription: {
    all: ['doc-transcription'] as const,
    config: () => [...queryKeys.docTranscription.all, 'config'] as const,
  },
  extensions: {
    all: ['extensions'] as const,
    lists: () => [...queryKeys.extensions.all, 'list'] as const,
    list: () => [...queryKeys.extensions.lists()] as const,
    active: () => [...queryKeys.extensions.all, 'active'] as const,
    details: () => [...queryKeys.extensions.all, 'detail'] as const,
    detail: (extensionId: string) =>
      [...queryKeys.extensions.details(), extensionId] as const,
  },
} as const;
