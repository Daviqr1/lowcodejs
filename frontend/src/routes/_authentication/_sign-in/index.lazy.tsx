import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Link, createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { EyeClosedIcon, EyeIcon, LockIcon, MailIcon } from 'lucide-react';
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
import { menuAllOptions } from '@/hooks/tanstack-query/_query-options';
import { useAuthenticationSignIn } from '@/hooks/tanstack-query/use-authentication-sign-in';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors, getFieldInvalidState } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import { resolveInitialMenuRoute } from '@/lib/menu/initial-menu-route';
import { ROLE_DEFAULT_ROUTE } from '@/lib/menu/menu-access-permissions';

export const Route = createLazyFileRoute('/_authentication/_sign-in/')({
  component: RouteComponent,
});

const FormSignInSchema = z.object({
  email: z.email('Digite um email válido'),
  password: z
    .string({ message: 'A senha é obrigatória' })
    .min(1, 'A senha é obrigatória'),
});

function RouteComponent(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const signInMutation = useAuthenticationSignIn({
    async onSuccess(response) {
      queryClient.clear();
      const role = response.group.slug.toUpperCase();
      const fallbackRoute = ROLE_DEFAULT_ROUTE[role] ?? '/tables';
      const menus = await queryClient.fetchQuery(menuAllOptions());
      const initialRoute = resolveInitialMenuRoute(menus);

      if (initialRoute?.type === 'external') {
        window.location.assign(initialRoute.href);
        return;
      }

      toast.success('Login realizado com sucesso!', {
        description: 'Seja bem-vindo!',
      });

      router.navigate({
        to: initialRoute?.to ?? fallbackRoute,
        replace: true,
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao fazer login',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: FormSignInSchema,
      onSubmit: FormSignInSchema,
    },
    onSubmit: async function ({ value: payload }) {
      await signInMutation.mutateAsync(payload);
    },
  });

  useApiErrorAutoClear(form);

  return (
    <div
      data-test-id="sign-in-page"
      className="flex flex-col gap-6"
    >
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="heading-card">Entrar</CardTitle>
          <CardDescription className="text-pretty">
            Faça login para acessar a plataforma
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            data-test-id="sign-in-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="stagger-children">
              <form.Field
                name="email"
                children={(field) => {
                  const isInvalid = getFieldInvalidState(field.state.meta);

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="sign-in-email-input"
                          id={field.name}
                          name={field.name}
                          placeholder="exemplo@mail.com"
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
                          data-test-id="sign-in-password-input"
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
                            data-test-id="sign-in-password-toggle-btn"
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

              <Field>
                <Button
                  data-test-id="sign-in-submit-btn"
                  type="submit"
                  className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
                  disabled={signInMutation.status === 'pending'}
                >
                  {signInMutation.status === 'pending' && <Spinner />}
                  {!(signInMutation.status === 'pending') && (
                    <span>Entrar</span>
                  )}
                </Button>

                <FieldDescription className="text-right">
                  <Link
                    to="/forgot-password"
                    data-test-id="sign-up-link"
                    className="underline underline-offset-2"
                  >
                    Esqueceu senha?
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <FieldDescription>
          Não possui uma conta?{' '}
          <Link
            to="/sign-up"
            data-test-id="sign-up-link"
            className="underline underline-offset-2"
          >
            Clique aqui
          </Link>
        </FieldDescription>
      </div>
    </div>
  );
}
