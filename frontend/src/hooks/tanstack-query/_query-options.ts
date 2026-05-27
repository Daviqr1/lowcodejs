/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type {
  IExtension,
  IField,
  IGroup,
  IMenu,
  IPermission,
  IRow,
  ISetting,
  ISetupStatus,
  ITable,
  IUser,
  Paginated,
} from '@/lib/interfaces';
import type {
  MenuQueryPayload,
  TableQueryPayload,
  UserGroupQueryPayload,
  UserQueryPayload,
} from '@/lib/payloads';

function nextPageOrUndefined(lastPage: Paginated<unknown>): number | undefined {
  if (lastPage.meta.page < lastPage.meta.lastPage) {
    return lastPage.meta.page + 1;
  }
  return undefined;
}

// ============== USERS ==============

export const userListOptions = (params: UserQueryPayload) =>
  queryOptions({
    queryKey: queryKeys.users.list(params),
    queryFn: async () => {
      const response = await API.get<Paginated<IUser>>('/users/paginated', {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const userDetailOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const response = await API.get<IUser>(`/users/${userId}`);
      return response.data;
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });

export const userListInfiniteOptions = (params: UserQueryPayload = {}) =>
  infiniteQueryOptions({
    queryKey: queryKeys.users.infinite(params),
    queryFn: async ({ pageParam }) => {
      const response = await API.get<Paginated<IUser>>('/users/paginated', {
        params: { ...params, page: pageParam },
      });
      return response.data;
    },
    initialPageParam: params.page ?? 1,
    getNextPageParam: nextPageOrUndefined,
    staleTime: 2 * 60 * 1000,
  });

// ============== GROUPS ==============

export const groupListOptions = (params: UserGroupQueryPayload) =>
  queryOptions({
    queryKey: queryKeys.groups.list(params),
    queryFn: async () => {
      const response = await API.get<Paginated<IGroup>>(
        '/user-group/paginated',
        { params },
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const groupAllOptions = () =>
  queryOptions({
    queryKey: queryKeys.groups.all,
    queryFn: async () => {
      const response = await API.get<Array<IGroup>>('/user-group');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const groupDetailOptions = (groupId: string) =>
  queryOptions({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: async () => {
      const response = await API.get<IGroup>(`/user-group/${groupId}`);
      return response.data;
    },
    enabled: Boolean(groupId),
    staleTime: 2 * 60 * 1000,
  });

// ============== MENUS ==============

export const menuListOptions = (params: MenuQueryPayload) =>
  queryOptions({
    queryKey: queryKeys.menus.list(params),
    queryFn: async () => {
      const response = await API.get<Paginated<IMenu>>('/menu/paginated', {
        params,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

export const menuAllOptions = () =>
  queryOptions({
    queryKey: queryKeys.menus.all,
    queryFn: async () => {
      const response = await API.get<Array<IMenu>>('/menu');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

export const menuDetailOptions = (menuId: string) =>
  queryOptions({
    queryKey: queryKeys.menus.detail(menuId),
    queryFn: async () => {
      const response = await API.get<IMenu>(`/menu/${menuId}`);
      return response.data;
    },
    enabled: Boolean(menuId),
    staleTime: 5 * 60 * 1000,
  });

// ============== TABLES ==============

export const tableListOptions = (params: TableQueryPayload) =>
  queryOptions({
    queryKey: queryKeys.tables.list(params),
    queryFn: async () => {
      const response = await API.get<Paginated<ITable>>('/tables/paginated', {
        params,
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });

export const tableDetailOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.tables.detail(slug),
    queryFn: async () => {
      const response = await API.get<ITable>(`/tables/${slug}`);
      return response.data;
    },
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });

export const tableListInfiniteOptions = (params: TableQueryPayload = {}) =>
  infiniteQueryOptions({
    queryKey: queryKeys.tables.infinite(params),
    queryFn: async ({ pageParam }) => {
      const response = await API.get<Paginated<ITable>>('/tables/paginated', {
        params: { ...params, page: pageParam },
      });
      return response.data;
    },
    initialPageParam: params.page ?? 1,
    getNextPageParam: nextPageOrUndefined,
    staleTime: 60 * 1000,
  });

// ============== ROWS ==============

export const rowListOptions = (slug: string, params: Record<string, unknown>) =>
  queryOptions({
    queryKey: queryKeys.rows.list(slug, params),
    queryFn: async () => {
      const response = await API.get<Paginated<IRow>>(
        `/tables/${slug}/rows/paginated`,
        { params },
      );
      return response.data;
    },
    enabled: Boolean(slug),
    staleTime: 30 * 1000,
  });

export const rowDetailOptions = (slug: string, rowId: string) =>
  queryOptions({
    queryKey: queryKeys.rows.detail(slug, rowId),
    queryFn: async () => {
      const response = await API.get<IRow>(`/tables/${slug}/rows/${rowId}`);
      return response.data;
    },
    enabled: Boolean(slug) && Boolean(rowId),
    staleTime: 30 * 1000,
  });

// ============== FIELDS ==============

export const fieldDetailOptions = (tableSlug: string, fieldId: string) =>
  queryOptions({
    queryKey: queryKeys.fields.detail(tableSlug, fieldId),
    queryFn: async () => {
      const response = await API.get<IField>(
        `/tables/${tableSlug}/fields/${fieldId}`,
      );
      return response.data;
    },
    enabled: Boolean(tableSlug) && Boolean(fieldId),
    staleTime: 60 * 1000,
  });

export const groupFieldDetailOptions = (
  tableSlug: string,
  groupSlug: string,
  fieldId: string,
) =>
  queryOptions({
    queryKey: queryKeys.groupFields.detail(tableSlug, groupSlug, fieldId),
    queryFn: async () => {
      const route = `/tables/${tableSlug}/groups/${groupSlug}/fields/${fieldId}`;
      const response = await API.get<IField>(route);
      return response.data;
    },
    enabled: Boolean(tableSlug) && Boolean(fieldId) && Boolean(groupSlug),
    staleTime: 60 * 1000,
  });

// ============== PROFILE ==============

export const profileDetailOptions = () =>
  queryOptions({
    queryKey: queryKeys.profile.all,
    queryFn: async () => {
      const response = await API.get<IUser>('/profile');
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

// ============== SETTINGS ==============

export const settingOptions = () =>
  queryOptions({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const response = await API.get<ISetting>('/setting');
      return response.data;
    },
    staleTime: 0,
  });

// ============== PERMISSIONS ==============

export const permissionOptions = () =>
  queryOptions({
    queryKey: queryKeys.permissions.all,
    queryFn: async () => {
      const response = await API.get<Array<IPermission>>('/permissions');
      return response.data;
    },
    staleTime: 0,
  });

// ============== PAGES ==============

export const pageDetailOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.pages.detail(slug),
    queryFn: async () => {
      const response = await API.get<IMenu>(`/pages/${slug}`);
      return response.data;
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

// ============== GROUP ROWS ==============

export const groupRowListOptions = (
  slug: string,
  rowId: string,
  groupSlug: string,
) =>
  queryOptions({
    queryKey: queryKeys.groupRows.lists(slug, rowId, groupSlug),
    queryFn: async () => {
      const response = await API.get<Array<IRow>>(
        `/tables/${slug}/rows/${rowId}/groups/${groupSlug}`,
      );
      return response.data;
    },
    enabled: Boolean(slug) && Boolean(rowId) && Boolean(groupSlug),
    staleTime: 30 * 1000,
  });

// ============== RELATIONSHIPS ==============

export const relationshipRowsOptions = (params: {
  tableSlug: string;
  fieldSlug: string;
  search?: string;
  page?: number;
  perPage?: number;
}) =>
  queryOptions({
    queryKey: queryKeys.relationships.rows(
      params.fieldSlug,
      params.tableSlug,
      params.search,
    ),
    queryFn: async () => {
      const response = await API.get<Paginated<IRow>>(
        `/tables/${params.tableSlug}/rows/paginated`,
        {
          params: {
            page: params.page ?? 1,
            perPage: params.perPage ?? 10,
            ...(params.search && { search: params.search }),
          },
        },
      );
      return response.data;
    },
    enabled: Boolean(params.tableSlug),
    staleTime: 30 * 1000,
  });

export const relationshipRowsInfiniteOptions = (params: {
  tableSlug: string;
  fieldSlug: string;
  search?: string;
  perPage?: number;
}) =>
  infiniteQueryOptions({
    queryKey: queryKeys.relationships.infinite(
      params.fieldSlug,
      params.tableSlug,
      params.search,
    ),
    queryFn: async ({ pageParam }) => {
      const response = await API.get<Paginated<IRow>>(
        `/tables/${params.tableSlug}/rows/paginated`,
        {
          params: {
            page: pageParam,
            perPage: params.perPage ?? 10,
            ...(params.search && { search: params.search }),
          },
        },
      );
      return response.data;
    },
    enabled: Boolean(params.tableSlug),
    initialPageParam: 1,
    getNextPageParam: nextPageOrUndefined,
    staleTime: 30 * 1000,
  });

// ============== SETUP ==============

export const setupStatusOptions = () =>
  queryOptions({
    queryKey: queryKeys.setup.status(),
    queryFn: async () => {
      const { data } = await API.get<ISetupStatus>('/setup/status');
      return data;
    },
    staleTime: 0,
  });

// ============== EXTENSIONS ==============

export const extensionListOptions = () =>
  queryOptions({
    queryKey: queryKeys.extensions.list(),
    queryFn: async () => {
      const response = await API.get<Array<IExtension>>('/extensions');
      return response.data;
    },
    staleTime: 30 * 1000,
  });
