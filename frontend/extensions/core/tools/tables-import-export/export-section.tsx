import { useMutation } from '@tanstack/react-query';
import { AlertCircleIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableMultiSelect } from '@/components/common/dynamic-table/table-selectors/table-multi-select';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import type { ITable } from '@/lib/interfaces';

type ExportResponse = {
  header: { exportType: string; tablesCount: number; menusCount: number };
  tables: Array<unknown>;
  menus: Array<unknown>;
};

export function ExportTableSection(): React.JSX.Element {
  const [tableIds, setTableIds] = React.useState<Array<string>>([]);
  const [tables, setTables] = React.useState<Array<ITable>>([]);
  const [includeStructure, setIncludeStructure] = React.useState(true);
  const [includeData, setIncludeData] = React.useState(false);
  const [missingTables, setMissingTables] = React.useState<Array<string>>([]);

  const exportType = React.useMemo(() => {
    if (includeStructure && includeData) return 'full';
    if (includeData) return 'data';
    return 'structure';
  }, [includeStructure, includeData]);

  const canExport = tableIds.length > 0 && (includeStructure || includeData);

  const slugs = React.useMemo(
    () => tables.filter((t) => tableIds.includes(t._id)).map((t) => t.slug),
    [tables, tableIds],
  );

  const exportTable = useMutation({
    mutationFn: async function ({
      acknowledge,
    }: {
      acknowledge: boolean;
    }): Promise<ExportResponse> {
      const response = await API.post<ExportResponse>('/tools/export-table', {
        slugs,
        exportType,
        acknowledgeMissingRelationships: acknowledge,
      });
      return response.data;
    },
    onSuccess(data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      let baseName = `lowcodejs-${slugs.length}-tabelas`;
      if (slugs.length === 1) baseName = slugs[0];
      link.href = url;
      link.download = `${baseName}-${exportType}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMissingTables([]);

      let description = `${data.tables.length} tabela(s) baixada(s)`;
      if (data.menus.length > 0) {
        description = `${data.tables.length} tabela(s) e ${data.menus.length} item(ns) de menu incluídos`;
      }
      toast.success('Tabela(s) exportada(s) com sucesso!', { description });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao exportar tabela',
        causeHandlers: {
          MISSING_RELATED_TABLES: (data) => {
            const list = (data.errors?.missingTables ?? '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
            setMissingTables(list);
          },
        },
      });
    },
  });

  const isPending = exportTable.status === 'pending';

  const includeMissing = (): void => {
    // Pull tables full info via hook unavailable here; we don't have ITable
    // for these by id. Use TableMultiSelect's API by setting a placeholder
    // string array? Cleanest: just preserve missing slugs alongside selected
    // slugs in submit, but our selection is by id. Easiest: re-submit with
    // acknowledgeMissingRelationships=false combined with a dedicated call
    // that fetches by slug. We bypass by re-submitting with acknowledge=true.
    exportTable.mutate({ acknowledge: true });
  };

  return (
    <Card data-test-id="export-table-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DownloadIcon className="size-5" />
          Exportar tabela(s)
        </CardTitle>
        <CardDescription>
          Selecione uma ou mais tabelas e o que deseja incluir no arquivo JSON.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Field>
          <FieldLabel>Tabelas</FieldLabel>
          <TableMultiSelect
            value={tableIds}
            onValueChange={(ids, ts) => {
              setTableIds(ids);
              if (ts) setTables(ts);
              setMissingTables([]);
            }}
            placeholder="Selecione uma ou mais tabelas..."
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel>Conteúdo</FieldLabel>
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-structure"
                checked={includeStructure}
                onCheckedChange={(checked) =>
                  setIncludeStructure(checked === true)
                }
                disabled={isPending}
              />
              <div>
                <Label
                  htmlFor="export-structure"
                  className="text-sm font-medium cursor-pointer"
                >
                  Estrutura
                </Label>
                <p className="text-xs text-muted-foreground">
                  Campos, grupos, configurações, layout e menus vinculados
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-data"
                checked={includeData}
                onCheckedChange={(checked) => setIncludeData(checked === true)}
                disabled={isPending}
              />
              <div>
                <Label
                  htmlFor="export-data"
                  className="text-sm font-medium cursor-pointer"
                >
                  Dados
                </Label>
                <p className="text-xs text-muted-foreground">
                  Registros das tabelas, incluindo relacionamentos entre elas
                </p>
              </div>
            </div>
          </div>
        </Field>

        {missingTables.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="size-4 mt-0.5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Relacionamentos fora da seleção
                </p>
                <p className="text-muted-foreground">
                  As tabelas a seguir são referenciadas mas não foram
                  selecionadas. Sem elas, os relacionamentos ficarão vazios na
                  importação:
                </p>
                <p className="font-mono text-xs">{missingTables.join(', ')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setMissingTables([])}
              >
                Voltar para ajustar seleção
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={includeMissing}
              >
                Exportar mesmo assim
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            data-test-id="export-table-submit-btn"
            disabled={!canExport || isPending}
            onClick={() => {
              setMissingTables([]);
              exportTable.mutate({ acknowledge: false });
            }}
          >
            {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
            {!isPending && <DownloadIcon className="size-4" />}
            <span>Exportar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
