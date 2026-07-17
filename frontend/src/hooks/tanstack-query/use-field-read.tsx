import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { fieldDetailOptions, groupFieldDetailOptions } from './_query-options';

import type { IField } from '@/lib/interfaces';

type UseFieldReadParams = {
  tableSlug: string;
  fieldId: string;
  groupSlug?: string;
};

export function useFieldRead(
  params: UseFieldReadParams,
): UseQueryResult<IField, Error> {
  if (params.groupSlug) {
    return useQuery(
      groupFieldDetailOptions(
        params.tableSlug,
        params.groupSlug,
        params.fieldId,
      ),
    );
  }
  return useQuery(fieldDetailOptions(params.tableSlug, params.fieldId));
}
