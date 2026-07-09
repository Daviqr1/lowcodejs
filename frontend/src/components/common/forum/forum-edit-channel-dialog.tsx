import { useStore } from '@tanstack/react-store';
import type * as React from 'react';

import { ForumUserMultiSelect } from './forum-user-multi-select';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { Merge } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

// withForm dá o `form` tipado (shape { label, description, privacy, members }
// conhecido) — store e AppField inferem, eliminando `any`/`as`. defaultValues/
// props só p/ type-check; os valores reais vêm do useAppForm do caller.
type ForumEditChannelValues = {
  label: string;
  description: string;
  privacy: string;
  members: Array<string>;
};

type ForumEditChannelProps = Merge<
  Omit<React.ComponentProps<typeof DialogTrigger>, 'form'>,
  {
    isPending: boolean;
    labelValue: string;
    requiresMembers: boolean;
    requiresPrivacy: boolean;
    closeRef?: React.RefObject<HTMLButtonElement | null>;
  }
>;

const EDIT_CHANNEL_DEFAULT_VALUES: ForumEditChannelValues = {
  label: '',
  description: '',
  privacy: 'publico',
  members: [],
};

const EDIT_CHANNEL_DEFAULT_PROPS: ForumEditChannelProps = {
  isPending: false,
  labelValue: '',
  requiresMembers: false,
  requiresPrivacy: false,
};

export const ForumEditChannelDialog = withForm({
  defaultValues: EDIT_CHANNEL_DEFAULT_VALUES,
  props: EDIT_CHANNEL_DEFAULT_PROPS,
  render: function Render({
    form,
    ref,
    isPending,
    labelValue,
    requiresMembers,
    requiresPrivacy,
    closeRef,
    ...rest
  }): React.JSX.Element {
    const privacyValue = useStore(form.store, (state) => state.values.privacy);
    let normalizedPrivacy = 'publico';
    if (typeof privacyValue === 'string') {
      normalizedPrivacy = privacyValue;
    }
    const shouldShowMembers =
      requiresMembers && (!requiresPrivacy || normalizedPrivacy === 'privado');

    return (
      <Dialog modal={false}>
        <DialogTrigger
          {...rest}
          ref={ref}
        />
        <DialogContent
          className="sm:max-w-md"
          data-slot="forum-edit-channel-dialog"
          data-test-id="forum-edit-channel-dialog"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Editar canal</DialogTitle>
              <DialogDescription>
                Atualize o nome e a descrição do canal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <form.AppField name="label">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Nome do canal"
                    autoFocus
                  />
                )}
              </form.AppField>
              <form.AppField name="description">
                {(field) => (
                  <Textarea
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Descrição (opcional)"
                    className="min-h-[96px]"
                  />
                )}
              </form.AppField>
              {(requiresPrivacy || shouldShowMembers) && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {requiresPrivacy && (
                    <div
                      className={cn(
                        shouldShowMembers &&
                          'sm:basis-1/4 sm:grow-0 sm:shrink-0',
                        !shouldShowMembers && 'w-full',
                      )}
                    >
                      <form.AppField name="privacy">
                        {(field) => (
                          <Select
                            value={((): string => {
                              if (typeof field.state.value === 'string') {
                                return field.state.value;
                              }
                              return 'publico';
                            })()}
                            onValueChange={(value) => {
                              field.handleChange(value);
                              if (value !== 'privado') {
                                form.setFieldValue('members', []);
                              }
                              field.handleBlur();
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Privacidade do canal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="publico">Público</SelectItem>
                              <SelectItem value="privado">Privado</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </form.AppField>
                    </div>
                  )}
                  {shouldShowMembers && (
                    <div className="sm:basis-3/4 sm:grow-0 sm:shrink-0">
                      <form.AppField name="members">
                        {(field) => (
                          <ForumUserMultiSelect
                            value={((): Array<string> => {
                              if (Array.isArray(field.state.value)) {
                                return field.state.value;
                              }
                              return [];
                            })()}
                            onChange={(value) => field.handleChange(value)}
                            disabled={isPending}
                            placeholder="Selecione membros"
                          />
                        )}
                      </form.AppField>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="mt-3 flex gap-2 sm:justify-end">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!labelValue.trim() || isPending}
              >
                {isPending && <Spinner />}
                <span>Salvar</span>
              </Button>
            </DialogFooter>
          </form>
          <DialogClose
            ref={closeRef}
            className="hidden"
          />
        </DialogContent>
      </Dialog>
    );
  },
});
