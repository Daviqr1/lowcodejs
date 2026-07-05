import { Suspense, lazy } from 'react';

import type { HookType } from '@/components/common/code-editor/tutorial-content';
import { Skeleton } from '@/components/ui/skeleton';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { ITable } from '@/lib/interfaces';

// Lazy load do Monaco Editor (76MB de dependência)
const CodeEditor = lazy(() =>
  import('@/components/common/code-editor/code-editor').then((m) => ({
    default: m.CodeEditor,
  })),
);

function CodeEditorSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      <div className="border rounded-md p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/**
 * Validates if code is in IIFE format: (async () => { ... })();
 */
export function isValidIIFE(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true; // empty is valid
  return trimmed.startsWith('(async') && trimmed.endsWith('})();');
}

type FieldCodeEditorProps = {
  label?: string;
  table?: ITable;
  hook?: HookType;
};

export function FieldCodeEditor({
  label,
  table,
  hook,
}: FieldCodeEditorProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isValid = isValidIIFE(field.state.value);

  return (
    <div
      data-slot="field-code-editor"
      data-test-id="field-code-editor"
    >
      <Suspense fallback={<CodeEditorSkeleton />}>
        <CodeEditor
          value={field.state.value}
          onChange={(value) => field.handleChange(value)}
          label={label}
          table={table}
          hook={hook}
        />
      </Suspense>
      {!isValid && field.state.value.trim() && (
        <p className="text-sm text-destructive mt-1">
          O codigo deve estar no formato IIFE: (async () =&gt; {'{ ... }'})();
        </p>
      )}
    </div>
  );
}
