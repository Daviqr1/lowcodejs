import { LockIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { MemberMultiSelect } from './member-multi-select';
import type {
  ChannelFormValues,
  IPasswordChannel,
  IPasswordUserRef,
} from './senhas-types';
import { refId } from './senhas-types';
import { useCreateChannel, useUpdateChannel } from './use-senhas';

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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { handleApiError } from '@/lib/handle-api-error';
import type { Merge } from '@/lib/interfaces';

type ChannelDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    channel?: IPasswordChannel | null;
  }
>;

function emptyValues(): ChannelFormValues {
  return { name: '', description: '', private: true, members: [] };
}

export function ChannelDialog({
  ref,
  channel,
  ...rest
}: ChannelDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();
  const isEdit = Boolean(channel);
  const [values, setValues] = React.useState<ChannelFormValues>(() => {
    if (channel) {
      return {
        name: channel.name,
        description: channel.description ?? '',
        private: channel.private,
        members: channel.members.map(refId),
      };
    }
    return emptyValues();
  });

  const createMutation = useCreateChannel();
  const updateMutation = useUpdateChannel();
  const pending = createMutation.isPending || updateMutation.isPending;

  // Membros já salvos (objetos com nome/email) para semear o multi-select.
  const initialMembers = React.useMemo<Array<IPasswordUserRef>>(
    () =>
      (channel?.members ?? []).filter(
        (m): m is IPasswordUserRef => typeof m !== 'string',
      ),
    [channel],
  );

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!values.name.trim()) {
      toast.error('Informe o nome do canal');
      return;
    }

    if (isEdit && channel) {
      updateMutation.mutate(
        { channelId: channel._id, values },
        {
          onSuccess: () => {
            toast.success('Canal atualizado');
            close();
          },
          onError: (error) =>
            handleApiError(error, { context: 'Erro ao atualizar canal' }),
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Canal criado');
        close();
      },
      onError: (error) =>
        handleApiError(error, { context: 'Erro ao criar canal' }),
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit && 'Editar canal'}
              {!isEdit && 'Novo canal'}
            </DialogTitle>
            <DialogDescription>
              Canais agrupam senhas e controlam quem tem acesso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Nome</Label>
              <Input
                id="channel-name"
                value={values.name}
                onChange={(e) =>
                  setValues((v) => ({ ...v, name: e.target.value }))
                }
                placeholder="Ex.: Infraestrutura"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-description">Descrição</Label>
              <Textarea
                id="channel-description"
                value={values.description}
                onChange={(e) =>
                  setValues((v) => ({ ...v, description: e.target.value }))
                }
                placeholder="Opcional"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <LockIcon className="size-4" />
                  <Label htmlFor="channel-private">Canal privado</Label>
                </div>
                <p className="text-muted-foreground text-xs">
                  Privado: só membros veem. Público: qualquer usuário
                  autenticado pode visualizar.
                </p>
              </div>
              <Switch
                id="channel-private"
                checked={values.private}
                onCheckedChange={(checked) =>
                  setValues((v) => ({ ...v, private: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Membros</Label>
              <MemberMultiSelect
                value={values.members}
                onChange={(members) => setValues((v) => ({ ...v, members }))}
                initialUsers={initialMembers}
                placeholder="Adicionar membros"
              />
              <p className="text-muted-foreground text-xs">
                Membros podem ver e editar as senhas do canal. Você (dono) já
                tem acesso total.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                ref={closeRef}
                type="button"
                variant="outline"
                disabled={pending}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
            >
              {isEdit && 'Salvar'}
              {!isEdit && 'Criar canal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
