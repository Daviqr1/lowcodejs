import { useCallback, useRef } from 'react';
import type * as React from 'react';

// Fecha um Dialog/Sheet uncontrolled sem `open`/`onOpenChange` nem `useState`:
// ancore o `closeRef` no botão de fechar VISÍVEL do footer
// (`<DialogClose asChild><Button ref={closeRef}>Cancelar</Button></DialogClose>`,
// ou SheetClose) e chame `close()` no `onSuccess` da mutation. Erro mantém o
// modal aberto (o toast reporta). Sem `<DialogClose className="hidden" />` só pro
// ref — reaproveite o Cancelar/Fechar. Ver dialog-pattern / sheet-pattern.
export function useDismissableDialog(): {
  closeRef: React.RefObject<HTMLButtonElement | null>;
  close: () => void;
} {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => closeRef.current?.click(), []);
  return { closeRef, close };
}
