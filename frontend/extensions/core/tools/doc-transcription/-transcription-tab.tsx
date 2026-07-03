import { FileTextIcon, ScanTextIcon, XIcon } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
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
import type { ITranscribeResult } from '@/hooks/tanstack-query/use-doc-transcription-transcribe';
import { useDocTranscriptionTranscribe } from '@/hooks/tanstack-query/use-doc-transcription-transcribe';
import { handleApiError } from '@/lib/handle-api-error';

const ACCEPTED_MIMETYPES = 'image/jpeg,image/png,image/webp,application/pdf';

function formatFieldValue(
  value: ITranscribeResult['fields'][0]['value'],
  type: string,
): string {
  if (value === null || value === undefined) return '—';
  if (type === 'boolean') {
    if (value) return 'Sim';
    return 'Não';
  }
  return String(value);
}

export function TranscriptionTab(): React.JSX.Element {
  const { data: config } = useDocTranscriptionConfig();

  const [documentTypeId, setDocumentTypeId] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ITranscribeResult | null>(null);
  const [rawOpen, setRawOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const transcribe = useDocTranscriptionTranscribe({
    onSuccess(data) {
      setResult(data);
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao transcrever documento',
        causes: {
          API_NOT_CONFIGURED:
            'Configure a URL da API em Configurações antes de usar.',
          API_KEY_NOT_CONFIGURED:
            'Configure a API Key em Configurações antes de usar.',
          DOCUMENT_TYPE_NOT_FOUND:
            'Tipo de documento inválido. Recarregue a página.',
          TRANSCRIPTION_API_ERROR: 'A API de transcrição retornou um erro.',
          TRANSCRIPTION_API_UNREACHABLE:
            'Não foi possível conectar à API de transcrição.',
        },
      });
    },
  });

  const noDocTypes = config.documentTypes.length === 0;
  const noApiUrl = !config.apiUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
  }

  function clearFile(): void {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(): void {
    if (!file || !documentTypeId) return;
    const formData = new FormData();
    formData.append('documentTypeId', documentTypeId);
    formData.append('file', file);
    transcribe.mutate(formData);
  }

  if (noApiUrl || noDocTypes) {
    return (
      <Empty className="py-12">
        <EmptyTitle>Configuração incompleta</EmptyTitle>
        <EmptyDescription>
          {noApiUrl && 'Configure a URL da API na aba Configurações.'}
          {!noApiUrl &&
            'Adicione ao menos um tipo de documento na aba Configurações.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>Tipo de documento</FieldLabel>
            <Select
              value={documentTypeId}
              onValueChange={(v) => {
                setDocumentTypeId(v);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
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
                  className="h-6 w-6 cursor-pointer shrink-0"
                  onClick={clearFile}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            )}
            {!file && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MIMETYPES}
                  onChange={handleFileChange}
                  className="hidden"
                  id="doc-upload"
                />
                <label
                  htmlFor="doc-upload"
                  className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  Clique para selecionar (PDF, JPG, PNG, WEBP)
                </label>
              </div>
            )}
          </Field>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !file || !documentTypeId || transcribe.status === 'pending'
            }
            className="w-full cursor-pointer"
          >
            {transcribe.status === 'pending' && (
              <>
                <Spinner className="mr-2" />
                Transcrevendo...
              </>
            )}
            {transcribe.status !== 'pending' && (
              <>
                <ScanTextIcon className="size-4 mr-2" />
                Transcrever
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Resultado</CardTitle>
              <Badge variant="secondary">{result.documentTypeName}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border divide-y">
              {result.fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="text-xs text-muted-foreground font-medium w-36 shrink-0 pt-0.5">
                    {f.label}
                  </span>
                  <span className="text-sm flex-1">
                    {formatFieldValue(f.value, f.type)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono shrink-0"
                  >
                    {f.key}
                  </Badge>
                </div>
              ))}
            </div>

            <Collapsible
              open={rawOpen}
              onOpenChange={setRawOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-muted-foreground"
                >
                  {rawOpen && 'Ocultar'}
                  {!rawOpen && 'Ver'} resposta bruta
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
