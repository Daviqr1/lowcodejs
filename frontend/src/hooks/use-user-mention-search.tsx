import { useCallback } from 'react';

import type {
  MentionPage,
  ResolveMentionPage,
} from '@/components/common/rich-editor/bubble/mention-list';
import { API } from '@/lib/api';
import { E_USER_STATUS } from '@/lib/constant';
import type { IUser, Paginated } from '@/lib/interfaces';

export type UseUserMentionSearch = {
  resolvePage: ResolveMentionPage;
};

export function useUserMentionSearch(): UseUserMentionSearch {
  const resolvePage = useCallback(
    async (query: string, page: number): Promise<MentionPage> => {
      const trimmed = query.trim();
      const params: Record<string, unknown> = {
        page,
        perPage: 10,
        status: E_USER_STATUS.ACTIVE,
      };
      if (trimmed.length > 0) params.search = trimmed;
      const response = await API.get<Paginated<IUser>>('/users/paginated', {
        params,
      });
      const items = response.data.data.map(
        (user): { id: string; label: string; email: string } => ({
          id: String(user._id ?? ''),
          label: user.name || user.email || 'Usuário',
          email: user.email,
        }),
      );
      const hasMore = page < response.data.meta.lastPage;
      return { items, hasMore };
    },
    [],
  );

  return { resolvePage };
}
