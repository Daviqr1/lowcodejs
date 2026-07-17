import { DatabaseIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableCombobox } from '@/components/common/dynamic-table/table-selectors/table-combobox';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { usePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import { cn } from '@/lib/utils';

type GenStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

type TestDataEstimate = {
  requested: number;
  rowBytes: number;
  realTargetQuantity: number;
  simulatedQuantity: number;
  estimatedRealBytes: number;
  estimatedRealBytesHuman: string;
  cappedBy: 'requested' | 'hard_cap' | 'budget';
  willSimulate: boolean;
  warnings: Array<string>;
};

const POLL_INTERVAL_MS = 700;

const intl = (value: number): string => value.toLocaleString('pt-BR');

const toastSuccess = (title: string, description?: string): void => {
  let options: { description: string } | undefined;
  if (description) options = { description };
  toast.success(title, options);
};

const toastError = (title: string, description?: string): void => {
  let options: { description: string } | undefined;
  if (description) options = { description };
  toast.error(title, options);
};

export default function GenerateTestDataTool(): React.JSX.Element {
  const permission = usePermission();

  const [selectedTableId, setSelectedTableId] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<string>('100');

  const [status, setStatus] = React.useState<GenStatus>('idle');
  const [processed, setProcessed] = React.useState<number>(0);
  const [total, setTotal] = React.useState<number>(0);
  const [percentage, setPercentage] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  const [estimate, setEstimate] = React.useState<TestDataEstimate | null>(null);
  const [isEstimating, setIsEstimating] = React.useState<boolean>(false);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = React.useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  React.useEffect(() => stopPolling, [stopPolling]);

  const isGenerating = status === 'pending' || status === 'processing';

  const startPolling = React.useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await API.get(
            `/tools/generate-test-data/status/${jobId}`,
          );
          setStatus(data.status);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setPercentage(data.percentage ?? 0);
          setError(data.error ?? null);

          if (data.status === 'completed') {
            stopPolling();
            toastSuccess(
              'Geração concluída',
              `${(data.total ?? 0).toLocaleString('pt-BR')} registros gerados.`,
            );
          } else if (data.status === 'failed') {
            stopPolling();
            toastError(
              'Falha na geração',
              data.error ?? 'Erro desconhecido durante a geração.',
            );
          }
        } catch (err) {
          stopPolling();
          setStatus('failed');
          handleApiError(err, { context: 'Erro ao consultar progresso' });
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const handleEstimate = React.useCallback(async () => {
    const qty = Number(quantity);
    if (!selectedTableId || !Number.isFinite(qty) || qty < 1 || isEstimating) {
      return;
    }

    setIsEstimating(true);
    setEstimate(null);
    try {
      const { data } = await API.post<TestDataEstimate>(
        '/tools/generate-test-data/estimate',
        { tableId: selectedTableId, quantity: qty },
      );
      setEstimate(data);
    } catch (err) {
      handleApiError(err, {
        context: 'Erro ao estimar geração de dados',
        causeHandlers: {
          TABLE_NOT_FOUND: () =>
            toastError(
              'Tabela não encontrada',
              'A tabela selecionada não foi encontrada.',
            ),
          EXTENSION_NOT_ACTIVE: () =>
            toastError(
              'Ferramenta inativa',
              'A extensão Gerador de Dados de Teste foi desativada.',
            ),
        },
      });
    } finally {
      setIsEstimating(false);
    }
  }, [quantity, selectedTableId, isEstimating]);

  const handleGenerate = React.useCallback(async () => {
    const qty = Number(quantity);
    if (!selectedTableId || !Number.isFinite(qty) || qty < 1 || isGenerating) {
      return;
    }

    setEstimate(null);
    setStatus('pending');
    setProcessed(0);
    setTotal(qty);
    setPercentage(0);
    setError(null);

    try {
      const { data } = await API.post('/tools/generate-test-data', {
        tableId: selectedTableId,
        quantity: qty,
      });
      startPolling(data.jobId);
    } catch (err) {
      setStatus('failed');
      handleApiError(err, {
        context: 'Erro ao iniciar geração de dados',
        causeHandlers: {
          TABLE_NOT_FOUND: () =>
            toastError(
              'Tabela não encontrada',
              'A tabela selecionada não foi encontrada.',
            ),
          EXTENSION_NOT_ACTIVE: () =>
            toastError(
              'Ferramenta inativa',
              'A extensão Gerador de Dados de Teste foi desativada.',
            ),
        },
      });
    }
  }, [quantity, selectedTableId, isGenerating, startPolling]);

  const statusLabel: Record<GenStatus, string> = {
    idle: '',
    pending: 'Iniciando...',
    processing: 'Gerando registros...',
    completed: 'Concluído',
    failed: 'Falhou',
  };

  return (
    <PageShell data-test-id="tool-generate-test-data">
      <PageShell.Header>
        <PageHeader title="Gerador de Dados de Teste" />
      </PageShell.Header>

      <PageShell.Content className="p-4">
        {permission.isLoading && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {!permission.isLoading && !permission.can('CREATE_TABLE') && (
          <AccessDenied />
        )}
        {!permission.isLoading && permission.can('CREATE_TABLE') && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5" />
                Gerador de Registros para Teste
              </CardTitle>
              <CardDescription>
                Insere registros fictícios em massa numa tabela para testar
                listagem, paginação e performance. Estime primeiro para ver
                quantos registros serão inseridos de verdade (teto por orçamento
                de memória/disco) e quanto será simulado — acima do teto o
                progresso é simulado até o total pedido.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="max-w-md space-y-4">
                <Field>
                  <FieldLabel>Tabela alvo</FieldLabel>
                  <TableCombobox
                    value={selectedTableId}
                    onValueChange={(value) => {
                      setSelectedTableId(value);
                      setEstimate(null);
                    }}
                    placeholder="Selecione uma tabela"
                    disabled={isGenerating}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="gen-quantity">Quantidade</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="gen-quantity"
                      type="number"
                      min={1}
                      max={10000000000000}
                      placeholder="ex: 1000"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        setEstimate(null);
                      }}
                      disabled={isGenerating}
                    />
                  </InputGroup>
                </Field>

                {estimate && !isGenerating && (
                  <div
                    className="space-y-2 rounded-md border p-3 text-sm"
                    data-test-id="generate-test-data-estimate"
                  >
                    <p className="font-medium">Estimativa</p>
                    <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
                      <span>Tamanho por linha</span>
                      <span className="text-right">~{estimate.rowBytes} B</span>
                      <span>Inseridos de verdade</span>
                      <span className="text-foreground text-right font-medium">
                        {intl(estimate.realTargetQuantity)} (~
                        {estimate.estimatedRealBytesHuman})
                      </span>
                      <span>Simulados</span>
                      <span className="text-right">
                        {intl(estimate.simulatedQuantity)}
                      </span>
                    </div>
                    {estimate.warnings.length > 0 && (
                      <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
                        {estimate.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {!estimate && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !selectedTableId || isEstimating || isGenerating
                      }
                      onClick={handleEstimate}
                      data-test-id="estimate-test-data-btn"
                    >
                      {isEstimating && <Spinner />}
                      <span>
                        {isEstimating && 'Estimando...'}
                        {!isEstimating && 'Estimar'}
                      </span>
                    </Button>
                  )}
                  {estimate && (
                    <Button
                      type="button"
                      disabled={!selectedTableId || isGenerating}
                      onClick={handleGenerate}
                      data-test-id="generate-test-data-btn"
                    >
                      {isGenerating && <Spinner />}
                      <span>
                        {isGenerating && 'Gerando...'}
                        {!isGenerating && 'Confirmar e gerar'}
                      </span>
                    </Button>
                  )}
                </div>

                {status !== 'idle' && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={cn(
                          'font-medium',
                          status === 'failed' && 'text-destructive',
                          status === 'completed' && 'text-primary',
                        )}
                      >
                        {statusLabel[status]}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {percentage}%
                      </span>
                    </div>

                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          status === 'failed' && 'bg-destructive',
                          status !== 'failed' && 'bg-primary',
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>

                    <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
                      <span>
                        {processed.toLocaleString('pt-BR')} processados
                      </span>
                      <span>{total.toLocaleString('pt-BR')} no total</span>
                    </div>

                    {error && (
                      <p className="text-destructive text-xs">{error}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </PageShell.Content>
    </PageShell>
  );
}
