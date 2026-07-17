import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { UploadIcon } from 'lucide-react';
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
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { useSetupSubmitUpload } from '@/hooks/tanstack-query/use-setup-submit-upload';

export const Route = createLazyFileRoute('/setup/upload/')({
  component: SetupUploadPage,
});

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} bytes`;
}

function SetupUploadPage(): React.JSX.Element {
  const router = useRouter();
  const [maxSize, setMaxSize] = useState(10485760);
  const [accepted, setAccepted] = useState('jpg;jpeg;png;pdf');
  const [maxFiles, setMaxFiles] = useState(10);

  const mutation = useSetupSubmitUpload({
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
    mutation.mutate({
      FILE_UPLOAD_MAX_SIZE: maxSize,
      FILE_UPLOAD_ACCEPTED: accepted,
      FILE_UPLOAD_MAX_FILES_PER_UPLOAD: maxFiles,
    });
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="size-5" />
          Configurações de Upload
        </CardTitle>
        <CardDescription className="text-pretty">
          Defina os limites de upload de arquivos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 stagger-children"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="FILE_UPLOAD_MAX_SIZE">
                Tamanho máximo do arquivo
              </FieldLabel>
              <div className="text-sm text-muted-foreground mb-2">
                Em bytes: {formatFileSize(maxSize)}
              </div>
              <InputGroup>
                <InputGroupInput
                  id="FILE_UPLOAD_MAX_SIZE"
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(Number(e.target.value))}
                  required
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="FILE_UPLOAD_MAX_FILES_PER_UPLOAD">
                Máximo de arquivos por upload
              </FieldLabel>
              <div className="text-sm text-muted-foreground mb-2">
                Quantidade máxima simultânea
              </div>
              <InputGroup>
                <InputGroupInput
                  id="FILE_UPLOAD_MAX_FILES_PER_UPLOAD"
                  type="number"
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(Number(e.target.value))}
                  required
                />
              </InputGroup>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="FILE_UPLOAD_ACCEPTED">
              Extensões aceitas
            </FieldLabel>
            <div className="text-sm text-muted-foreground mb-2">
              Separadas por ponto-e-vírgula (ex: jpg;jpeg;png;pdf)
            </div>
            <InputGroup>
              <InputGroupInput
                id="FILE_UPLOAD_ACCEPTED"
                type="text"
                value={accepted}
                onChange={(e) => setAccepted(e.target.value)}
                placeholder="jpg;jpeg;png;pdf"
                required
              />
            </InputGroup>
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
