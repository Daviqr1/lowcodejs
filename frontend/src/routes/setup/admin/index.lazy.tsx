import { useForm } from '@tanstack/react-form';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import {
  EyeClosedIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
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
import { useSetupSubmitAdmin } from '@/hooks/tanstack-query/use-setup-submit-admin';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { PASSWORD_REGEX } from '@/lib/constant';
import { applyApiFieldErrors, getFieldInvalidState } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute('/setup/admin/')({
  component: SetupAdminPage,
});

const FormSchema = z
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
        PASSWORD_REGEX,
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

function SetupAdminPage(): React.JSX.Element {
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
      onChange: FormSchema,
      onSubmit: FormSchema,
    },
    onSubmit: async function ({ value: payload }) {
      await mutation.mutateAsync(payload);
    },
  });

  useApiErrorAutoClear(form);

  const mutation = useSetupSubmitAdmin({
    onSuccess: (data) => {
      toast.success('Administrador criado com sucesso');
      if (data.completed) {
        router.navigate({ to: '/' });
      } else if (data.currentStep) {
        router.navigate({ to: `/setup/${data.currentStep}` });
      }
    },
    onError: (error) => {
      handleApiError(error, {
        context: 'Erro ao criar administrador',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-5" />
          Criar Administrador
        </CardTitle>
        <CardDescription>
          Crie a conta do administrador principal da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
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
                        id={field.name}
                        name={field.name}
                        type="text"
                        placeholder="Nome do administrador"
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
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        type="email"
                        placeholder="email@exemplo.com"
                        value={field.state.value.trim()}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value.trim())
                        }
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
                          type="button"
                          aria-label="alternar visibilidade da senha"
                          title="Alternar visibilidade da senha"
                          size="icon-xs"
                          className="cursor-pointer"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword && <EyeClosedIcon />}
                          {!showPassword && <EyeIcon />}
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
                          type="button"
                          aria-label="alternar visibilidade da confirmação"
                          title="Alternar visibilidade da confirmação"
                          size="icon-xs"
                          className="cursor-pointer"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword && <EyeClosedIcon />}
                          {!showConfirmPassword && <EyeIcon />}
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
                type="submit"
                className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
                disabled={mutation.status === 'pending'}
              >
                {mutation.status === 'pending' && <Spinner />}
                {!(mutation.status === 'pending') && (
                  <span>Criar e continuar</span>
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
