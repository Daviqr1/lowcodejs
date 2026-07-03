import { LoaderCircleIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  testId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
};

export function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
  const confirmLabel = props.confirmLabel ?? 'Sair';
  const cancelLabel = props.cancelLabel ?? 'Cancelar';

  function handleConfirm(): void {
    if (props.isPending) return;
    props.onConfirm();
  }

  return (
    <Dialog
      modal
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <DialogContent
        className="py-4 px-6"
        data-test-id={props.testId}
      >
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            {props.icon}
            {props.title}
          </DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={props.isPending}
              data-test-id={props.cancelTestId}
            >
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={props.isPending}
            onClick={handleConfirm}
            data-test-id={props.confirmTestId}
          >
            {props.isPending && (
              <LoaderCircleIcon className="size-4 animate-spin" />
            )}
            {!props.isPending && <span>{confirmLabel}</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
