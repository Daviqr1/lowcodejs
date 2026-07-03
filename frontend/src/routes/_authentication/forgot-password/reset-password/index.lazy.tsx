import { useForm } from '@tanstack/react-form';
import { Link, createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, EyeClosedIcon, EyeIcon, LockIcon } from 'lucide-react';
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { useAuthenticationResetPassword } from '@/hooks/tanstack-query/use-authentication-reset-password';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors, getFieldInvalidState } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute(
  '/_authentication/forgot-password/reset-password/',
)({
  component: RouteComponent,
});

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;

const PasswordSchema = z
  .object({
    password: z
      .string({ message: 'A senha é obrigatória' })
      .min(6, 'A senha deve ter no mínimo 6 caracteres')
      .regex(
        passwordRegex,
        'A senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
      ),
    confirmPassword: z
      .string({ message: 'A confirmação de senha é obrigatória' })
      .min(1, 'A confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

function RouteComponent(): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetPasswordMutation = useAuthenticationResetPassword({
    onSuccess() {
      toast.success('Senha redefinida!', {
        description: 'Faça login com sua nova senha.',
      });
      router.navigate({ to: '/', replace: true });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao redefinir senha',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: PasswordSchema,
      onSubmit: PasswordSchema,
    },
    onSubmit: async function ({ value }) {
      await resetPasswordMutation.mutateAsync({
        password: value.password,
      });
    },
  });

  useApiErrorAutoClear(form);

  return (
    <div
      data-test-id="forgot-password-reset-page"
      className="flex flex-col gap-6"
    >
      <form
        data-test-id="forgot-password-new-password-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup className="stagger-children">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="heading-card">Redefinir senha</h1>
            <FieldDescription>
              Crie uma nova senha para sua conta
            </FieldDescription>
          </div>

          <form.Field
            name="password"
            children={(field) => {
              const isInvalid = getFieldInvalidState(field.state.meta);

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Nova senha</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      data-test-id="forgot-password-password-input"
                      id={field.name}
                      name={field.name}
                      type={(showPassword && 'text') || 'password'}
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon>
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        data-test-id="forgot-password-password-toggle-btn"
                        type="button"
                        aria-label="toggle password visibility"
                        title="toggle password visibility"
                        size="icon-xs"
                        className="cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {!showPassword && <EyeIcon />}
                        {showPassword && <EyeClosedIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="confirmPassword"
            children={(field) => {
              const isInvalid = getFieldInvalidState(field.state.meta);

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Confirmar nova senha
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      data-test-id="forgot-password-confirm-password-input"
                      id={field.name}
                      name={field.name}
                      type={(showConfirmPassword && 'text') || 'password'}
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon>
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        data-test-id="forgot-password-confirm-password-toggle-btn"
                        type="button"
                        aria-label="toggle confirm password visibility"
                        title="toggle confirm password visibility"
                        size="icon-xs"
                        className="cursor-pointer"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {!showConfirmPassword && <EyeIcon />}
                        {showConfirmPassword && <EyeClosedIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <Field>
            <Button
              data-test-id="forgot-password-submit-btn"
              type="submit"
              className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
              disabled={resetPasswordMutation.status === 'pending'}
            >
              {resetPasswordMutation.status === 'pending' && <Spinner />}
              {!(resetPasswordMutation.status === 'pending') && (
                <span>Redefinir senha</span>
              )}
            </Button>

            <FieldDescription className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Voltar para o login
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
