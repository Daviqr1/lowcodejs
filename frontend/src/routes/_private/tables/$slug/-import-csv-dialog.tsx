import { getRouteApi } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DownloadIcon,
  LoaderCircleIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useTableRowsImportCsv } from '@/hooks/tanstack-query/use-table-rows-import-csv';
import { useCsvImportSocket } from '@/hooks/use-csv-import-socket';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { downloadCsvFromApi } from '@/lib/csv-export';
import type { Merge } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

type ImportCsvDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { slug: string }
>;

const rootApi = getRouteApi('__root__');

export function ImportCsvDialog({
  ref,
  slug,
  ...rest
}: ImportCsvDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent>
        <DialogClose
          ref={closeRef}
          className="hidden"
        />
        <ImportCsvContent
          slug={slug}
          close={close}
        />
      </DialogContent>
    </Dialog>
  );
}

function ImportCsvContent({
  slug,
  close,
}: {
  slug: string;
  close: () => void;
}): React.JSX.Element {
  const { baseUrl } = rootApi.useLoaderData();

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
    void QueryClient.invalidateQueries({
      queryKey: queryKeys.rows.lists(slug),
    });
    toast.success('Importação concluída!', {
      description: `${socket.completed.imported} importadas, ${socket.completed.skipped} ignoradas`,
    });
  }, [socket.completed, slug]);

  React.useEffect((): void => {
    if (!socket.error) return;
    setPhase('error');
    setErrorMsg(socket.error.message);
  }, [socket.error]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPhase('idle');
    setErrorMsg(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!file) return;
    setPhase('uploading');
    try {
      const result = await importCsv.mutateAsync({ slug, file });
      setJobId(result.jobId);
      setPhase('processing');
    } catch {
      setPhase('error');
      setErrorMsg('Erro ao iniciar importação. Tente novamente.');
    }
  }

  function handleDownloadTemplate(): void {
    void downloadCsvFromApi(
      `/tables/${slug}/rows/imports/csv/template`,
      {},
      `template-${slug}.csv`,
    );
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

  const showFileInput = isIdle || isError;
  const showSubmitButton = isIdle || isError;

  return (
    <React.Fragment>
      <DialogHeader>
        <DialogTitle>Importar CSV</DialogTitle>
        <DialogDescription>
          Baixe o template, preencha com seus dados e envie o arquivo.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
        >
          <DownloadIcon className="size-4 mr-1" />
          Baixar Template
        </Button>

        {showFileInput && (
          <div className="space-y-1">
            <Label htmlFor="csv-file-input">Arquivo CSV</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
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
      </div>

      <DialogFooter>
        {showSubmitButton && (
          <Button
            onClick={(): void => void handleSubmit()}
            disabled={!file || isUploading}
          >
            Importar
          </Button>
        )}

        {isProcessing && (
          <Button disabled>
            <LoaderCircleIcon className="size-4 mr-1 animate-spin" />
            Importando...
          </Button>
        )}

        {isDone && <Button onClick={() => close()}>Fechar</Button>}
      </DialogFooter>
    </React.Fragment>
  );
}
