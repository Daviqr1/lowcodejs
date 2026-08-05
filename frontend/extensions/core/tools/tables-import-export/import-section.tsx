import { useMutation } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  LoaderCircleIcon,
  UploadIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { useTableImportSocket } from './use-table-import-socket';
import type { TableImportPhase } from './use-table-import-socket';

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
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import type { Merge } from '@/lib/interfaces';
import { getQueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';

const rootApi = getRouteApi('__root__');

const PHASE_LABELS: Record<TableImportPhase, string> = {
  structure: 'Criando estrutura das tabelas',
  rows: 'Importando registros',
  relationships: 'Religando relacionamentos',
  menus: 'Finalizando',
};

/**
 * Converte o evento de progresso real do backend num percentual da barra. A
 * fase `rows` é a parte longa e ganha a maior faixa (15→80%), proporcional aos
 * registros já inseridos.
 */
function phaseToPercent(progress: {
  phase: TableImportPhase;
  processed: number;
  total: number;
}): number {
  switch (progress.phase) {
    case 'structure':
      return 12;
    case 'rows':
      if (progress.total > 0) {
        return 15 + (progress.processed / progress.total) * 65;
      }
      return 50;
    case 'relationships':
      return 85;
    case 'menus':
      return 90;
    default:
      return 0;
  }
}

/**
 * Piso por tempo: garante que a barra sempre avance suavemente (desacelerando)
 * mesmo quando os eventos do WebSocket chegam espaçados ou não chegam — assim
 * nunca fica congelada nem trava num valor fixo esperando o fim.
 */
function timeCreep(elapsedMs: number): number {
  return 90 * (1 - Math.exp(-elapsedMs / 5000));
}

/**
 * Nome da etapa a partir do percentual atual — usado quando não há eventos do
 * WebSocket, para que os nomes das fases ainda apareçam conforme a barra sobe.
 */
function labelFromPercent(percent: number): string {
  if (percent < 18) return PHASE_LABELS.structure;
  if (percent < 70) return PHASE_LABELS.rows;
  if (percent < 88) return PHASE_LABELS.relationships;
  return PHASE_LABELS.menus;
}

type ImportFileV1 = {
  header: {
    platform: string;
    tableName?: string;
    exportType?: string;
    version?: string;
    exportedBy?: string;
    exportedAt?: string;
  };
  structure?: {
    name?: string;
    slug?: string;
    fields?: Array<unknown>;
    groups?: Array<{ fields?: Array<unknown> }>;
  };
  data?: { totalRows: number };
};

type ImportFileV2 = {
  header: {
    platform: string;
    tableName?: string;
    version?: string;
    exportType?: string;
    tablesCount?: number;
    menusCount?: number;
    exportedBy?: string;
    exportedAt?: string;
  };
  tables: Array<{
    // Identidade — presente também em exports "somente dados" (sem structure).
    tableSlug?: string;
    tableName?: string;
    structure?: {
      name: string;
      slug: string;
      fields?: Array<unknown>;
      groups?: Array<unknown>;
    };
    data?: { totalRows: number };
  }>;
  menus: Array<{ slug: string; name: string }>;
};

type ImportFileContent = ImportFileV1 | ImportFileV2;

function isV2(file: ImportFileContent): file is ImportFileV2 {
  return 'tables' in file && Array.isArray(file.tables);
}

function countGroupFields(group: unknown): number {
  if (typeof group !== 'object' || group === null) return 0;
  if (!('fields' in group)) return 0;
  const fields = group.fields;
  if (!Array.isArray(fields)) return 0;
  return fields.length;
}

function isImportTableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('response' in error)) return false;
  const response = error.response;
  if (typeof response !== 'object' || response === null) return false;
  if (!('data' in response)) return false;
  const data = response.data;
  if (typeof data !== 'object' || data === null) return false;
  if (!('cause' in data)) return false;
  return data.cause === 'IMPORT_TABLE_ERROR';
}

/**
 * Slug de pré-visualização. O backend é a fonte da verdade (usa `slugify` com
 * `strict`), mas isso aproxima o resultado para o usuário ver o efeito da
 * renomeação antes de importar.
 */
function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function summarizeFile(file: ImportFileContent): {
  tables: Array<{ name: string; slug: string; rows: number }>;
  menus: Array<{ slug: string; name: string }>;
  totalFields: number;
} {
  if (isV2(file)) {
    const tables = file.tables.map((t) => ({
      name: t.structure?.name ?? t.tableName ?? '—',
      slug: t.structure?.slug ?? t.tableSlug ?? '—',
      rows: t.data?.totalRows ?? 0,
    }));
    const totalFields = file.tables.reduce((acc, t) => {
      const top = t.structure?.fields?.length ?? 0;
      const grp = (t.structure?.groups ?? []).reduce(
        (a: number, g) => a + countGroupFields(g),
        0,
      );
      return acc + top + grp;
    }, 0);
    return { tables, menus: file.menus ?? [], totalFields };
  }
  const legacy = file;
  const struct = legacy.structure;
  const top = struct?.fields?.length ?? 0;
  const grp = (struct?.groups ?? []).reduce(
    (a, g) => a + (g.fields?.length ?? 0),
    0,
  );
  return {
    tables: [
      {
        name: struct?.name ?? legacy.header.tableName ?? '—',
        slug: struct?.slug ?? '—',
        rows: legacy.data?.totalRows ?? 0,
      },
    ],
    menus: [],
    totalFields: top + grp,
  };
}

export function ImportTableSection(): React.JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] =
    React.useState<ImportFileContent | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  // Nome editável por tabela, chaveado pelo slug ORIGINAL do pacote.
  const [tableNames, setTableNames] = React.useState<Record<string, string>>(
    {},
  );
  // Nome editável por item de menu, chaveado pelo slug ORIGINAL do menu.
  const [menuNames, setMenuNames] = React.useState<Record<string, string>>({});
  const [conflicts, setConflicts] = React.useState<{
    tables: Array<string>;
    menus: Array<string>;
  } | null>(null);
  const navigate = useNavigate();
  const { baseUrl } = rootApi.useLoaderData();

  // Progresso da importação. A barra segue os eventos reais do backend (via
  // WebSocket `/table-import`); o tempo decorrido (`elapsed`) alimenta um piso
  // que mantém a barra avançando suavemente entre eventos.
  const jobIdRef = React.useRef<string | null>(null);
  const [activeJobId, setActiveJobId] = React.useState<string | null>(null);
  const [progressNonce, setProgressNonce] = React.useState(0);
  const progressTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const ws = useTableImportSocket(baseUrl, activeJobId);

  let summary: ReturnType<typeof summarizeFile> | null = null;
  if (fileContent) summary = summarizeFile(fileContent);
  // Export "somente dados": não recria estrutura — apenas insere linhas em
  // tabelas que já existem (casadas por slug). Não há renomeação nesse modo.
  const isDataOnly = fileContent?.header.exportType === 'data';
  // Arquivos de dados exportados antes do campo de identidade (tableSlug):
  // não dá para saber em qual tabela inserir → precisa reexportar.
  const dataNeedsReexport =
    isDataOnly && (summary?.tables.some((t) => t.slug === '—') ?? false);

  const resetState = (): void => {
    setFileError(null);
    setFileContent(null);
    setTableNames({});
    setMenuNames({});
    setConflicts(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    resetState();

    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setFileError('O arquivo deve ser um JSON (.json)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event): void => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const parsed: ImportFileContent = JSON.parse(result);

        if (!parsed.header || parsed.header.platform !== 'lowcodejs') {
          setFileError(
            'Arquivo inválido. O arquivo deve ter sido exportado pela plataforma LowCodeJS.',
          );
          return;
        }

        const parsedSummary = summarizeFile(parsed);
        if (parsedSummary.tables.length === 0) {
          setFileError(
            'O arquivo não contém estrutura de tabela. Exporte com a opção "Estrutura" habilitada.',
          );
          return;
        }

        setFileContent(parsed);
        setTableNames(
          Object.fromEntries(parsedSummary.tables.map((t) => [t.slug, t.name])),
        );
        setMenuNames(
          Object.fromEntries(parsedSummary.menus.map((m) => [m.slug, m.name])),
        );
      } catch {
        setFileError('Erro ao ler o arquivo. Verifique se é um JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const updateTableName = (originalSlug: string, value: string): void => {
    setTableNames((prev) => ({ ...prev, [originalSlug]: value }));
    setConflicts(null);
  };

  const updateMenuName = (originalSlug: string, value: string): void => {
    setMenuNames((prev) => ({ ...prev, [originalSlug]: value }));
    setConflicts(null);
  };

  const importTable = useMutation({
    mutationFn: async function (): Promise<{
      tableId: string;
      slug: string;
      importedFields: number;
      importedRows: number;
      importedMenus: number;
      tables: Array<{ tableId: string; slug: string; name: string }>;
    }> {
      const body: Record<string, unknown> = { fileContent };
      // Correlaciona com o feed de progresso WebSocket.
      if (jobIdRef.current) body.jobId = jobIdRef.current;
      // No modo "somente dados" não há renomeação — os dados entram nas tabelas
      // existentes casadas por slug. Renomear só vale para estrutura/completo.
      if (!isDataOnly) {
        // Envia apenas as tabelas cujo nome foi de fato alterado — as demais
        // mantêm nome/slug originais. Relacionamentos são preservados pelo
        // backend independentemente da renomeação.
        const renamed = (summary?.tables ?? [])
          .map((t) => ({
            slug: t.slug,
            name: (tableNames[t.slug] ?? t.name).trim(),
          }))
          .filter((t) => t.name && t.name !== originalNameOf(t.slug));
        if (renamed.length > 0) body.tables = renamed;
        // Idem para itens de menu — só os renomeados. Menus-pai já existentes
        // são reaproveitados pelo backend; só os itens folha podem conflitar.
        const renamedMenus = (summary?.menus ?? [])
          .map((m) => ({
            slug: m.slug,
            name: (menuNames[m.slug] ?? m.name).trim(),
          }))
          .filter((m) => m.name && m.name !== originalMenuNameOf(m.slug));
        if (renamedMenus.length > 0) body.menus = renamedMenus;
      }
      const response = await API.post('/tools/import-table', body);
      return response.data;
    },
    onSuccess(data) {
      resetState();
      if (fileInputRef.current) fileInputRef.current.value = '';

      getQueryClient().invalidateQueries({ queryKey: queryKeys.tables.lists() });
      getQueryClient().invalidateQueries({ queryKey: queryKeys.menus.all });

      toast.success('Importação concluída!', {
        description: `${data.tables.length} tabela(s), ${data.importedFields} campo(s), ${data.importedRows} registro(s) e ${data.importedMenus} item(ns) de menu`,
      });

      if (data.tables.length === 1) {
        navigate({
          to: '/tables/$slug',
          params: { slug: data.slug },
        });
      }
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao importar tabela',
        causeHandlers: {
          IMPORT_CONFLICTS: (errorData) => {
            applyConflicts(
              splitSlugs(errorData.errors?.tables),
              splitSlugs(errorData.errors?.menus),
            );
          },
          TABLE_SLUG_ALREADY_EXISTS: (errorData) => {
            applyConflicts(splitSlugs(errorData.errors?.tables), []);
          },
          DUPLICATE_TABLE_SLUGS: (errorData) => {
            applyConflicts(splitSlugs(errorData.errors?.tables), []);
          },
          DUPLICATE_MENU_SLUGS: (errorData) => {
            applyConflicts([], splitSlugs(errorData.errors?.menus));
          },
        },
      });

      // Conflitos/validação têm UI inline (acima) — fecha o modal de progresso
      // para não cobri-la. Só erro interno (IMPORT_TABLE_ERROR) permanece
      // visível no modal, junto do evento `error` do WebSocket.
      if (!isImportTableError(error)) closeProgress();
    },
  });

  function originalNameOf(originalSlug: string): string {
    return summary?.tables.find((t) => t.slug === originalSlug)?.name ?? '';
  }

  function originalMenuNameOf(originalSlug: string): string {
    return summary?.menus.find((m) => m.slug === originalSlug)?.name ?? '';
  }

  function splitSlugs(raw: string | undefined): Array<string> {
    return (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Apenas marca os itens conflitantes (tabelas e menus). NÃO renomeia
  // automaticamente — o usuário escolhe o novo nome. Auto-preencher um
  // sufixo dava a falsa impressão de que o conflito persistia mesmo após
  // a sugestão aplicada.
  function applyConflicts(
    tableSlugs: Array<string>,
    menuSlugs: Array<string>,
  ): void {
    setConflicts({ tables: tableSlugs, menus: menuSlugs });
  }

  function closeProgress(): void {
    setActiveJobId(null);
    jobIdRef.current = null;
    setElapsed(0);
  }

  function startImport(): void {
    const id = globalThis.crypto?.randomUUID?.() ?? `job-${Date.now()}`;
    jobIdRef.current = id;
    setConflicts(null);
    setActiveJobId(id); // conecta o socket (progresso real de registros)
    setElapsed(0);
    setProgressNonce((value) => value + 1);
    importTable.mutate(); // dispara já — a barra começa a encher no clique
  }

  React.useEffect(() => {
    if (progressNonce > 0) progressTriggerRef.current?.click();
  }, [progressNonce]);

  // Cronômetro do progresso: alimenta o piso de tempo (`timeCreep`) enquanto a
  // importação está em andamento. Para quando ela conclui ou falha.
  React.useEffect(() => {
    if (!activeJobId || importTable.isSuccess || importTable.isError) return;
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return (): void => clearInterval(interval);
  }, [activeJobId, importTable.isSuccess, importTable.isError]);

  const isPending = importTable.status === 'pending';

  const allNamesFilled =
    summary !== null &&
    summary.tables.every((t) => (tableNames[t.slug] ?? '').trim().length > 0);

  const conflictingMenusFilled =
    conflicts === null ||
    conflicts.menus.every((slug) => (menuNames[slug] ?? '').trim().length > 0);

  // No modo "somente dados" não há nomes a preencher — basta o arquivo válido
  // e com identidade de tabela (tableSlug).
  let canImport =
    Boolean(fileContent) && allNamesFilled && conflictingMenusFilled;
  if (isDataOnly) canImport = Boolean(fileContent) && !dataNeedsReexport;

  const conflictingTableSlugs = new Set(conflicts?.tables ?? []);
  const conflictingMenuSlugs = conflicts?.menus ?? [];

  let exportTypeLabel = 'Dados';
  if (fileContent?.header.exportType === 'full') {
    exportTypeLabel = 'Estrutura + Dados';
  }
  if (fileContent?.header.exportType === 'structure') {
    exportTypeLabel = 'Estrutura';
  }

  let importResult: typeof importTable.data | null = null;
  if (importTable.isSuccess) importResult = importTable.data;

  return (
    <>
      <Card data-test-id="import-table-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="size-5" />
            Importar tabela(s)
          </CardTitle>
          <CardDescription>
            Carregue um arquivo JSON exportado pela plataforma. Suporta pacotes
            com várias tabelas, relacionamentos e itens de menu.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">Arquivo JSON</Label>
            <Input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isPending}
              className="cursor-pointer"
            />
          </div>

          {fileError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {fileContent && summary && (
            <div className="space-y-3 p-3 rounded-md border bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircleIcon className="size-4" />
                <span className="font-medium">Arquivo válido</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Exportado por:</span>
                  <p className="font-medium">
                    {fileContent.header.exportedBy ?? '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{exportTypeLabel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tabelas:</span>
                  <p className="font-medium">{summary.tables.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Campos:</span>
                  <p className="font-medium">{summary.totalFields}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Menus:</span>
                  <p className="font-medium">{summary.menus.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">
                    {fileContent.header.exportedAt &&
                      new Date(
                        fileContent.header.exportedAt,
                      ).toLocaleDateString('pt-BR')}
                    {!fileContent.header.exportedAt && '—'}
                  </p>
                </div>
              </div>

              {isDataOnly && (
                <div className="space-y-2 pt-2 border-t text-sm">
                  {dataNeedsReexport && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                      <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
                      <span>
                        Este arquivo foi exportado numa versão anterior e não
                        identifica as tabelas de destino. Reexporte os dados na
                        versão atual da plataforma e tente novamente.
                      </span>
                    </div>
                  )}
                  {!dataNeedsReexport && (
                    <div className="text-muted-foreground">
                      Os dados serão inseridos nestas tabelas já existentes
                      (casadas pelo slug):
                    </div>
                  )}
                  <ul className="space-y-2">
                    {summary.tables.map((t, index) => (
                      <li
                        key={`${t.slug}-${index}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            /{t.slug}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t.rows} registro(s)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!isDataOnly && (
                <div className="space-y-2 pt-2 border-t text-sm">
                  <div className="text-muted-foreground">
                    Tabelas a importar — ajuste o nome se quiser (os
                    relacionamentos entre as tabelas são preservados):
                  </div>
                  <ul className="space-y-3">
                    {summary.tables.map((t) => {
                      const value = tableNames[t.slug] ?? t.name;
                      const previewSlug = toSlug(value) || t.slug;
                      const isConflicting = conflictingTableSlugs.has(t.slug);
                      return (
                        <li
                          key={t.slug}
                          className="space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              aria-label={`Nome da tabela ${t.name}`}
                              value={value}
                              onChange={(e) =>
                                updateTableName(t.slug, e.target.value)
                              }
                              placeholder="Nome da tabela"
                              maxLength={40}
                              disabled={isPending}
                              className={cn(
                                'h-8',
                                isConflicting &&
                                  'border-destructive focus-visible:ring-destructive/40',
                              )}
                            />
                            {t.rows > 0 && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {t.rows} registro(s)
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              'font-mono text-xs',
                              isConflicting && 'text-destructive',
                              !isConflicting && 'text-muted-foreground',
                            )}
                          >
                            /{previewSlug}
                            {isConflicting &&
                              ' — já existe, escolha outro nome'}
                          </p>
                        </li>
                      );
                    })}
                    {summary.menus.length > 0 && (
                      <li className="pt-1 text-xs text-muted-foreground">
                        + {summary.menus.length} item(ns) de menu
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {conflicts && (
            <div className="space-y-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="size-4 mt-0.5 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    Conflitos de slug — nada foi importado
                  </p>
                  {conflicts.tables.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Renomeie a(s) tabela(s) destacada(s) acima e clique em
                      Importar novamente.
                    </p>
                  )}
                  {conflictingMenuSlugs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Itens de menu já existentes. Ajuste o nome abaixo e
                      importe novamente — os menus-pai já existentes são
                      reaproveitados automaticamente.
                    </p>
                  )}
                </div>
              </div>

              {conflictingMenuSlugs.length > 0 && (
                <ul className="space-y-3 pl-6">
                  {conflictingMenuSlugs.map((slug) => {
                    const value =
                      menuNames[slug] ?? originalMenuNameOf(slug) ?? slug;
                    const previewSlug = toSlug(value) || slug;
                    return (
                      <li
                        key={slug}
                        className="space-y-1"
                      >
                        <Input
                          aria-label={`Nome do menu ${originalMenuNameOf(slug) || slug}`}
                          value={value}
                          onChange={(e) => updateMenuName(slug, e.target.value)}
                          placeholder="Nome do item de menu"
                          maxLength={120}
                          disabled={isPending}
                          className="h-8 border-destructive focus-visible:ring-destructive/40"
                        />
                        <p className="font-mono text-xs text-destructive">
                          /{previewSlug} — slug original: /{slug}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              data-test-id="import-table-submit-btn"
              disabled={!canImport || isPending}
              onClick={startImport}
            >
              {isPending && (
                <LoaderCircleIcon className="size-4 animate-spin" />
              )}
              {!isPending && <UploadIcon className="size-4" />}
              <span>Importar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImportProgressModal
        key={progressNonce}
        ref={progressTriggerRef}
        onClose={closeProgress}
        elapsed={elapsed}
        progress={ws.progress}
        wsError={ws.error?.message ?? null}
        result={importResult}
        hardError={importTable.isError && isImportTableError(importTable.error)}
      />
    </>
  );
}

type ImportProgressModalProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    onClose: () => void;
    /** Tempo decorrido (ms) desde o início — alimenta o piso da barra. */
    elapsed: number;
    progress: {
      phase: TableImportPhase;
      processed: number;
      total: number;
      current_table: string | null;
      failed: number;
    } | null;
    wsError: string | null;
    result: {
      importedFields: number;
      importedRows: number;
      importedMenus: number;
      tables: Array<{ slug: string; name: string }>;
    } | null;
    hardError: boolean;
  }
>;

function ImportProgressModal({
  ref,
  onClose,
  elapsed,
  progress,
  wsError,
  result,
  hardError,
  ...rest
}: ImportProgressModalProps): React.JSX.Element {
  const failed = hardError || wsError !== null;
  const done = !failed && result !== null;

  // A barra é o maior valor entre o progresso REAL (eventos do backend) e o
  // piso por tempo — capado em 96% até a importação concluir de fato (→ 100%).
  let realPct = 0;
  if (progress) realPct = phaseToPercent(progress);
  let percent = Math.round(Math.min(96, Math.max(timeCreep(elapsed), realPct)));
  if (done) percent = 100;

  let label = labelFromPercent(percent);
  if (progress) label = PHASE_LABELS[progress.phase];
  if (done) label = 'Concluído';

  let dismissVariant: 'default' | 'ghost' = 'ghost';
  if (done || failed) dismissVariant = 'default';

  // Contagem real de registros (quando há volume e o WebSocket está entregando).
  const showLiveRows =
    !done && !failed && progress != null && progress.total > 0;

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={() => onClose()}
        onPointerDownOutside={() => onClose()}
      >
        <DialogHeader>
          <DialogTitle>
            {done && 'Importação concluída'}
            {!done && failed && 'Falha na importação'}
            {!done && !failed && 'Importando tabela(s)'}
          </DialogTitle>
          <DialogDescription>
            {done && 'Os dados foram importados com sucesso.'}
            {!done && failed && 'A importação não foi concluída.'}
            {!done &&
              !failed &&
              'Isso pode levar alguns segundos. Você pode ocultar esta janela — a importação continua no servidor.'}
          </DialogDescription>
        </DialogHeader>

        {!failed && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span>{percent}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded overflow-hidden">
                <div
                  className="h-2 bg-primary rounded transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {showLiveRows && progress && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Registros</div>
                  <div>
                    {progress.processed} / {progress.total}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tabela</div>
                  <div className="truncate">
                    {progress.current_table ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Falhas</div>
                  <div>{progress.failed}</div>
                </div>
              </div>
            )}

            {done && result && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-500/10 text-emerald-700 text-sm">
                <CheckCircleIcon className="size-4 mt-0.5 shrink-0" />
                <span>
                  {result.tables.length} tabela(s), {result.importedFields}{' '}
                  campo(s), {result.importedRows} registro(s) e{' '}
                  {result.importedMenus} item(ns) de menu importados.
                </span>
              </div>
            )}
          </div>
        )}

        {failed && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
            <span>
              {wsError ??
                'Erro interno ao importar. Nenhuma alteração foi concluída.'}
            </span>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant={dismissVariant}
              onClick={onClose}
            >
              {(done || failed) && 'Fechar'}
              {!(done || failed) && 'Ocultar'}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
