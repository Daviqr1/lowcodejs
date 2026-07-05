import * as React from 'react';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_USER_STATUS } from '@/lib/constant';
import type { IUser } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type TableFieldUserDefaultValueProps = {
  label?: string;
  disabled?: boolean;
};

export function TableFieldUserDefaultValue({
  label = 'Valor padrão',
  disabled,
}: TableFieldUserDefaultValueProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const value = field.state.value ?? '';

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

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

  const selectedUser = React.useMemo(() => {
    if (!value) return null;
    return users.find((u) => u._id === value) ?? null;
  }, [value, users]);

  const handleValueChange = (newValue: IUser | null): void => {
    if (newValue) {
      field.handleChange(newValue._id);
    } else {
      field.handleChange('');
    }
    field.handleBlur();
  };

  return (
    <Field
      data-slot="table-field-user-default-value"
      data-test-id="table-field-user-default-value"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <div className="relative">
        <Combobox
          data-test-id="table-field-user-default-value-combobox"
          items={users}
          value={selectedUser}
          onValueChange={handleValueChange}
          inputValue={searchQuery}
          onInputValueChange={setSearchQuery}
          itemToStringLabel={(user: IUser) => user.name}
          disabled={disabled}
        >
          <ComboboxInput
            placeholder={selectedUser?.name ?? 'Sem valor padrão'}
            showClear={!!value}
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
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
