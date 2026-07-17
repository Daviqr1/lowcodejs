import * as React from 'react';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import { E_USER_STATUS } from '@/lib/constant';
import type { IUser } from '@/lib/interfaces';

type UserMultiSelectProps = {
  value?: Array<string>;
  onValueChange?: (value: Array<string>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function UserMultiSelect({
  value = [],
  onValueChange,
  placeholder = 'Selecione administradores...',
  className,
  disabled = false,
}: UserMultiSelectProps): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const anchorRef = useComboboxAnchor();
  const [selectedCache, setSelectedCache] = React.useState<Map<string, IUser>>(
    () => new Map(),
  );

  const { data, status, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useUserReadPaginatedInfinite({
      perPage: 10,
      search: search || undefined,
      status: E_USER_STATUS.ACTIVE,
    });

  const users = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  React.useEffect(() => {
    if (!users.length) return;
    setSelectedCache((prev) => {
      const next = new Map(prev);
      users.forEach((user) => next.set(user._id, user));
      return next;
    });
  }, [users]);

  // Map selected IDs to user objects (fallback to label stub)
  const selectedUsers = React.useMemo<Array<IUser>>(() => {
    return value.map((id) => {
      const cached = selectedCache.get(id);
      if (cached) return cached;
      const fromList = users.find((user) => user._id === id);
      if (fromList) return fromList;
      const stubUser: IUser = {
        _id: id,
        name: id,
        email: '',
        password: '',
        status: E_USER_STATUS.ACTIVE,
        group: {
          _id: '',
          name: '',
          slug: '',
          description: null,
          permissions: [],
          encompasses: [],
          createdAt: '',
          updatedAt: null,
          trashedAt: null,
          trashed: false,
        },
        groups: [],
        notificationsEnabled: true,
        createdAt: '',
        updatedAt: null,
        trashedAt: null,
        trashed: false,
      };
      return stubUser;
    });
  }, [selectedCache, users, value]);

  const items = React.useMemo(() => {
    const cachedUsers = users.map(
      (user) => selectedCache.get(user._id) ?? user,
    );
    const userIds = new Set(cachedUsers.map((user) => user._id));
    const extras = selectedUsers.filter((user) => !userIds.has(user._id));
    if (extras.length) {
      return [...cachedUsers, ...extras];
    }
    return cachedUsers;
  }, [selectedCache, selectedUsers, users]);

  const handleMultipleChange = (selected: Array<IUser>): void => {
    if (selected.length > 0) {
      setSelectedCache((prev) => {
        const next = new Map(prev);
        for (const user of selected) {
          next.set(user._id, user);
        }
        return next;
      });
    }
    onValueChange?.(selected.map((user) => user._id));
    if (selected.length > value.length && search.trim().length > 0) {
      setSearch('');
    }
  };

  return (
    <Combobox
      data-slot="user-multi-select"
      data-test-id="user-multi-select"
      items={items}
      multiple
      value={selectedUsers}
      onValueChange={handleMultipleChange}
      inputValue={search}
      onInputValueChange={setSearch}
      itemToStringLabel={(user: IUser) => user.name}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchorRef}
        className={className}
      >
        <ComboboxValue>
          {(selectedValue: Array<IUser>): React.ReactNode => {
            let chipsPlaceholder = placeholder;
            if (selectedValue.length > 0) {
              chipsPlaceholder = '';
            }
            return (
              <React.Fragment>
                {selectedValue.map((user) => (
                  <ComboboxChip
                    key={user._id}
                    aria-label={user.name}
                  >
                    {user.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={chipsPlaceholder} />
              </React.Fragment>
            );
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhum usuário encontrado.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="text-muted-foreground p-3 text-center text-sm">
            Carregando...
          </div>
        )}
        {status !== 'pending' && (
          <React.Fragment>
            <ComboboxList>
              {(user: IUser): React.ReactNode => (
                <ComboboxItem
                  key={user._id}
                  value={user}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {user.email}
                    </span>
                  </div>
                </ComboboxItem>
              )}
            </ComboboxList>
            <ComboboxLoadMore
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
            />
          </React.Fragment>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
