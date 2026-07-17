import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { Languages, TypeIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useSetupSubmitName } from '@/hooks/tanstack-query/use-setup-submit-name';

export const Route = createLazyFileRoute('/setup/name/')({
  component: SetupNamePage,
});

function SetupNamePage(): React.JSX.Element {
  const router = useRouter();
  const [systemName, setSystemName] = useState('');
  const [locale, setLocale] = useState('pt-br');

  const mutation = useSetupSubmitName({
    onSuccess: (data) => {
      toast.success('Etapa concluída');
      if (data.completed) {
        router.navigate({ to: '/' });
      } else if (data.currentStep) {
        router.navigate({ to: `/setup/${data.currentStep}` });
      }
    },
    onError: () => {
      toast.error('Erro ao salvar');
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutation.mutate({ SYSTEM_NAME: systemName, LOCALE: locale });
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TypeIcon className="size-5" />
          Identidade do Sistema
        </CardTitle>
        <CardDescription className="text-pretty">
          Configure o nome e idioma padrão da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 stagger-children"
        >
          <Field>
            <FieldLabel htmlFor="SYSTEM_NAME">Nome do Sistema</FieldLabel>
            <div className="text-sm text-muted-foreground mb-2">
              Exibido no título e cabeçalho da plataforma
            </div>
            <InputGroup>
              <InputGroupInput
                id="SYSTEM_NAME"
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="Minha Plataforma"
                required
              />
              <InputGroupAddon>
                <TypeIcon />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="LOCALE">Idioma</FieldLabel>
            <div className="text-sm text-muted-foreground mb-2">
              Idioma padrão da aplicação
            </div>
            <Select
              value={locale}
              onValueChange={setLocale}
            >
              <SelectTrigger id="LOCALE">
                <Languages className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                <SelectItem value="en-us">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Button
            type="submit"
            className="w-full transition-transform hover:-translate-y-px hover:shadow-soft active:translate-y-0"
            disabled={mutation.status === 'pending'}
          >
            {mutation.status === 'pending' && <Spinner />}
            {!(mutation.status === 'pending') && (
              <span>Salvar e continuar</span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
