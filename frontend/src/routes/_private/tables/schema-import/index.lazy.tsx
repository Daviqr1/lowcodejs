import Editor from '@monaco-editor/react';
import { Link, createLazyFileRoute, useRouter } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  EraserIcon,
  FileTextIcon,
  PlayIcon,
  UploadIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { SchemaReference } from './-schema-reference';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSchemaImport } from '@/hooks/tanstack-query/use-schema-import';
import { handleApiError } from '@/lib/handle-api-error';
import type { SchemaImportResponse } from '@/lib/payloads';

const EXAMPLE_YAML = `# Schema de exemplo — cobre os tipos mais comuns
# Consulte o painel "Referência" ao lado para todos os tipos suportados.

tables:
  - name: Clientes
    visibility: PRIVATE       # opcional: PRIVATE | RESTRICTED | OPEN | FORM | PUBLIC
    style: LIST               # opcional: LIST | GALLERY | CARD | KANBAN | CALENDAR | ...
    fields:
      - name: Nome Completo
        type: TEXT_SHORT
        required: true

      - name: Email
        type: TEXT_SHORT
        format: EMAIL           # formatos: EMAIL, URL, PHONE, CPF, CNPJ, INTEGER, DECIMAL...
        required: true

      # "Numeros" no LowCodeJS sao TEXT_SHORT + format INTEGER/DECIMAL.
      - name: Idade
        type: TEXT_SHORT
        format: INTEGER

      - name: Status
        type: DROPDOWN
        options:
          - label: Ativo
            color: "#22c55e"
          - label: Inativo
            color: "#ef4444"

      - name: Aniversario
        type: DATE
        format: DD_MM_YYYY      # ou: dd/MM/yyyy (chave OU valor sao aceitos)

      - name: Avatar
        type: FILE

  - name: Pedidos
    fields:
      - name: Codigo
        type: TEXT_SHORT
        required: true

      - name: Total
        type: TEXT_SHORT
        format: DECIMAL         # ex: 199.99

      - name: Cliente
        type: RELATIONSHIP
        relationship:
          table: clientes       # slug da tabela referenciada (no mesmo schema OU ja existente no banco)
          field: nome-completo  # slug do campo (gerado a partir do "name", em kebab-case)

      - name: Vendedor
        type: USER

      - name: Observacoes
        type: TEXT_LONG
        format: RICH_TEXT
`;

export const Route = createLazyFileRoute('/_private/tables/schema-import/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [yamlContent, setYamlContent] = React.useState('');
  const [result, setResult] = React.useState<SchemaImportResponse | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<Record<
    string,
    string
  > | null>(null);
  const [referenceOpen, setReferenceOpen] = React.useState(true);

  const schemaImport = useSchemaImport({
    onSuccess(data) {
      setResult(data);
      setValidationErrors(null);
      if (data.created.length > 0) {
        let createdLabel = 'tabelas criadas';
        if (data.created.length === 1) createdLabel = 'tabela criada';
        let errorSuffix = '';
        if (data.errors.length > 0) {
          errorSuffix = ` (${data.errors.length} com erro)`;
        }
        toast.success('Schema importado', {
          description: `${data.created.length} ${createdLabel}${errorSuffix}`,
        });
      }
    },
    onError(error) {
      setResult(null);
      const apiErrors = (
        error as { response?: { data?: { errors?: Record<string, string> } } }
      ).response?.data?.errors;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        setValidationErrors(apiErrors);
      } else {
        setValidationErrors(null);
        handleApiError(error, { context: 'Erro ao importar schema' });
      }
    },
  });

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setYamlContent(text);
        setResult(null);
        setValidationErrors(null);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function handleSubmit(): void {
    if (!yamlContent.trim()) return;
    setResult(null);
    setValidationErrors(null);
    schemaImport.mutate({ yaml: yamlContent });
  }

  function handleClear(): void {
    setYamlContent('');
    setResult(null);
    setValidationErrors(null);
  }

  function handleExample(): void {
    setYamlContent(EXAMPLE_YAML);
    setResult(null);
    setValidationErrors(null);
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.navigate({ to: '/tables/new' })}
            className="-ml-2"
          >
            ← Voltar
          </Button>
        </div>
        <h1 className="text-2xl font-bold">Importar Schema</h1>
        <p className="text-sm text-muted-foreground">
          Cole ou carregue um arquivo YAML para criar várias tabelas de uma vez.
          Relacionamentos entre tabelas do mesmo schema são resolvidos
          automaticamente. Consulte a{' '}
          <button
            type="button"
            onClick={() => setReferenceOpen(true)}
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            referência
          </button>{' '}
          ao lado para os tipos suportados.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,340px)] gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-3 min-h-[500px]">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="h-4 w-4" />
              Carregar .yaml
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExample}
            >
              <FileTextIcon className="h-4 w-4" />
              Ver exemplo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <EraserIcon className="h-4 w-4" />
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="xl:hidden"
              onClick={() => setReferenceOpen((v) => !v)}
            >
              <BookOpenIcon className="h-4 w-4" />
              {referenceOpen && 'Ocultar referência'}
              {!referenceOpen && 'Ver referência'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,text/yaml"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex-1" />
            <Button
              onClick={handleSubmit}
              disabled={!yamlContent.trim() || schemaImport.isPending}
            >
              <PlayIcon className="h-4 w-4" />
              {schemaImport.isPending && 'Importando…'}
              {!schemaImport.isPending && 'Importar Schema'}
            </Button>
          </div>

          <div className="flex-1 min-h-[400px] rounded-md border overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="yaml"
              language="yaml"
              value={yamlContent}
              onChange={(value) => setYamlContent(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
              }}
            />
          </div>

          {validationErrors && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertCircleIcon className="h-4 w-4" />
                Schema inválido — corrija os campos abaixo
              </div>
              <ul className="flex flex-col gap-1.5 text-xs">
                {Object.entries(validationErrors).map(([path, message]) => (
                  <li
                    key={path}
                    className="leading-snug"
                  >
                    <code className="text-[11px] text-muted-foreground">
                      {path}
                    </code>
                    <span className="text-destructive/90 ml-2">{message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-2">
              {result.created.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Criadas ({result.created.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.created.map((table) => (
                  <Card
                    key={table.slug}
                    className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {table.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        slug: <code>{table.slug}</code> · {table.fieldCount}{' '}
                        campos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Link
                        to="/tables/$slug"
                        params={{ slug: table.slug }}
                        className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Abrir tabela
                        <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {result.errors.length > 0 && (
                <>
                  <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide text-destructive">
                    Erros parciais ({result.errors.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.errors.map((err, idx) => (
                      <Card
                        key={`${err.name}-${idx}`}
                        className="border-destructive/40 bg-destructive/5"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircleIcon className="h-4 w-4" />
                            {err.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-destructive/90">
                            {err.message}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <aside
          className={`flex-col gap-3 min-h-0 overflow-auto rounded-md border bg-background p-3 ${
            (referenceOpen && 'flex') || 'hidden xl:flex'
          }`}
        >
          <SchemaReference />
        </aside>
      </div>
    </div>
  );
}
