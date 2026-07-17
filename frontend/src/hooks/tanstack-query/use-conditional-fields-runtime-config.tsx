import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { API } from '@/lib/api';
import type { ConditionalFieldsConfig } from '@/lib/conditional-form-rules';

export function conditionalFieldsRuntimeConfigQueryKey(
  tableSlug: string,
): Array<string> {
  return ['conditional-fields-runtime-config', tableSlug];
}

export function useConditionalFieldsRuntimeConfig(
  tableSlug: string,
  enabled: boolean,
): UseQueryResult<ConditionalFieldsConfig, Error> {
  return useQuery({
    queryKey: conditionalFieldsRuntimeConfigQueryKey(tableSlug),
    enabled: enabled && tableSlug.length > 0,
    queryFn: async () => {
      try {
        const response = await API.get<ConditionalFieldsConfig>(
          `/plugins/conditional-fields/tables/${tableSlug}/runtime`,
        );
        return response.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return { tableId: '', tableSlug, rules: [] };
        }
        throw error;
      }
    },
  });
}
