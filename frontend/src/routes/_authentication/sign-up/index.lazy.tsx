import { useForm } from '@tanstack/react-form';
import { Link, createLazyFileRoute, useRouter } from '@tanstack/react-router';
import {
  EyeClosedIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useAuthenticationSignUp } from '@/hooks/tanstack-query/use-authentication-sign-up';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors, getFieldInvalidState } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute('/_authentication/sign-up/')({
  component: RouteComponent,
});

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;

const FormSignUpSchema = z
  .object({
    name: z
      .string({ message: 'O nome é obrigatório' })
      .min(1, 'O nome é obrigatório'),
    email: z
      .string({ message: 'O email é obrigatório' })
      .email('Digite um email válido'),
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

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: FormSignUpSchema,
      onSubmit: FormSignUpSchema,
    },
    onSubmit: async function ({ value: payload }) {
      const { confirmPassword, ...data } = payload;
      await signUpMutation.mutateAsync(data);
    },
  });

  useApiErrorAutoClear(form);

  const signUpMutation = useAuthenticationSignUp({
    onSuccess() {
      router.navigate({ to: '/sign-up/success' });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar conta',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
        causeHandlers: {
          USER_ALREADY_EXISTS: () =>
            applyApiFieldErrors(form, {
              email: 'Este email já está em uso',
            }),
        },
      });
    },
  });

  return (
    <div
      data-test-id="sign-up-page"
      className="flex flex-col gap-6"
    >
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="heading-card">Cadastro</CardTitle>
          <CardDescription>
            Crie sua conta para acessar a plataforma
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            data-test-id="sign-up-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="stagger-children">
              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid = getFieldInvalidState(field.state.meta);

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="sign-up-name-input"
                          id={field.name}
                          name={field.name}
                          type="text"
                          placeholder="Seu nome completo"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        <InputGroupAddon>
                          <UserIcon />
                        </InputGroupAddon>
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="email"
                children={(field) => {
                  const isInvalid = getFieldInvalidState(field.state.meta);

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="sign-up-email-input"
                          id={field.name}
                          name={field.name}
                          type="email"
                          placeholder="exemplo@mail.com"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        <InputGroupAddon>
                          <MailIcon />
                        </InputGroupAddon>
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="password"
                children={(field) => {
                  const isInvalid = getFieldInvalidState(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="sign-up-password-input"
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
                            data-test-id="sign-up-password-toggle-btn"
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
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
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
                        Confirmar Senha
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="sign-up-confirm-password-input"
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
                            data-test-id="sign-up-confirm-password-toggle-btn"
                            type="button"
                            aria-label="toggle password visibility"
                            title="toggle password visibility"
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
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <Field>
                <Button
                  data-test-id="sign-up-submit-btn"
                  type="submit"
                  className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
                  disabled={signUpMutation.status === 'pending'}
                >
                  {signUpMutation.status === 'pending' && <Spinner />}
                  {!(signUpMutation.status === 'pending') && (
                    <span>Criar conta</span>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <FieldDescription>
          Já possui uma conta?{' '}
          <Link
            to="/"
            data-test-id="sign-in-link"
            className="underline underline-offset-2"
          >
            Faça login
          </Link>
        </FieldDescription>
      </div>
    </div>
  );
}
