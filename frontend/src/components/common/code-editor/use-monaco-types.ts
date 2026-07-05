import type { Monaco } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

import { generateDynamicTypes, normalizeSlug } from './field-type-mapper';
import { STATIC_SANDBOX_TYPES } from './sandbox-types';

import type { ITable } from '@/lib/interfaces';

/**
 * Hook that injects TypeScript type declarations into Monaco editor
 * Provides IntelliSense support for the sandbox API
 */
export function useMonacoTypes(monaco: Monaco | null, table?: ITable): void {
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    if (!monaco) return;

    // Clean up previous disposables
    disposablesRef.current.forEach((d) => d.dispose());
    disposablesRef.current = [];

    // Configure JavaScript language defaults for better IntelliSense
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    // Set compiler options for JavaScript with type checking
    jsDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: true,
      strict: false,
    });

    // Enable diagnostics
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Add static sandbox types
    const staticLib = jsDefaults.addExtraLib(
      STATIC_SANDBOX_TYPES,
      'file:///sandbox-static.d.ts',
    );
    disposablesRef.current.push(staticLib);

    // Add dynamic types if table is provided
    if (table?.fields && table.slug) {
      const dynamicTypes = generateDynamicTypes(table.fields, table.slug);
      const dynamicLib = jsDefaults.addExtraLib(
        dynamicTypes,
        'file:///sandbox-dynamic.d.ts',
      );
      disposablesRef.current.push(dynamicLib);
    }

    // Register completion provider for field slugs
    if (table?.fields && table.fields.length > 0) {
      const completionProvider =
        monaco.languages.registerCompletionItemProvider('javascript', {
          triggerCharacters: ["'", '"'],
          provideCompletionItems: (
            model: ReturnType<Monaco['editor']['createModel']>,
            position: { lineNumber: number; column: number },
          ) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            // Check if we're inside field.get(' or field.set('
            const fieldGetSetMatch =
              /field\.(get|set|getAll)\s*\(\s*['"]([^'"]*)$/.test(
                textUntilPosition,
              );

            if (!fieldGetSetMatch) {
              return { suggestions: [] };
            }

            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions: Array<{
              label: string;
              kind: number;
              insertText: string;
              range: typeof range;
              detail: string;
              documentation: string;
              sortText: string;
            }> = [];

            if (fieldGetSetMatch) {
              // Suggest all field slugs
              for (const f of table.fields) {
                suggestions.push({
                  label: f.slug,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: f.slug,
                  range,
                  detail: `Campo: ${f.name}`,
                  documentation: `Tipo: ${f.type}`,
                  sortText: '0' + f.slug,
                });

                // Also suggest normalized slug if different
                const normalized = normalizeSlug(f.slug);
                if (normalized !== f.slug) {
                  suggestions.push({
                    label: normalized,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: normalized,
                    range,
                    detail: `Campo: ${f.name} (normalizado)`,
                    documentation: `Tipo: ${f.type}`,
                    sortText: '1' + normalized,
                  });
                }
              }
            }

            return { suggestions };
          },
        });
      disposablesRef.current.push(completionProvider);
    }

    // Cleanup on unmount
    return (): void => {
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
    };
  }, [monaco, table?.fields, table?.slug]);
}

type MonacoEditorOptions = {
  minimap: { enabled: boolean };
  fontSize: number;
  lineNumbers: 'on';
  scrollBeyondLastLine: boolean;
  automaticLayout: boolean;
  tabSize: number;
  wordWrap: 'on';
  readOnly: boolean;
  suggestOnTriggerCharacters: boolean;
  quickSuggestions: {
    other: boolean;
    comments: boolean;
    strings: boolean;
  };
  parameterHints: {
    enabled: boolean;
  };
  suggest: {
    showKeywords: boolean;
    showSnippets: boolean;
    showFunctions: boolean;
    showVariables: boolean;
    showConstants: boolean;
    showProperties: boolean;
    showMethods: boolean;
    insertMode: 'insert';
  };
  formatOnPaste: boolean;
  formatOnType: boolean;
  autoClosingBrackets: 'always';
  autoClosingQuotes: 'always';
  autoIndent: 'full';
  folding: boolean;
  foldingHighlight: boolean;
  showFoldingControls: 'mouseover';
};

/**
 * Hook configuration options for Monaco editor
 * Returns the options object to be spread into the Editor component
 */
export function getMonacoEditorOptions(
  readOnly: boolean = false,
): MonacoEditorOptions {
  return {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    readOnly,
    // IntelliSense options
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    parameterHints: {
      enabled: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      showProperties: true,
      showMethods: true,
      insertMode: 'insert' as const,
    },
    // Better code editing
    formatOnPaste: true,
    formatOnType: true,
    autoClosingBrackets: 'always' as const,
    autoClosingQuotes: 'always' as const,
    autoIndent: 'full' as const,
    folding: true,
    foldingHighlight: true,
    showFoldingControls: 'mouseover' as const,
  };
}
