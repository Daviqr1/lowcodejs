import { ListTreeIcon } from 'lucide-react';
import * as React from 'react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMenuReadList } from '@/hooks/tanstack-query/use-menu-read-list';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IMenu } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

interface FieldMenuPositionSelectProps {
  label: string;
  parentId?: string;
  disabled?: boolean;
  excludeId?: string;
  required?: boolean;
}

function getParentId(menu: IMenu): string | null {
  if (!menu.parent) return null;
  if (typeof menu.parent === 'string') return menu.parent;
  return menu.parent._id;
}

function sortByPosition(menus: Array<IMenu>): Array<IMenu> {
  return [...menus].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

function getDescendantIds(menus: Array<IMenu>, rootId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    for (const menu of menus) {
      if (getParentId(menu) === currentId && !descendants.has(menu._id)) {
        descendants.add(menu._id);
        queue.push(menu._id);
      }
    }
  }

  return descendants;
}

export function FieldMenuPositionSelect({
  label,
  parentId,
  disabled,
  excludeId,
  required,
}: FieldMenuPositionSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const { data: menus, status } = useMenuReadList();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  const siblings = React.useMemo(() => {
    if (!menus) return [];

    const excludedIds = new Set<string>();
    if (excludeId) {
      excludedIds.add(excludeId);
      for (const descendantId of getDescendantIds(menus, excludeId)) {
        excludedIds.add(descendantId);
      }
    }

    return sortByPosition(
      menus.filter((menu) => {
        if (excludedIds.has(menu._id)) return false;
        return getParentId(menu) === (parentId || null);
      }),
    );
  }, [excludeId, menus, parentId]);

  const options = React.useMemo(() => {
    let firstValue = '0';
    if (parentId) firstValue = '1';
    const items = [{ value: firstValue, label: 'Primeiro item' }];

    siblings.forEach((menu, index) => {
      let value = String(index + 1);
      if (parentId) value = String(index + 2);
      items.push({
        value,
        label: 'Depois de '.concat(menu.name),
      });
    });

    return items;
  }, [parentId, siblings]);

  React.useEffect(() => {
    if (
      field.state.value &&
      options.some((option) => option.value === field.state.value)
    ) {
      return;
    }

    let positionFallback = '0';
    if (parentId) positionFallback = '1';
    field.handleChange(options[options.length - 1]?.value ?? positionFallback);
  }, [field, options, parentId]);

  return (
    <Field
      data-slot="field-menu-position-select"
      data-test-id="field-menu-position-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Select
        data-test-id="field-menu-position-select"
        disabled={disabled || status === 'pending'}
        value={field.state.value}
        aria-label={label}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder="Selecione a posição" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              <span className="inline-flex items-center gap-2">
                <ListTreeIcon className="size-4 text-muted-foreground" />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
