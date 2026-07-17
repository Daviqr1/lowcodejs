import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query';
import axios from 'axios';

import { API } from '@/lib/api';
import type { IRow, Paginated } from '@/lib/interfaces';

export type CascadeDropdownFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_between';

export type CascadeDropdownFilter = {
  id: string;
  fieldId: string;
  fieldSlug: string;
  fieldType: string;
  operator: CascadeDropdownFilterOperator;
  value: string | null;
  values: Array<string>;
  dateStart: string | null;
  dateEnd: string | null;
};

export type CascadeDropdownConfig = {
  _id?: string;
  targetTableSlug: string;
  targetFieldId: string;
  targetFieldSlug: string;
  sourceTableId: string;
  sourceTableSlug: string;
  parentFieldId: string;
  parentFieldSlug: string;
  childFieldId: string;
  childFieldSlug: string;
  enabled: boolean;
  parentWidth: number;
  childWidth: number;
  filters: Array<CascadeDropdownFilter>;
};

export type CascadeDropdownOption = {
  value: string;
  label: string;
};

export const cascadeDropdownQueryKeys = {
  all: ['cascade-dropdown'] as const,
  config: (tableSlug: string, fieldId: string) =>
    [...cascadeDropdownQueryKeys.all, 'config', tableSlug, fieldId] as const,
  parents: (
    sourceTableSlug: string,
    targetTableSlug: string,
    fieldId: string,
    search?: string,
  ) =>
    [
      ...cascadeDropdownQueryKeys.all,
      'parents',
      sourceTableSlug,
      targetTableSlug,
      fieldId,
      search,
    ] as const,
  children: (
    sourceTableSlug: string,
    targetTableSlug: string,
    fieldId: string,
    parentValue: string,
    search?: string,
  ) =>
    [
      ...cascadeDropdownQueryKeys.all,
      'children',
      sourceTableSlug,
      targetTableSlug,
      fieldId,
      parentValue,
      search,
    ] as const,
};

function isInactiveExtensionError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 404 &&
    error.response?.data?.cause === 'EXTENSION_NOT_ACTIVE'
  );
}

export function useCascadeDropdownConfig(params: {
  tableSlug: string;
  fieldId: string;
  enabled?: boolean;
}): UseQueryResult<CascadeDropdownConfig | null, Error> {
  const { enabled = true } = params;

  return useQuery({
    queryKey: cascadeDropdownQueryKeys.config(params.tableSlug, params.fieldId),
    enabled: Boolean(params.tableSlug) && Boolean(params.fieldId) && enabled,
    queryFn: async () => {
      try {
        const response = await API.get<CascadeDropdownConfig | null>(
          `/plugins/cascade-dropdown/tables/${params.tableSlug}/fields/${params.fieldId}/config`,
        );
        return response.data;
      } catch (error) {
        if (isInactiveExtensionError(error)) return null;
        throw error;
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useCascadeDropdownParentOptions(params: {
  sourceTableSlug: string;
  targetTableSlug: string;
  fieldId: string;
  search?: string;
  enabled?: boolean;
}): UseQueryResult<Array<CascadeDropdownOption>, Error> {
  const { enabled = true } = params;

  return useQuery({
    queryKey: cascadeDropdownQueryKeys.parents(
      params.sourceTableSlug,
      params.targetTableSlug,
      params.fieldId,
      params.search,
    ),
    enabled:
      Boolean(params.sourceTableSlug) &&
      Boolean(params.targetTableSlug) &&
      Boolean(params.fieldId) &&
      enabled,
    queryFn: async () => {
      const response = await API.get<Array<CascadeDropdownOption>>(
        `/plugins/cascade-dropdown/source/${params.sourceTableSlug}/target/${params.targetTableSlug}/fields/${params.fieldId}/parent-options`,
        {
          params: {
            ...(params.search && { search: params.search }),
          },
        },
      );
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCascadeDropdownChildOptions(params: {
  sourceTableSlug: string;
  targetTableSlug: string;
  fieldId: string;
  parentValue: string;
  search?: string;
  perPage?: number;
  enabled?: boolean;
}): UseInfiniteQueryResult<InfiniteData<Paginated<IRow>, number>, Error> {
  const { enabled = true } = params;

  return useInfiniteQuery({
    queryKey: cascadeDropdownQueryKeys.children(
      params.sourceTableSlug,
      params.targetTableSlug,
      params.fieldId,
      params.parentValue,
      params.search,
    ),
    enabled:
      Boolean(params.sourceTableSlug) &&
      Boolean(params.targetTableSlug) &&
      Boolean(params.fieldId) &&
      Boolean(params.parentValue) &&
      enabled,
    queryFn: async ({ pageParam }) => {
      const response = await API.get<Paginated<IRow>>(
        `/plugins/cascade-dropdown/source/${params.sourceTableSlug}/target/${params.targetTableSlug}/fields/${params.fieldId}/child-options`,
        {
          params: {
            parentValue: params.parentValue,
            page: pageParam,
            perPage: params.perPage ?? 20,
            ...(params.search && { search: params.search }),
          },
        },
      );
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.lastPage) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000,
  });
}
