import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { EyeClosedIcon, EyeIcon, HardDriveIcon } from 'lucide-react';
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
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useSetupSubmitStorage } from '@/hooks/tanstack-query/use-setup-submit-storage';

export const Route = createLazyFileRoute('/setup/storage/')({
  component: SetupStoragePage,
});

function SetupStoragePage(): React.JSX.Element {
  const router = useRouter();
  const [driver, setDriver] = useState<'local' | 's3'>('local');
  const [endpoint, setEndpoint] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [bucket, setBucket] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const isS3 = driver === 's3';

  const mutation = useSetupSubmitStorage({
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

    if (isS3 && (!endpoint || !bucket || !accessKey || !secretKey)) {
      toast.error('Preencha todos os campos obrigatórios do S3');
      return;
    }

    mutation.mutate({
      STORAGE_DRIVER: driver,
      ...(isS3 && {
        STORAGE_ENDPOINT: endpoint,
        STORAGE_REGION: region || 'us-east-1',
        STORAGE_BUCKET: bucket,
        STORAGE_ACCESS_KEY: accessKey,
        STORAGE_SECRET_KEY: secretKey,
      }),
    });
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDriveIcon className="size-5" />
          Armazenamento
        </CardTitle>
        <CardDescription>
          Configure onde os arquivos serão armazenados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 stagger-children"
        >
          <Field>
            <FieldLabel>Habilitar S3</FieldLabel>
            <div className="text-sm text-muted-foreground mb-2">
              Ativa o armazenamento remoto via S3. Quando desativado, os
              arquivos são salvos no filesystem local do servidor.
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {isS3 && 'Ativo'}
                {!isS3 && 'Inativo'}
              </span>
              <Switch
                checked={isS3}
                onCheckedChange={(checked) => {
                  if (checked) setDriver('s3');
                  else setDriver('local');
                }}
              />
            </div>
          </Field>

          {isS3 && (
            <div className="space-y-4 border-t pt-4">
              <Field>
                <FieldLabel htmlFor="STORAGE_ENDPOINT">Endpoint</FieldLabel>
                <div className="text-sm text-muted-foreground mb-2">
                  URL do endpoint S3
                </div>
                <InputGroup>
                  <InputGroupInput
                    id="STORAGE_ENDPOINT"
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://s3.amazonaws.com"
                    required
                  />
                </InputGroup>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="STORAGE_REGION">Região</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="STORAGE_REGION"
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="us-east-1"
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="STORAGE_BUCKET">Bucket</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="STORAGE_BUCKET"
                      type="text"
                      value={bucket}
                      onChange={(e) => setBucket(e.target.value)}
                      placeholder="my-bucket"
                      required
                    />
                  </InputGroup>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="STORAGE_ACCESS_KEY">Access Key</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="STORAGE_ACCESS_KEY"
                    type={(showAccessKey && 'text') || 'password'}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    required
                  />
                  <InputGroupButton
                    type="button"
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    aria-label={
                      (showAccessKey && 'Ocultar access key') ||
                      'Mostrar access key'
                    }
                  >
                    {showAccessKey && <EyeClosedIcon className="size-4" />}
                    {!showAccessKey && <EyeIcon className="size-4" />}
                  </InputGroupButton>
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="STORAGE_SECRET_KEY">Secret Key</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="STORAGE_SECRET_KEY"
                    type={(showSecretKey && 'text') || 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    required
                  />
                  <InputGroupButton
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    aria-label={
                      (showSecretKey && 'Ocultar secret key') ||
                      'Mostrar secret key'
                    }
                  >
                    {showSecretKey && <EyeClosedIcon className="size-4" />}
                    {!showSecretKey && <EyeIcon className="size-4" />}
                  </InputGroupButton>
                </InputGroup>
              </Field>
            </div>
          )}

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
