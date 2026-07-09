import { LoaderCircleIcon } from 'lucide-react';
import type * as React from 'react';

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
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import type { Merge } from '@/lib/interfaces';

export type ConfirmDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    title: string;
    description: string;
    isPending: boolean;
    onConfirm: (close: () => void) => void;
    confirmLabel?: string;
    cancelLabel?: string;
    icon?: React.ReactNode;
    testId?: string;
    confirmTestId?: string;
    cancelTestId?: string;
  }
>;

export function ConfirmDialog({
  ref,
  title,
  description,
  isPending,
  onConfirm,
  confirmLabel,
  cancelLabel,
  icon,
  testId,
  confirmTestId,
  cancelTestId,
  ...rest
}: ConfirmDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();
  const resolvedConfirmLabel = confirmLabel ?? 'Sair';
  const resolvedCancelLabel = cancelLabel ?? 'Cancelar';

  function handleConfirm(): void {
    if (isPending) return;
    onConfirm(close);
  }

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        className="py-4 px-6"
        data-test-id={testId}
      >
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
          <DialogClose asChild>
            <Button
              ref={closeRef}
              variant="outline"
              disabled={isPending}
              data-test-id={cancelTestId}
            >
              {resolvedCancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
            data-test-id={confirmTestId}
          >
            {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
            {!isPending && <span>{resolvedConfirmLabel}</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
