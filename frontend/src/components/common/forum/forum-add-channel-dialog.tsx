import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import React from 'react';

import { ForumUserMultiSelect } from './forum-user-multi-select';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils';

interface ForumAddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // form do useAppForm: shape concreto desconhecido neste boundary reutilizável.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  isPending: boolean;
  labelValue: string;
  requiresMembers: boolean;
  requiresPrivacy: boolean;
  onCancel: () => void;
}

export function ForumAddChannelDialog({
  open,
  onOpenChange,
  form,
  isPending,
  labelValue,
  requiresMembers,
  requiresPrivacy,
  onCancel,
}: ForumAddChannelDialogProps): React.JSX.Element {
  const privacyValue = useStore(form.store, (state: unknown) => {
    // form é any (shape do useAppForm desconhecido); assumimos o contrato do form.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const s = state as { values: { privacy?: unknown } };
    return s.values.privacy;
  });
  let normalizedPrivacy = 'publico';
  if (typeof privacyValue === 'string') {
    normalizedPrivacy = privacyValue;
  }
  const shouldShowMembers =
    requiresMembers && (!requiresPrivacy || normalizedPrivacy === 'privado');

  return (
    <Dialog
      data-slot="forum-add-channel-dialog"
      data-test-id="forum-add-channel-dialog"
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo canal</DialogTitle>
            <DialogDescription>
              Crie um canal para organizar as mensagens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <form.AppField name="label">
              {(field: AnyFieldApi) => (
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
              {(field: AnyFieldApi) => (
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
                      shouldShowMembers && 'sm:basis-1/4 sm:grow-0 sm:shrink-0',
                      !shouldShowMembers && 'w-full',
                    )}
                  >
                    <form.AppField name="privacy">
                      {(field: AnyFieldApi) => (
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
                      {(field: AnyFieldApi) => (
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
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!labelValue.trim() || isPending}
            >
              {isPending && <Spinner />}
              <span>Criar</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
