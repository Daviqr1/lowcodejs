import { FileTextIcon, ScanTextIcon, XIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useDocTranscriptionConfig } from '@/hooks/tanstack-query/use-doc-transcription-config';
import { useDocTranscriptionTranscribe } from '@/hooks/tanstack-query/use-doc-transcription-transcribe';
import { handleApiError } from '@/lib/handle-api-error';

type Props = {
  onFillFields?: (data: Record<string, string | null>) => void;
};

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

export function FillButton({ onFillFields }: Props): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [documentTypeId, setDocumentTypeId] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const { data: config } = useDocTranscriptionConfig();

  const transcribe = useDocTranscriptionTranscribe({
    onSuccess(result) {
      if (!onFillFields) return;
      const data: Record<string, string | null> = {};
      result.fields.forEach((f) => {
        let value: string | null = null;
        if (f.value !== null && f.value !== undefined) value = String(f.value);
        data[f.key] = value;
      });
      onFillFields(data);
      toast.success('Campos preenchidos', {
        description: `${result.fields.filter((f) => f.value !== null).length} campo(s) preenchido(s)`,
      });
      setOpen(false);
      reset();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao transcrever documento',
        causes: {
          API_NOT_CONFIGURED:
            'Configure a URL da API em Ferramentas > Transcrição de Documentos.',
          API_KEY_NOT_CONFIGURED:
            'Configure a API Key em Ferramentas > Transcrição de Documentos.',
          DOCUMENT_TYPE_NOT_FOUND: 'Tipo de documento inválido.',
          TRANSCRIPTION_API_ERROR: 'A API de transcrição retornou um erro.',
          TRANSCRIPTION_API_UNREACHABLE: 'Não foi possível conectar à API.',
        },
      });
    },
  });

  function reset(): void {
    setDocumentTypeId('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleSubmit(): void {
    if (!file || !documentTypeId) return;
    const formData = new FormData();
    formData.append('documentTypeId', documentTypeId);
    formData.append('file', file);
    transcribe.mutate(formData);
  }

  const noConfig = !config?.apiUrl || !config?.apiKey;
  const noTypes = !config?.documentTypes?.length;
  const isPending = transcribe.status === 'pending';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <ScanTextIcon className="size-4" />
        Transcrever documento
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transcrever documento</DialogTitle>
          </DialogHeader>

          {noConfig && (
            <p className="text-sm text-destructive">
              A extensão não está configurada. Acesse{' '}
              <strong>
                Ferramentas {'>'} Transcrição de Documentos {'>'} Configurações
              </strong>
              .
            </p>
          )}

          {!noConfig && noTypes && (
            <p className="text-sm text-destructive">
              Nenhum tipo de documento configurado. Acesse{' '}
              <strong>
                Ferramentas {'>'} Transcrição de Documentos {'>'} Configurações
              </strong>
              .
            </p>
          )}

          {!noConfig && !noTypes && (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Tipo de documento</FieldLabel>
                <Select
                  value={documentTypeId}
                  onValueChange={setDocumentTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.documentTypes.map((dt) => (
                      <SelectItem
                        key={dt.id}
                        value={dt.id}
                      >
                        {dt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Arquivo</FieldLabel>
                {file && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                )}
                {!file && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED}
                      className="hidden"
                      id="dt-fill-upload"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <label
                      htmlFor="dt-fill-upload"
                      className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-4 py-5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      Clique para selecionar (PDF, JPG, PNG)
                    </label>
                  </>
                )}
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                !file || !documentTypeId || isPending || noConfig || noTypes
              }
              className="cursor-pointer"
            >
              {isPending && (
                <>
                  <Spinner className="mr-2" />
                  Transcrevendo...
                </>
              )}
              {!isPending && (
                <>
                  <ScanTextIcon className="size-4 mr-2" />
                  Transcrever
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
