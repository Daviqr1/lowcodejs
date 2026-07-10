import { useForm } from '@tanstack/react-form';
import { Link, createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, MailIcon } from 'lucide-react';
import React from 'react';
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
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { useAuthenticationRequestCode } from '@/hooks/tanstack-query/use-authentication-request-code';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors, getFieldInvalidState } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute('/_authentication/forgot-password/')({
  component: RouteComponent,
});

const EmailSchema = z.object({
  email: z.email('Digite um email válido'),
});

function RouteComponent(): React.JSX.Element {
  const router = useRouter();

  const requestCodeMutation = useAuthenticationRequestCode({
    onSuccess() {
      toast.success('Código enviado!', {
        description: 'Verifique seu e-mail para obter o código.',
      });
      router.navigate({
        to: '/forgot-password/validate-code',
        search: { email: form.state.values.email },
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao enviar código',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
        causeHandlers: {
          EMAIL_NOT_FOUND: () =>
            applyApiFieldErrors(form, { email: 'E-mail não encontrado' }),
        },
      });
    },
  });

  const form = useForm({
    defaultValues: { email: '' },
    validators: {
      onChange: EmailSchema,
      onSubmit: EmailSchema,
    },
    onSubmit: async function ({ value }) {
      await requestCodeMutation.mutateAsync(value);
    },
  });

  useApiErrorAutoClear(form);

  return (
    <div
      data-test-id="forgot-password-page"
      className="flex flex-col gap-6"
    >
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="heading-card">Recuperar senha</CardTitle>
          <CardDescription className="text-pretty">
            Digite seu e-mail para receber o código de verificação
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            data-test-id="forgot-password-email-form"
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
                          data-test-id="forgot-password-email-input"
                          id={field.name}
                          name={field.name}
                          type="email"
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

              <Field>
                <Button
                  data-test-id="forgot-password-send-btn"
                  type="submit"
                  className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
                  disabled={requestCodeMutation.status === 'pending'}
                >
                  {requestCodeMutation.status === 'pending' && <Spinner />}
                  {!(requestCodeMutation.status === 'pending') && (
                    <span>Enviar código</span>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <FieldDescription>
          <Link
            to="/"
            className="inline-flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Voltar para o login
          </Link>
        </FieldDescription>
      </div>
    </div>
  );
}
