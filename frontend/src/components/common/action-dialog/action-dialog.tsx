import { useMutation } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LoaderCircleIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

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
import { handleApiError } from '@/lib/handle-api-error';
import type { Merge } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';

export type ActionDialogConfig = {
  mutationFn: () => Promise<void>;
  invalidateKeys: Array<QueryKey>;
  toast: { title: string; description: string };
  navigation?: { to: string; search: Record<string, unknown> };
  errorContext: string;
  title: string;
  description: string;
  testId: string;
  confirmTestId?: string;
  cancelTestId?: string;
};

export type ActionDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    config: ActionDialogConfig;
  }
>;

export function ActionDialog({
  config,
  ...props
}: ActionDialogProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: config.mutationFn,
    onSuccess() {
      setOpen(false);

      for (const key of config.invalidateKeys) {
        QueryClient.invalidateQueries({ queryKey: key });
      }

      toast.success(config.toast.title, {
        description: config.toast.description,
      });

      if (config.navigation) {
        navigate({
          to: config.navigation.to,
          replace: true,
          // @ts-expect-error navigate nao tipa search com `to` dinamico (string)
          search: config.navigation.search,
        });
      }
    },
    onError(error) {
      handleApiError(error, { context: config.errorContext });
    },
  });

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger {...props} />
      <DialogContent
        className="py-4 px-6"
        data-test-id={config.testId}
      >
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <section>
          <form className="pt-4 pb-2">
            <DialogFooter className="inline-flex w-full gap-2 justify-end">
              <DialogClose asChild>
                <Button
                  className="bg-destructive hover:bg-destructive"
                  data-test-id={config.cancelTestId}
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                data-test-id={config.confirmTestId}
                disabled={mutation.status === 'pending'}
                onClick={() => {
                  mutation.mutateAsync();
                }}
              >
                {mutation.status === 'pending' && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                {!(mutation.status === 'pending') && <span>Confirmar</span>}
              </Button>
            </DialogFooter>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}
