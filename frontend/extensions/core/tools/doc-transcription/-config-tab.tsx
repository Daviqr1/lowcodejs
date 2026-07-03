import { ChevronDownIcon, EditIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { DocumentTypeForm } from './-document-type-form';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { IDocumentType } from '@/hooks/tanstack-query/use-doc-transcription-config';
import { useDocTranscriptionConfig } from '@/hooks/tanstack-query/use-doc-transcription-config';
import { useDocTranscriptionConfigUpdate } from '@/hooks/tanstack-query/use-doc-transcription-config-update';
import { handleApiError } from '@/lib/handle-api-error';
import { cn } from '@/lib/utils';

interface OpenAIModel {
  id: string;
  label: string;
  group: string;
  inputPer1M: string;
  outputPer1M: string;
}

const OPENAI_MODELS: Array<OpenAIModel> = [
  // GPT-5.5
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    group: 'GPT-5.5',
    inputPer1M: '$5.00',
    outputPer1M: '$30.00',
  },
  // GPT-5.4
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    group: 'GPT-5.4',
    inputPer1M: '$2.50',
    outputPer1M: '$15.00',
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    group: 'GPT-5.4',
    inputPer1M: '$0.75',
    outputPer1M: '$4.50',
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    group: 'GPT-5.4',
    inputPer1M: '$0.20',
    outputPer1M: '$1.25',
  },
  // GPT-5.2
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    group: 'GPT-5.2',
    inputPer1M: '$0.88',
    outputPer1M: '$7.00',
  },
  // GPT-5.1
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1',
    group: 'GPT-5.1',
    inputPer1M: '$0.63',
    outputPer1M: '$5.00',
  },
  // GPT-5
  {
    id: 'gpt-5',
    label: 'GPT-5',
    group: 'GPT-5',
    inputPer1M: '$1.25',
    outputPer1M: '$10.00',
  },
  {
    id: 'gpt-5-nano',
    label: 'GPT-5 Nano',
    group: 'GPT-5',
    inputPer1M: '$0.05',
    outputPer1M: '$0.40',
  },
  // GPT-4.1
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    group: 'GPT-4.1',
    inputPer1M: '$2.00',
    outputPer1M: '$8.00',
  },
  {
    id: 'gpt-4.1-nano',
    label: 'GPT-4.1 Nano',
    group: 'GPT-4.1',
    inputPer1M: '$0.10',
    outputPer1M: '$0.40',
  },
  // GPT-4o
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    group: 'GPT-4o',
    inputPer1M: '$2.50',
    outputPer1M: '$10.00',
  },
  // Reasoning
  {
    id: 'o4-mini',
    label: 'o4 Mini',
    group: 'Reasoning',
    inputPer1M: '$0.55',
    outputPer1M: '$2.20',
  },
  {
    id: 'o3',
    label: 'o3',
    group: 'Reasoning',
    inputPer1M: '$2.00',
    outputPer1M: '$8.00',
  },
  {
    id: 'o3-mini',
    label: 'o3 Mini',
    group: 'Reasoning',
    inputPer1M: '$1.10',
    outputPer1M: '$4.40',
  },
  {
    id: 'o1',
    label: 'o1',
    group: 'Reasoning',
    inputPer1M: '$15.00',
    outputPer1M: '$60.00',
  },
];

const KNOWN_MODELS = OPENAI_MODELS.filter((m) => m.inputPer1M !== '$—');
const GROUPS = Array.from(new Set(KNOWN_MODELS.map((m) => m.group)));

function ModelPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: string;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Selecionar modelo OpenAI</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {/* Padrão */}
          <button
            type="button"
            onClick={() => {
              onSelect('');
              onOpenChange(false);
            }}
            className={cn(
              'w-full text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer',
              !value && 'border-primary bg-primary/5 ring-1 ring-primary',
              value && 'border-border hover:bg-muted/50',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Padrão do servidor</span>
              {!value && <span className="size-2 rounded-full bg-primary" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usa <span className="font-mono">OPENAI_MODEL</span> configurado na
              API
            </p>
          </button>

          {/* Grupos */}
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {KNOWN_MODELS.filter((m) => m.group === group).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer',
                      value === m.id &&
                        'border-primary bg-primary/5 ring-1 ring-primary',
                      value !== m.id && 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm leading-tight">
                        {m.label}
                      </span>
                      {value === m.id && (
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {m.id}
                    </div>
                    <div className="flex gap-2 text-[11px] text-muted-foreground mt-1">
                      <span title="Entrada">↑ {m.inputPer1M}</span>
                      <span title="Saída">↓ {m.outputPer1M}</span>
                      <span className="text-[10px] opacity-60">
                        / 1M tokens
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfigTab(): React.JSX.Element {
  const { data: config } = useDocTranscriptionConfig();

  const [apiUrl, setApiUrl] = React.useState(config.apiUrl ?? '');
  const [apiKey, setApiKey] = React.useState(config.apiKey ?? '');
  const [model, setModel] = React.useState(config.model ?? '');
  const [modelPickerOpen, setModelPickerOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<IDocumentType | null>(
    null,
  );

  const update = useDocTranscriptionConfigUpdate({
    onSuccess() {
      toast.success('Configuração salva');
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao salvar configuração' });
    },
  });

  function saveConnection(): void {
    const payload: { apiUrl: string | null; apiKey?: string; model?: string } =
      {
        apiUrl: apiUrl.trim() || null,
      };
    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    if (model.trim()) payload.model = model.trim();
    update.mutate(payload);
  }

  function openAddForm(): void {
    setEditingType(null);
    setFormOpen(true);
  }

  function openEditForm(docType: IDocumentType): void {
    setEditingType(docType);
    setFormOpen(true);
  }

  function handleSaveDocType(docType: IDocumentType): void {
    const current = config.documentTypes ?? [];
    const exists = current.find((dt) => dt.id === docType.id);

    let updated: Array<IDocumentType>;
    if (exists) {
      updated = current.map((dt) => {
        if (dt.id === docType.id) return docType;
        return dt;
      });
    } else {
      updated = [...current, docType];
    }

    update.mutate(
      { documentTypes: updated },
      {
        onSuccess() {
          setFormOpen(false);
          toast.success('Tipo de documento salvo');
        },
      },
    );
  }

  function handleDeleteDocType(id: string): void {
    const updated = (config.documentTypes ?? []).filter((dt) => dt.id !== id);
    update.mutate(
      { documentTypes: updated },
      {
        onSuccess() {
          toast.success('Tipo de documento removido');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexão com a API</CardTitle>
          <CardDescription>
            Endpoint e chave de autenticação da API de transcrição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>URL da API</FieldLabel>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.exemplo.com/api/v1/internal/transcribe"
              type="url"
            />
          </Field>

          <Field>
            <FieldLabel>API Key</FieldLabel>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Chave secreta (X-Api-Key)"
              type="password"
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel>Modelo OpenAI</FieldLabel>
            <button
              type="button"
              onClick={() => setModelPickerOpen(true)}
              className="w-full flex items-center justify-between rounded-md border bg-background px-3 h-9 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <span
                className={cn(
                  model && 'font-mono',
                  !model && 'text-muted-foreground',
                )}
              >
                {model &&
                  (KNOWN_MODELS.find((m) => m.id === model)?.label ?? model)}
                {!model && 'Padrão do servidor'}
              </span>
              <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
            </button>
            {model && (
              <p className="text-xs text-muted-foreground font-mono">{model}</p>
            )}
          </Field>

          <ModelPickerDialog
            open={modelPickerOpen}
            onOpenChange={setModelPickerOpen}
            value={model}
            onSelect={setModel}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={saveConnection}
              disabled={update.status === 'pending'}
              className="cursor-pointer"
            >
              {update.status === 'pending' && <Spinner className="mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Tipos de documento</CardTitle>
              <CardDescription>
                Configure os tipos de documento e os campos esperados na
                resposta da API.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddForm}
              className="cursor-pointer shrink-0"
            >
              <PlusIcon className="size-4 mr-1" />
              Novo tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {config.documentTypes.length === 0 && (
            <Empty className="py-6">
              <EmptyTitle>Nenhum tipo configurado</EmptyTitle>
              <EmptyDescription>
                Adicione ao menos um tipo de documento para usar a transcrição.
              </EmptyDescription>
            </Empty>
          )}
          {config.documentTypes.length > 0 && (
            <div className="space-y-3">
              {config.documentTypes.map((dt) => (
                <div
                  key={dt.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{dt.name}</span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {dt.id}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {dt.responseFields.length} campo
                        {dt.responseFields.length !== 1 && 's'}
                      </Badge>
                    </div>
                    {dt.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {dt.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      onClick={() => openEditForm(dt)}
                    >
                      <EditIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteDocType(dt.id)}
                      disabled={update.status === 'pending'}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingType}
        onSave={handleSaveDocType}
        isSaving={update.status === 'pending'}
      />
    </div>
  );
}
