import {
  Link,
  createLazyFileRoute,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAuthenticationRequestCode } from '@/hooks/tanstack-query/use-authentication-request-code';
import { useAuthenticationValidateCode } from '@/hooks/tanstack-query/use-authentication-validate-code';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute(
  '/_authentication/forgot-password/validate-code/',
)({
  component: RouteComponent,
});

const CodeSchema = z.object({
  code: z
    .string({ message: 'O código é obrigatório' })
    .length(6, 'O código deve ter 6 dígitos'),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  const visible = local.slice(0, 2);
  const masked = '*'.repeat(Math.min(local.length - 2, 4));
  return `${visible}${masked}@${domain}`;
}

function RouteComponent(): React.JSX.Element {
  const router = useRouter();
  const { email } = useSearch({
    from: '/_authentication/forgot-password/validate-code/',
  });

  const [codeValue, setCodeValue] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const validateCodeMutation = useAuthenticationValidateCode({
    onSuccess() {
      toast.success('Código validado!', {
        description: 'Defina sua nova senha.',
      });
      router.navigate({
        to: '/forgot-password/reset-password',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao validar código',
        causeHandlers: {
          VALIDATION_TOKEN_NOT_FOUND: () => {
            setCodeError('Código inválido');
          },
          VALIDATION_TOKEN_EXPIRED: () => {
            setCodeError('Código expirado. Solicite um novo código.');
          },
        },
      });
    },
  });

  const resendMutation = useAuthenticationRequestCode({
    onSuccess() {
      toast.success('Código reenviado!', {
        description: 'Verifique seu e-mail.',
      });
      setCodeValue('');
      setCodeError(null);
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao reenviar código',
      });
    },
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = CodeSchema.safeParse({ code: codeValue });
    if (!result.success) {
      setCodeError(result.error.issues[0]?.message ?? 'Código inválido');
      return;
    }
    setCodeError(null);
    validateCodeMutation.mutate({ code: codeValue, email });
  }

  function handleResend(): void {
    resendMutation.mutate({ email });
  }

  const isPending = validateCodeMutation.status === 'pending';
  const isResending = resendMutation.status === 'pending';

  return (
    <div
      data-test-id="forgot-password-code-page"
      className="flex flex-col gap-6"
    >
      <form
        data-test-id="forgot-password-code-form"
        onSubmit={handleSubmit}
      >
        <FieldGroup className="stagger-children">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="heading-card">Verificar código</h1>
            <FieldDescription>
              Digite o código de 6 dígitos enviado para{' '}
              <span className="text-foreground font-medium">
                {maskEmail(email)}
              </span>
            </FieldDescription>
          </div>

          <Field data-invalid={!!codeError}>
            <FieldLabel>Código de verificação</FieldLabel>
            <div className="flex justify-center">
              <InputOTP
                data-test-id="forgot-password-otp-input"
                maxLength={6}
                value={codeValue}
                onChange={(value) => {
                  setCodeValue(value);
                  if (codeError) setCodeError(null);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {codeError && <FieldError>{codeError}</FieldError>}
          </Field>

          <Field>
            <Button
              data-test-id="forgot-password-verify-btn"
              type="submit"
              className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
              disabled={isPending || codeValue.length < 6}
            >
              {isPending && <Spinner />}
              {!isPending && <span>Verificar código</span>}
            </Button>
          </Field>

          <FieldDescription className="text-center">
            Não recebeu o código?{' '}
            <button
              type="button"
              className="underline underline-offset-2 disabled:opacity-50"
              disabled={isResending}
              onClick={handleResend}
            >
              {isResending && 'Reenviando...'}
              {!isResending && 'Reenviar'}
            </button>
          </FieldDescription>

          <FieldDescription className="text-center">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              Voltar
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  );
}
