import { InfoIcon } from 'lucide-react';

import {
  getApiDocumentation,
  getTutorialContent,
} from '@/components/common/code-editor/tutorial-content';
import type { HookType } from '@/components/common/code-editor/tutorial-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ITable } from '@/lib/interfaces';

type CodeEditorInfoModalProps = {
  table?: ITable;
  label?: string;
  hook?: HookType;
};

export function CodeEditorInfoModal({
  table,
  label = 'Editor JavaScript',
  hook,
}: CodeEditorInfoModalProps): React.JSX.Element {
  let tutorialContent: ReturnType<typeof getTutorialContent> | null = null;
  if (hook) {
    tutorialContent = getTutorialContent(hook);
  }
  const apiDocs = getApiDocumentation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          data-test-id="code-editor-info-btn"
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
        >
          <InfoIcon className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent
        data-slot="code-editor-info-modal"
        data-test-id="code-editor-info-modal"
        className="flex flex-col py-4 px-6 gap-5 sm:max-w-[85vw] sm:max-h-[85vh]"
      >
        <DialogHeader>
          <DialogTitle>Tutorial - {label}</DialogTitle>
          <DialogDescription>
            {tutorialContent?.subtitle ??
              'Aprenda como usar o editor JavaScript para automatizar sua tabela'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="api"
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
          </TabsList>

          <div className="h-[60vh] mt-4 overflow-y-auto">
            <TabsContent
              value="api"
              className="space-y-6 text-sm pr-4"
            >
              {apiDocs.map((section, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold mb-2 text-base">
                    {section.title}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {section.description}
                  </p>
                  <div className="space-y-3">
                    {section.examples.map((example, exIdx) => (
                      <div
                        key={exIdx}
                        className="bg-muted p-3 rounded-md"
                      >
                        <p className="font-medium mb-1">{example.title}</p>
                        <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                          <code>{example.code}</code>
                        </pre>
                        <p className="text-muted-foreground text-xs mt-2">
                          {example.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent
              value="examples"
              className="space-y-6 text-sm pr-4"
            >
              {tutorialContent &&
                tutorialContent.sections.map((section, idx) => (
                  <div key={idx}>
                    <h3 className="font-semibold mb-2 text-base">
                      {section.title}
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      {section.description}
                    </p>
                    <div className="space-y-3">
                      {section.examples.map((example, exIdx) => (
                        <div
                          key={exIdx}
                          className="bg-muted p-3 rounded-md"
                        >
                          <p className="font-medium mb-1">{example.title}</p>
                          <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                            <code>{example.code}</code>
                          </pre>
                          <p className="text-muted-foreground text-xs mt-2">
                            {example.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {!tutorialContent && (
                <div className="text-center text-muted-foreground py-8">
                  <p>
                    Selecione um tipo de hook (onLoad, beforeSave, afterSave)
                    para ver exemplos específicos.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="fields"
              className="space-y-6 text-sm pr-4"
            >
              <div>
                <h3 className="font-semibold mb-2 text-base">
                  API field - Acesso aos Campos
                </h3>
                <p className="text-muted-foreground mb-3">
                  Use a API <code className="bg-muted px-1 rounded">field</code>{' '}
                  para acessar e modificar os campos do formulário.
                </p>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <p>
                    <code className="bg-background px-1 rounded">
                      field.get('slug')
                    </code>{' '}
                    - Obtém o valor de um campo
                  </p>
                  <p>
                    <code className="bg-background px-1 rounded">
                      field.set('slug', valor)
                    </code>{' '}
                    - Define o valor de um campo
                  </p>
                  <p>
                    <code className="bg-background px-1 rounded">
                      field.getAll()
                    </code>{' '}
                    - Obtém todos os campos como objeto
                  </p>
                </div>
              </div>

              {table?.fields && table.fields.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-base">
                    Campos desta Tabela
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Campos disponíveis para usar com{' '}
                    <code className="bg-muted px-1 rounded">field.get()</code> e{' '}
                    <code className="bg-muted px-1 rounded">field.set()</code>.
                  </p>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="grid gap-2">
                      {table.fields.map((f) => (
                        <div
                          key={f.slug}
                          className="flex items-center gap-2 text-sm"
                        >
                          <code className="bg-background px-2 py-1 rounded text-green-600 font-mono">
                            field.get('{f.slug}')
                          </code>
                          <span className="text-muted-foreground">
                            → {f.name}
                          </span>
                          <span className="text-xs bg-background px-1 rounded">
                            {f.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2 text-base">
                  Exemplos de Uso
                </h3>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-medium mb-1">Usando API field</p>
                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                      <code>{`// Ler valor
const titulo = field.get('titulo');

// Definir valor
field.set('status', 'aprovado');

// Ler todos
const todos = field.getAll();`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
