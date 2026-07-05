import { useNavigate } from '@tanstack/react-router';
import type * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SETUP_STEP_LABELS } from '@/lib/constant';

type BlockedDialogProps = {
  blocked?: string;
};

export function BlockedDialog({
  blocked,
}: BlockedDialogProps): React.JSX.Element | null {
  const navigate = useNavigate();

  if (!blocked) return null;

  const stepLabels: Record<string, string> = { ...SETUP_STEP_LABELS };
  const label = stepLabels[blocked] ?? blocked;

  function handleClose(): void {
    navigate({ search: {} });
  }

  return (
    <Dialog
      open
      onOpenChange={handleClose}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etapa não disponível</DialogTitle>
          <DialogDescription>
            A etapa &quot;{label}&quot; ainda não pode ser acessada. Complete as
            etapas anteriores primeiro.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
