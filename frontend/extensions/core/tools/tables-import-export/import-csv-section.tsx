import { getRouteApi } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DownloadIcon,
  LoaderCircleIcon,
  UploadIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableComboboxPaginated } from '@/components/common/dynamic-table/table-selectors/table-combobox-paginated';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useTableRowsImportCsv } from '@/hooks/tanstack-query/use-table-rows-import-csv';
import { useCsvImportSocket } from '@/hooks/use-csv-import-socket';
import { downloadCsvFromApi } from '@/lib/csv-export';
import { QueryClient } from '@/lib/query-client';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const rootApi = getRouteApi('__root__');

export function ImportCsvSection(): React.JSX.Element {
  const { baseUrl } = rootApi.useLoaderData();

  const [tableId, setTableId] = React.useState<string>('');
  const [tableSlug, setTableSlug] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  let activeJobId: string | null = null;
  if (phase === 'processing') {
    activeJobId = jobId;
  }
  const socket = useCsvImportSocket(baseUrl, activeJobId);

  const importCsv = useTableRowsImportCsv();

  React.useEffect((): void => {
    if (!socket.completed) return;
    setPhase('done');
    if (tableSlug) {
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(tableSlug),
      });
    }
    toast.success('Importação concluída!', {
      description: `${socket.completed.imported} importadas, ${socket.completed.skipped} ignoradas`,
    });
  }, [socket.completed, tableSlug]);

  React.useEffect((): void => {
    if (!socket.error) return;
    setPhase('error');
    setErrorMsg(socket.error.message);
  }, [socket.error]);

  function handleTableChange(id: string, slug?: string): void {
    setTableId(id);
    setTableSlug(slug ?? null);
    resetFileState();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPhase('idle');
    setErrorMsg(null);
  }

  function resetFileState(): void {
    setFile(null);
    setPhase('idle');
    setJobId(null);
    setErrorMsg(null);
  }

  function resetAll(): void {
    setTableId('');
    setTableSlug(null);
    resetFileState();
  }

  function handleDownloadTemplate(): void {
    if (!tableSlug) return;
    void downloadCsvFromApi(
      `/tables/${tableSlug}/rows/imports/csv/template`,
      {},
      `template-${tableSlug}.csv`,
    );
  }

  async function handleSubmit(): Promise<void> {
    if (!file || !tableSlug) return;
    setPhase('uploading');
    try {
      const result = await importCsv.mutateAsync({ slug: tableSlug, file });
      setJobId(result.jobId);
      setPhase('processing');
    } catch {
      setPhase('error');
      setErrorMsg('Erro ao iniciar importação. Tente novamente.');
    }
  }

  function calculatePercent(): number {
    if (!socket.progress || socket.progress.total === 0) return 0;
    return Math.min(
      100,
      Math.round((socket.progress.processed / socket.progress.total) * 100),
    );
  }
  const percent = calculatePercent();

  const isIdle = phase === 'idle';
  const isUploading = phase === 'uploading';
  const isProcessing = phase === 'processing';
  const isDone = phase === 'done';
  const isError = phase === 'error';

  const isBusy = isUploading || isProcessing;
  const showFileInput = (isIdle || isError) && Boolean(tableSlug);
  const showSubmitButton = isIdle || isError;

  return (
    <Card data-test-id="import-csv-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="size-5" />
          Importar linhas via CSV
        </CardTitle>
        <CardDescription>
          Selecione uma tabela, baixe o template com os campos disponíveis e
          envie o arquivo CSV preenchido.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Field>
          <FieldLabel>Tabela</FieldLabel>
          <TableComboboxPaginated
            value={tableId}
            onValueChange={handleTableChange}
            placeholder="Selecione uma tabela..."
            disabled={isBusy}
          />
        </Field>

        {tableSlug && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isBusy}
          >
            <DownloadIcon className="size-4 mr-1" />
            Baixar Template CSV
          </Button>
        )}

        {showFileInput && (
          <div className="space-y-1">
            <Label htmlFor="import-csv-file-input">Arquivo CSV</Label>
            <Input
              id="import-csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isBusy}
            />
            {file && (
              <p className="text-sm text-muted-foreground">{file.name}</p>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {socket.progress?.processed ?? 0} /{' '}
                {socket.progress?.total ?? 0} linhas
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded">
              <div
                className="h-2 bg-primary rounded transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {isDone && socket.completed && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircleIcon className="size-4 text-emerald-600" />
            <span>
              Importação concluída! {socket.completed.imported} linhas
              importadas, {socket.completed.skipped} ignoradas.
            </span>
          </div>
        )}

        {isError && errorMsg && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {isDone && (
            <Button
              variant="outline"
              onClick={resetAll}
            >
              Nova importação
            </Button>
          )}

          {showSubmitButton && (
            <Button
              type="button"
              data-test-id="import-csv-submit-btn"
              disabled={!file || !tableSlug || isUploading}
              onClick={(): void => void handleSubmit()}
            >
              <UploadIcon className="size-4" />
              Importar
            </Button>
          )}

          {isProcessing && (
            <Button disabled>
              <LoaderCircleIcon className="size-4 mr-1 animate-spin" />
              Importando...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
