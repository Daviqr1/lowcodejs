import {
  LoaderCircleIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import React from 'react';

import { useMathCaptcha } from './use-math-captcha';

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
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import type { Merge } from '@/lib/interfaces';

type PermanentDeleteContentProps = {
  title: string;
  description: string;
  itemsCount: number;
  isPending: boolean;
  onConfirm: (close: () => void) => void;
  confirmLabel?: string;
  close: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
};

export type PermanentDeleteConfirmDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  Merge<
    Omit<PermanentDeleteContentProps, 'close' | 'closeRef'>,
    { testId?: string }
  >
>;

export function PermanentDeleteConfirmDialog({
  ref,
  title,
  description,
  itemsCount,
  isPending,
  onConfirm,
  confirmLabel,
  testId,
  ...rest
}: PermanentDeleteConfirmDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

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
        <PermanentDeleteBody
          title={title}
          description={description}
          itemsCount={itemsCount}
          isPending={isPending}
          onConfirm={onConfirm}
          confirmLabel={confirmLabel}
          close={close}
          closeRef={closeRef}
        />
      </DialogContent>
    </Dialog>
  );
}

function PermanentDeleteBody({
  title,
  description,
  itemsCount,
  isPending,
  onConfirm,
  confirmLabel,
  close,
  closeRef,
}: PermanentDeleteContentProps): React.JSX.Element {
  const captcha = useMathCaptcha();
  const [answer, setAnswer] = React.useState('');

  const trimmed = answer.trim();
  const isCaptchaValid =
    trimmed.length > 0 && Number(trimmed) === captcha.expected;
  const resolvedConfirmLabel = confirmLabel ?? 'Excluir permanentemente';

  function handleRegenerate(): void {
    captcha.regenerate();
    setAnswer('');
  }

  function handleConfirm(): void {
    if (!isCaptchaValid) return;
    if (isPending) return;
    onConfirm(close);
  }

  return (
    <React.Fragment>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive flex gap-2 items-start">
        <TriangleAlertIcon className="size-5 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 text-sm">
          <strong>Esta ação não pode ser desfeita.</strong>
          {itemsCount > 0 && (
            <span>
              {itemsCount === 1 && '1 item será excluído permanentemente.'}
              {itemsCount > 1 && (
                <React.Fragment>
                  {itemsCount} itens serão excluídos permanentemente.
                </React.Fragment>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="permanent-delete-captcha">
          Para confirmar, responda: {captcha.question}
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            id="permanent-delete-captcha"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Digite a resposta"
            disabled={isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRegenerate}
            disabled={isPending}
            aria-label="Gerar nova pergunta"
            title="Gerar nova pergunta"
          >
            <RefreshCwIcon className="size-4" />
          </Button>
        </div>
      </div>

      <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
        <DialogClose asChild>
          <Button
            ref={closeRef}
            variant="outline"
            disabled={isPending}
            data-test-id="permanent-delete-cancel"
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="button"
          variant="destructive"
          disabled={!isCaptchaValid || isPending}
          onClick={handleConfirm}
          data-test-id="permanent-delete-confirm"
        >
          {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
          {!isPending && <span>{resolvedConfirmLabel}</span>}
        </Button>
      </DialogFooter>
    </React.Fragment>
  );
}
