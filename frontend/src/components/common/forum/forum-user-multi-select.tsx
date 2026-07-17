import React from 'react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import { E_USER_STATUS } from '@/lib/constant';
import type { IUser } from '@/lib/interfaces';

type ForumUserMultiSelectProps = {
  value: Array<string>;
  onChange: (value: Array<string>) => void;
  onSelectedUsersChange?: (users: Array<IUser>) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ForumUserMultiSelect({
  value,
  onChange,
  onSelectedUsersChange,
  disabled,
  placeholder,
}: ForumUserMultiSelectProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const anchorRef = useComboboxAnchor();
  const [selectedCache, setSelectedCache] = React.useState<Map<string, IUser>>(
    () => new Map(),
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useUserReadPaginatedInfinite({
      perPage: 10,
      search: debouncedQuery || undefined,
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

  const selectedUsers = React.useMemo(
    () =>
      value
        .map((id) => selectedCache.get(id))
        .filter((item): item is IUser => Boolean(item)),
    [selectedCache, value],
  );

  const items = React.useMemo(() => {
    if (!selectedUsers.length) return users;
    const userIds = new Set(users.map((user) => user._id));
    const extras = selectedUsers.filter((user) => !userIds.has(user._id));
    if (extras.length) {
      return [...users, ...extras];
    }
    return users;
  }, [selectedUsers, users]);

  return (
    <Combobox
      data-slot="forum-user-multi-select"
      data-test-id="forum-user-multi-select"
      items={items}
      multiple
      value={selectedUsers}
      onValueChange={(selected) => {
        setSelectedCache((prev) => {
          const next = new Map(prev);
          selected.forEach((user) => next.set(user._id, user));
          return next;
        });
        onChange(selected.map((user) => user._id));
        onSelectedUsersChange?.(selected);
      }}
      inputValue={searchQuery}
      onInputValueChange={setSearchQuery}
      itemToStringLabel={(user: IUser) => user.name}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        <ComboboxValue>
          {(values: Array<IUser>): React.ReactNode => (
            <React.Fragment>
              {values.slice(0, 3).map((user) => (
                <ComboboxChip
                  key={user._id}
                  aria-label={user.name}
                >
                  {user.name}
                </ComboboxChip>
              ))}
              {values.length > 3 && (
                <span className="text-muted-foreground text-xs">
                  +{values.length - 3}
                </span>
              )}
              <ComboboxChipsInput
                placeholder={((): string => {
                  if (values.length > 0) {
                    return '';
                  }
                  return placeholder ?? 'Mencionar usuarios';
                })()}
              />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhum usuário encontrado</ComboboxEmpty>
        {!isLoading && (
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
        {isLoading && (
          <div className="p-3">
            <Skeleton className="h-6 w-full" />
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
