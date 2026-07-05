import { EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import type { EntryFormValues, IPasswordEntry } from './senhas-types';
import { useCreateEntry, useUpdateEntry } from './use-senhas';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { handleApiError } from '@/lib/handle-api-error';

type EntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  entry?: IPasswordEntry | null;
};

function emptyValues(): EntryFormValues {
  return { title: '', username: '', url: '', secret: '', notes: '' };
}

const PASSWORD_ALPHABET =
  'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?';

function generatePassword(length = 20): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += PASSWORD_ALPHABET[values[i] % PASSWORD_ALPHABET.length];
  }
  return result;
}

export function EntryDialog({
  open,
  onOpenChange,
  channelId,
  entry,
}: EntryDialogProps): React.JSX.Element {
  const isEdit = Boolean(entry);
  const [values, setValues] = React.useState<EntryFormValues>(emptyValues);
  const [reveal, setReveal] = React.useState(false);

  const createMutation = useCreateEntry(channelId);
  const updateMutation = useUpdateEntry(channelId);
  const pending = createMutation.isPending || updateMutation.isPending;

  React.useEffect(() => {
    if (!open) return;
    setReveal(false);
    if (entry) {
      setValues({
        title: entry.title,
        username: entry.username ?? '',
        url: entry.url ?? '',
        secret: entry.secret,
        notes: entry.notes ?? '',
      });
    } else {
      setValues(emptyValues());
    }
  }, [open, entry]);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!values.title.trim()) {
      toast.error('Informe o título');
      return;
    }
    if (!values.secret) {
      toast.error('Informe a senha');
      return;
    }

    if (isEdit && entry) {
      updateMutation.mutate(
        { entryId: entry._id, values },
        {
          onSuccess: () => {
            toast.success('Senha atualizada');
            onOpenChange(false);
          },
          onError: (error) =>
            handleApiError(error, { context: 'Erro ao atualizar senha' }),
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Senha criada');
        onOpenChange(false);
      },
      onError: (error) =>
        handleApiError(error, { context: 'Erro ao criar senha' }),
    });
  }

  let secretInputType: 'text' | 'password' = 'password';
  if (reveal) secretInputType = 'text';
  let revealTitle = 'Revelar';
  if (reveal) revealTitle = 'Ocultar';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit && 'Editar senha'}
              {!isEdit && 'Nova senha'}
            </DialogTitle>
            <DialogDescription>
              O segredo é criptografado antes de ser salvo no banco.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entry-title">Título</Label>
              <Input
                id="entry-title"
                value={values.title}
                onChange={(e) =>
                  setValues((v) => ({ ...v, title: e.target.value }))
                }
                placeholder="Ex.: AWS Console"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-username">Usuário / login</Label>
              <Input
                id="entry-username"
                value={values.username}
                onChange={(e) =>
                  setValues((v) => ({ ...v, username: e.target.value }))
                }
                placeholder="Opcional"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-url">URL</Label>
              <Input
                id="entry-url"
                value={values.url}
                onChange={(e) =>
                  setValues((v) => ({ ...v, url: e.target.value }))
                }
                placeholder="Opcional (https://...)"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-secret">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="entry-secret"
                  type={secretInputType}
                  value={values.secret}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, secret: e.target.value }))
                  }
                  autoComplete="new-password"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={revealTitle}
                  onClick={() => setReveal((r) => !r)}
                >
                  {reveal && <EyeOffIcon />}
                  {!reveal && <EyeIcon />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Gerar senha forte"
                  onClick={() => {
                    setValues((v) => ({ ...v, secret: generatePassword() }));
                    setReveal(true);
                  }}
                >
                  <RefreshCwIcon />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-notes">Anotações</Label>
              <Textarea
                id="entry-notes"
                value={values.notes}
                onChange={(e) =>
                  setValues((v) => ({ ...v, notes: e.target.value }))
                }
                placeholder="Opcional — também criptografado"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
            >
              {isEdit && 'Salvar'}
              {!isEdit && 'Criar senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
