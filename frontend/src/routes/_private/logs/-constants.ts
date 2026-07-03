import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';

import { E_LOGGER_ACTION_TYPE, E_LOGGER_OBJECT_TYPE } from '@/lib/constant';
import type { ValueOf } from '@/lib/interfaces';

export const ROUTE_ID = '/_private/logs/';

export type ActionType = ValueOf<typeof E_LOGGER_ACTION_TYPE>;
export type ObjectType = ValueOf<typeof E_LOGGER_OBJECT_TYPE>;

export const ACTION_OPTIONS = Object.values(E_LOGGER_ACTION_TYPE);
export const OBJECT_OPTIONS = Object.values(E_LOGGER_OBJECT_TYPE);

export const ACTION_META: Record<
  ActionType,
  { icon: typeof PlusIcon; className: string }
> = {
  CREATE: { icon: PlusIcon, className: 'bg-green-100 text-green-700' },
  UPDATE: { icon: PencilIcon, className: 'bg-yellow-100 text-yellow-700' },
  VIEW: { icon: EyeIcon, className: 'bg-blue-100 text-blue-700' },
  DELETE: { icon: TrashIcon, className: 'bg-red-100 text-red-700' },
};

export interface FiltersState {
  search: string;
  actions: Array<ActionType>;
  objects: Array<ObjectType>;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: FiltersState = {
  search: '',
  actions: [],
  objects: [],
  dateFrom: '',
  dateTo: '',
};

export function parseCsvList<T extends string>(
  raw: string | undefined,
  whitelist: ReadonlyArray<T>,
): Array<T> {
  if (!raw) return [];
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token): token is T =>
      whitelist.some((allowed) => allowed === token),
    );
}
