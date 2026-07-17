import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import type * as React from 'react';

import { Button } from '@/components/ui/button';

export const Route = createLazyFileRoute('/_authentication/sign-up/success/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const router = useRouter();

  return (
    <div
      data-test-id="sign-up-success-page"
      className="flex flex-col items-center gap-6 text-center"
    >
      <span className="animate-pop bg-brand-gradient shadow-soft-lg flex size-20 items-center justify-center rounded-full ring-8 ring-brand-blue/10">
        <CheckIcon className="size-9 stroke-[3] text-white" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="heading-subsection">Conta criada com sucesso!</h1>
        <p className="text-muted-foreground text-balance">
          Bem-vindo(a) à plataforma lowcodejs.
        </p>
      </div>

      <Button
        data-test-id="sign-up-success-start-btn"
        className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
        onClick={() => router.navigate({ to: '/', replace: true })}
      >
        Começar
      </Button>
    </div>
  );
}
