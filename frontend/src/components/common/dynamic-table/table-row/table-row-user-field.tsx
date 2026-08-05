import * as React from 'react';

import { splitVisibleChips } from './table-row-chips-limit';
import { TableRowFieldLabel } from './table-row-field-label';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Field, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_USER_STATUS } from '@/lib/constant';
import type { IField, IUser } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

type TableRowUserFieldProps = {
  field: IField;
  disabled?: boolean;
};

type UserOption = {
  value: string;
  label: string;
};

export function TableRowUserField({
  field,
  disabled,
}: TableRowUserFieldProps): React.JSX.Element {
  const formField = useFieldContext<Array<UserOption>>();
  let fieldValue: Array<UserOption> = [];
  if (Array.isArray(formField.state.value)) fieldValue = formField.state.value;
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;
  const isMultiple = field.multiple;
  const anchorRef = useComboboxAnchor();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [selectedCache, setSelectedCache] = React.useState<Map<string, IUser>>(
    () => new Map(),
  );

  // Debounce search query
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

  React.useEffect(() => {
    if (!fieldValue.length) return;
    setSelectedCache((prev) => {
      const next = new Map(prev);
      fieldValue.forEach((opt) => {
        if (next.has(opt.value)) return;
        const stubUser: IUser = {
          _id: opt.value,
          name: opt.label,
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
        next.set(opt.value, stubUser);
      });
      return next;
    });
  }, [fieldValue]);

  const selectedUsers = React.useMemo(() => {
    return fieldValue.map((opt) => {
      const cached = selectedCache.get(opt.value);
      const fromList = users.find((user) => user._id === opt.value);
      if (cached) return cached;
      if (fromList) return fromList;
      const fallbackUser: IUser = {
        _id: opt.value,
        name: opt.label,
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
      return fallbackUser;
    });
  }, [fieldValue, selectedCache, users]);

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
  }, [selectedUsers, selectedCache, users]);

  const handleValueChange = (newValue: IUser | Array<IUser> | null): void => {
    if (isMultiple) {
      let userList: Array<IUser> = [];
      if (Array.isArray(newValue)) {
        userList = newValue;
      }

      if (userList.length > 0) {
        setSelectedCache((prev) => {
          const next = new Map(prev);
          for (const user of userList) {
            next.set(user._id, user);
          }
          return next;
        });
      }

      const newValues: Array<UserOption> = userList.map((user) => ({
        value: user._id,
        label: user.name,
      }));
      formField.handleChange(newValues);

      if (
        userList.length > fieldValue.length &&
        searchQuery.trim().length > 0
      ) {
        setSearchQuery('');
        setDebouncedQuery('');
      }
      return;
    }

    let single: IUser | null = null;
    if (newValue !== null && !Array.isArray(newValue)) {
      single = newValue;
    }

    if (single === null) {
      formField.handleChange([]);
      return;
    }

    const picked = single;
    setSelectedCache((prev) => {
      const next = new Map(prev);
      next.set(picked._id, picked);
      return next;
    });
    formField.handleChange([
      {
        value: picked._id,
        label: picked.name,
      },
    ]);
  };

  if (isMultiple) {
    return (
      <Field
        data-slot="table-row-user-field"
        data-test-id="table-row-user-select"
        data-invalid={isInvalid}
      >
        <TableRowFieldLabel
          field={field}
          htmlFor={formField.name}
        />
        <div className="relative">
          <Combobox
            data-test-id="table-row-user-select"
            items={items}
            multiple
            value={selectedUsers}
            onValueChange={handleValueChange}
            inputValue={searchQuery}
            onInputValueChange={setSearchQuery}
            itemToStringLabel={(user: IUser) => user.name}
            disabled={disabled}
          >
            <ComboboxChips
              ref={anchorRef}
              className={cn(isInvalid && 'border-destructive')}
            >
              <ComboboxValue>
                {(selectedValues: Array<IUser>): React.ReactNode => {
                  let chipsPlaceholder = `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`;
                  if (selectedValues.length > 0) {
                    chipsPlaceholder = '';
                  }
                  const { visible, hiddenCount } = splitVisibleChips(
                    selectedValues,
                    field.visibleChipsLimit,
                  );
                  return (
                    <React.Fragment>
                      {visible.map((user) => (
                        <ComboboxChip
                          key={user._id}
                          aria-label={user.name}
                        >
                          {user.name}
                        </ComboboxChip>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                          +{hiddenCount}
                        </span>
                      )}
                      <ComboboxChipsInput placeholder={chipsPlaceholder} />
                    </React.Fragment>
                  );
                }}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchorRef}>
              <ComboboxEmpty>Nenhum usuário encontrado</ComboboxEmpty>
              {isLoading && (
                <div className="flex items-center justify-center p-3">
                  <Spinner className="opacity-50" />
                </div>
              )}
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
            </ComboboxContent>
          </Combobox>
          {isLoading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Spinner className="opacity-50" />
            </div>
          )}
        </div>
        {isInvalid && (
          <FieldError
            id={errorId}
            errors={formField.state.meta.errors}
          />
        )}
      </Field>
    );
  }

  return (
    <Field
      data-slot="table-row-user-field"
      data-test-id="table-row-user-select"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <div className="relative">
        <Combobox
          data-test-id="table-row-user-select"
          items={items}
          value={selectedUsers[0] ?? null}
          onValueChange={handleValueChange}
          inputValue={searchQuery}
          onInputValueChange={setSearchQuery}
          itemToStringLabel={(user: IUser) => user.name}
          disabled={disabled}
        >
          <ComboboxInput
            placeholder={
              fieldValue[0]?.label ||
              `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`
            }
            showClear={fieldValue.length > 0}
            className={cn(isInvalid && 'border-destructive')}
          />
          <ComboboxContent>
            <ComboboxEmpty>Nenhum usuário encontrado</ComboboxEmpty>
            {isLoading && (
              <div className="flex items-center justify-center p-3">
                <Spinner className="opacity-50" />
              </div>
            )}
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
          </ComboboxContent>
        </Combobox>
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Spinner className="opacity-50" />
          </div>
        )}
      </div>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
