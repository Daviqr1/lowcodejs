import type { Monaco } from '@monaco-editor/react';
import Editor from '@monaco-editor/react';
import { useState } from 'react';

import { CodeEditorInfoModal } from '@/components/common/code-editor/code-editor-info-modal';
import type { HookType } from '@/components/common/code-editor/tutorial-content';
import {
  getMonacoEditorOptions,
  useMonacoTypes,
} from '@/components/common/code-editor/use-monaco-types';
import { Label } from '@/components/ui/label';
import type { ITable } from '@/lib/interfaces';

/**
 * Default IIFE template shown when editor is empty
 */
const DEFAULT_IIFE_TEMPLATE = `(async () => {
  // Escreva seu codigo aqui
  // Use await para operacoes assincronas (email.send, email.sendTemplate)
  // Exemplo: field.set('status', 'aprovado');
  
})();`;

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  table?: ITable;
  hook?: HookType;
  readOnly?: boolean;
  height?: string;
};

export function CodeEditor({
  value,
  onChange,
  label = 'Editor JavaScript',
  table,
  hook,
  readOnly = false,
  height = '300px',
}: CodeEditorProps): React.JSX.Element {
  const [monaco, setMonaco] = useState<Monaco | null>(null);

  // Inject TypeScript types for IntelliSense
  useMonacoTypes(monaco, table);

  // Use default IIFE template when value is empty
  const editorValue = value || DEFAULT_IIFE_TEMPLATE;

  const handleEditorMount = (
    _editor: unknown,
    monacoInstance: Monaco,
  ): void => {
    setMonaco(monacoInstance);
  };

  return (
    <div
      data-slot="code-editor"
      data-test-id="code-editor"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <CodeEditorInfoModal
          table={table}
          label={label}
          hook={hook}
        />
      </div>

      <div className="border rounded-md overflow-hidden">
        <Editor
          height={height}
          defaultLanguage="javascript"
          value={editorValue}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          options={getMonacoEditorOptions(readOnly)}
        />
      </div>
    </div>
  );
}
