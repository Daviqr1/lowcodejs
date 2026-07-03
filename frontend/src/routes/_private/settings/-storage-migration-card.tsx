import { getRouteApi } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowRightLeftIcon,
  CheckCircle2Icon,
  PlayIcon,
  Trash2Icon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStorageMigrationCleanup } from '@/hooks/tanstack-query/use-storage-migration-cleanup';
import { useStorageMigrationStart } from '@/hooks/tanstack-query/use-storage-migration-start';
import { useStorageMigrationStatus } from '@/hooks/tanstack-query/use-storage-migration-status';
import { useStorageMigrationSocket } from '@/hooks/use-storage-migration-socket';
import { handleApiError } from '@/lib/handle-api-error';

const rootApi = getRouteApi('__root__');

function driverLabel(driver: 'local' | 's3'): string {
  if (driver === 'local') return 'Local (filesystem)';
  return 'Amazon S3';
}

function formatPercent(processed: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, Math.round((processed / total) * 100));
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function StorageMigrationCard(): React.JSX.Element | null {
  const { baseUrl } = rootApi.useLoaderData();
  const status = useStorageMigrationStatus();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = React.useState(false);

  const filesOnPrevious =
    status.data?.by_location[status.data.previous_driver] ?? 0;
  const failedCount = status.data?.by_status.failed ?? 0;
  const migrationInProgress = status.data?.migration_in_progress ?? false;
  const canCleanup = status.data?.can_cleanup ?? false;

  const showBanner = filesOnPrevious > 0 || failedCount > 0;
  let showCleanupCard = !showBanner && canCleanup;
  if (canCleanup === false) showCleanupCard = false;

  // Auto-open modal when migration is running, even if user reloads page.
  React.useEffect(() => {
    if (migrationInProgress) setModalOpen(true);
  }, [migrationInProgress]);

  const start = useStorageMigrationStart({
    onSuccess: (data) => {
      toast.success('Migração iniciada', {
        description: `${data.queued_count} arquivo(s) na fila — job ${data.job_id}`,
      });
      setModalOpen(true);
    },
    onError: (err) =>
      handleApiError(err, { context: 'Erro ao iniciar migração' }),
  });

  const cleanup = useStorageMigrationCleanup({
    onSuccess: (data) => {
      toast.success('Limpeza iniciada', {
        description: `${data.queued_count} arquivo(s) sendo removidos do driver antigo`,
      });
      setCleanupConfirmOpen(false);
      setModalOpen(true);
    },
    onError: (err) =>
      handleApiError(err, { context: 'Erro ao iniciar limpeza' }),
  });

  if (status.isLoading || !status.data) return null;

  return (
    <>
      {showBanner && (
        <Alert className="mb-4">
          <ArrowRightLeftIcon className="size-4" />
          <AlertTitle>
            {filesOnPrevious > 0 &&
              `${filesOnPrevious} arquivo(s) ainda no driver "${driverLabel(status.data.previous_driver)}"`}
            {filesOnPrevious <= 0 &&
              `${failedCount} arquivo(s) falharam na última migração`}
          </AlertTitle>
          <AlertDescription>
            <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
              <div className="text-sm">
                Driver atual:{' '}
                <Badge variant="secondary">
                  {driverLabel(status.data.current_driver)}
                </Badge>
              </div>
              <div className="flex gap-2">
                {failedCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={migrationInProgress || start.isPending}
                    onClick={() => start.mutate({ retry_failed_only: true })}
                  >
                    Tentar novamente ({failedCount})
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={
                    migrationInProgress ||
                    start.isPending ||
                    filesOnPrevious === 0
                  }
                  onClick={() => start.mutate({})}
                >
                  <PlayIcon className="size-4 mr-1" />
                  Migrar agora
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showCleanupCard && (
        <Card className="mb-4 border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Migração concluída
            </CardTitle>
            <CardDescription>
              Todos os arquivos estão no driver{' '}
              {driverLabel(status.data.current_driver)}. Você pode liberar o
              espaço deletando as cópias antigas em{' '}
              {driverLabel(status.data.previous_driver)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              disabled={migrationInProgress || cleanup.isPending}
              onClick={() => setCleanupConfirmOpen(true)}
            >
              <Trash2Icon className="size-4 mr-1" />
              Limpar driver antigo
            </Button>
          </CardContent>
        </Card>
      )}

      <StorageMigrationProgressModal
        baseUrl={baseUrl}
        open={modalOpen}
        onOpenChange={setModalOpen}
        active={migrationInProgress}
      />

      <Dialog
        open={cleanupConfirmOpen}
        onOpenChange={setCleanupConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar limpeza</DialogTitle>
            <DialogDescription>
              Esta ação remove permanentemente os arquivos do driver{' '}
              <strong>{driverLabel(status.data.previous_driver)}</strong>. Esta
              operação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCleanupConfirmOpen(false)}
              disabled={cleanup.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cleanup.mutate()}
              disabled={cleanup.isPending}
            >
              <Trash2Icon className="size-4 mr-1" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ProgressModalProps {
  baseUrl: string;
  open: boolean;

  onOpenChange: (open: boolean) => void;
  active: boolean;
}

function StorageMigrationProgressModal({
  baseUrl,
  open,
  onOpenChange,
  active,
}: ProgressModalProps): React.JSX.Element {
  const ws = useStorageMigrationSocket(baseUrl, open);
  const start = useStorageMigrationStart();

  const total = ws.progress?.total ?? 0;
  const processed = ws.progress?.processed ?? 0;
  const percent = formatPercent(processed, total);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Migração de arquivos em andamento</DialogTitle>
          <DialogDescription>
            Acompanhe o progresso em tempo real. Você pode fechar essa janela —
            a migração continua no servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>
                {processed} / {total} arquivos
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

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Atual</div>
              <div className="truncate">
                {ws.progress?.current_filename ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Falhas</div>
              <div>{ws.progress?.failed_count ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">ETA</div>
              <div>{formatEta(ws.progress?.eta_seconds ?? null)}</div>
            </div>
          </div>

          {ws.failures.length > 0 && (
            <div className="border rounded">
              <div className="p-2 text-sm font-medium bg-muted/50">
                Falhas ({ws.failures.length})
              </div>
              <div className="max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead className="w-12">Tent.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ws.failures.map((f) => (
                      <TableRow key={f._id}>
                        <TableCell className="text-xs truncate max-w-40">
                          {f.filename}
                        </TableCell>
                        <TableCell className="text-xs text-destructive">
                          {f.error}
                        </TableCell>
                        <TableCell className="text-xs">{f.attempts}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-2 border-t flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={start.isPending || active}
                  onClick={() => start.mutate({ retry_failed_only: true })}
                >
                  <AlertCircleIcon className="size-4 mr-1" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {ws.lastCompleted && (
            <Alert>
              <CheckCircle2Icon className="size-4" />
              <AlertTitle>Concluído</AlertTitle>
              <AlertDescription>
                {ws.lastCompleted.succeeded} sucesso(s),{' '}
                {ws.lastCompleted.failed} falha(s) em{' '}
                {Math.round(ws.lastCompleted.duration_ms / 1000)}s.
              </AlertDescription>
            </Alert>
          )}

          {ws.lastError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Erro no job</AlertTitle>
              <AlertDescription>{ws.lastError.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
