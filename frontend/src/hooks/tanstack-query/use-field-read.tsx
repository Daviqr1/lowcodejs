import type { QueryKey, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IField } from '@/lib/interfaces';

type UseFieldReadParams = {
  tableSlug: string;
  fieldId: string;
  groupSlug?: string;
};

export function useFieldRead(
  params: UseFieldReadParams,
): UseQueryResult<IField, Error> {
  const { tableSlug, fieldId, groupSlug } = params;

  // Um `useQuery` por ramo violava as Rules of Hooks: alternar `groupSlug`
  // entre definido e indefinido mudava a ordem dos hooks e quebrava em runtime.
  // As chaves usam os mesmos builders de `_query-options` para o prefetch do
  // loader continuar batendo com o cache do hook.
  let queryKey: QueryKey = queryKeys.fields.detail(tableSlug, fieldId);
  let route = `/tables/${tableSlug}/fields/${fieldId}`;

  if (groupSlug) {
    queryKey = queryKeys.groupFields.detail(tableSlug, groupSlug, fieldId);
    route = `/tables/${tableSlug}/groups/${groupSlug}/fields/${fieldId}`;
  }

  return useQuery({
    queryKey,
    queryFn: async (): Promise<IField> => {
      const response = await API.get<IField>(route);
      return response.data;
    },
    enabled: Boolean(tableSlug) && Boolean(fieldId),
    staleTime: 60 * 1000,
  });
}
