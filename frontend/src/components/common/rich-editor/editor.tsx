import type { Extensions, Editor as TiptapEditor } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CodeIcon } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Markdown as TiptapMarkdown } from 'tiptap-markdown';

import { ImageBubble } from './bubble/image-bubble';
import { LinkBubble } from './bubble/link-bubble';
import { TableBubble } from './bubble/table-bubble';
import { TextBubble } from './bubble/text-bubble';
import './editor.css';
import type { MentionConfig } from './extensions/mention';
import { buildMentionExtension } from './extensions/mention';
import { EditorToolbar } from './toolbar';
import { uploadFile } from './upload';
import { ContentViewer } from './viewer';

import { cn } from '@/lib/utils';

// --- Types ---

export type EditorMode = 'rich' | 'markdown' | 'html' | 'preview';

const MODE_LABELS: Record<EditorMode, string> = {
  rich: 'Write',
  markdown: 'Markdown',
  html: 'HTML',
  preview: 'Preview',
};

// --- Composable subcomponents ---

type EditorCharCountProps = {
  editor: TiptapEditor;
};

export function EditorCharCount({
  editor,
}: EditorCharCountProps): React.JSX.Element {
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div
      data-slot="editor-char-count"
      className="flex justify-end px-3 py-1 text-xs text-muted-foreground border-t"
    >
      {charCount} caracteres
    </div>
  );
}

type EditorBubbleProps = {
  editor: TiptapEditor;
};

export function EditorBubble({ editor }: EditorBubbleProps): React.JSX.Element {
  return (
    <>
      <TextBubble editor={editor} />
      <LinkBubble editor={editor} />
      <ImageBubble editor={editor} />
      <TableBubble editor={editor} />
    </>
  );
}

// Re-export toolbar for composition
export { EditorToolbar } from './toolbar';

// --- Mode Tabs ---

type EditorModeTabsProps = {
  mode: EditorMode;
  availableModes: Array<EditorMode>;
  onChange: (mode: EditorMode) => void;
};

function EditorModeTabs({
  mode,
  availableModes,
  onChange,
}: EditorModeTabsProps): React.JSX.Element {
  return (
    <div
      data-slot="editor-mode-tabs"
      className="flex items-center gap-0 border-b"
    >
      {availableModes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
            'hover:text-foreground',
            m === mode && 'text-foreground border-b-2 border-primary',
            m !== mode && 'text-muted-foreground',
          )}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

// --- Markdown Textarea ---

type MarkdownTextareaProps = {
  value: string;
  onChange: (value: string) => void;
};

function MarkdownTextarea({
  value,
  onChange,
}: MarkdownTextareaProps): React.JSX.Element {
  return (
    <textarea
      className="w-full resize-none outline-none bg-background font-sans
                 text-sm leading-relaxed p-4 min-h-50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Escreva em Markdown..."
      spellCheck
    />
  );
}

// --- HTML Textarea ---

type HtmlTextareaProps = {
  value: string;
  onChange: (value: string) => void;
};

function HtmlTextarea({
  value,
  onChange,
}: HtmlTextareaProps): React.JSX.Element {
  return (
    <textarea
      className="w-full resize-none outline-none bg-background font-mono
                 text-xs leading-relaxed p-4 min-h-50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="<p>HTML aqui...</p>"
      spellCheck={false}
    />
  );
}

// --- Markdown Icon (inline SVG) ---

function MarkdownIcon({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15V4.15C16 3.52 15.48 3 14.85 3zM9 11H7V8l-1.5 1.92L4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z" />
    </svg>
  );
}

// --- Footers ---

function MarkdownFooter(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t text-xs text-muted-foreground">
      <MarkdownIcon className="size-3.5" />
      Markdown is supported
    </div>
  );
}

function HtmlFooter(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t text-xs text-muted-foreground">
      <CodeIcon className="size-3.5" />
      Editing raw HTML
    </div>
  );
}

// --- Helpers ---

function getMarkdownFromEditor(editor: TiptapEditor): string {
  // tiptap-markdown injeta `markdown` no storage em runtime sem augmentar o tipo
  // `Storage` do Tiptap; o acesso e lib-forced (por isso o `as any` pontual).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
  const md = (editor.storage as any).markdown?.getMarkdown?.();
  if (md !== undefined) {
    return md;
  }
  return editor.getHTML();
}

function getImageFilesFromDataTransfer(
  dataTransfer: DataTransfer | null,
): Array<File> {
  if (!dataTransfer) return [];
  const collected: Array<File> = [];

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files.item(i);
      if (file && file.type.startsWith('image/')) {
        collected.push(file);
      }
    }
  }

  if (collected.length === 0 && dataTransfer.items?.length) {
    for (const item of dataTransfer.items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) collected.push(file);
      }
    }
  }

  return collected;
}

async function uploadAndInsertImages(
  editor: TiptapEditor,
  files: Array<File>,
): Promise<void> {
  for (const file of files) {
    const toastId = toast.loading('Enviando imagem...');
    try {
      const url = await uploadFile(file);
      editor.chain().focus().setImage({ src: url }).run();
      toast.success('Imagem inserida', { id: toastId });
    } catch (error) {
      console.error('[rich-editor][paste-image]', error);
      toast.error('Erro ao enviar imagem', { id: toastId });
    }
  }
}

// --- Main Editor ---

export type EditorProps = {
  value?: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
  showCharCount?: boolean;
  showBubble?: boolean;
  variant?: 'default' | 'compact';
  autoFocus?: boolean;
  focusKey?: string | number;
  debounceMs?: number;
  showModeToggle?: boolean;
  defaultMode?: EditorMode;
  availableModes?: Array<EditorMode>;
  mentions?: MentionConfig;
  onEditorReady?: (editor: TiptapEditor) => void;
};

// Array<any> nos args e o idiom para restringir T a qualquer funcao (unknown[]
// rejeitaria funcoes com parametros concretos por contravariancia).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: Array<any>) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function Editor({
  value,
  onChange,
  placeholder = 'Escreva algo...',
  className,
  showToolbar = true,
  showCharCount = false,
  showBubble = true,
  variant = 'default',
  autoFocus = false,
  focusKey,
  debounceMs = 300,
  showModeToggle = true,
  defaultMode = 'rich',
  availableModes = ['rich', 'markdown', 'html', 'preview'],
  mentions,
  onEditorReady,
}: EditorProps): React.JSX.Element | null {
  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const [rawMd, setRawMd] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const previousModeRef = useRef<EditorMode>(defaultMode);

  const isControlled = value !== undefined && onChange !== undefined;
  const onChangeRef = useRef(onChange);
  const isControlledRef = useRef(isControlled);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    isControlledRef.current = isControlled;
  }, [onChange, isControlled]);

  const onValueChange = useCallback(
    debounce((editor: TiptapEditor) => {
      if (!isControlledRef.current) return;
      const md = getMarkdownFromEditor(editor);
      onChangeRef.current?.(md);
    }, debounceMs),
    [debounceMs],
  );

  const mentionsEnabled = mentions?.enabled ?? false;
  const resolvePageRef = useRef(mentions?.resolvePage);
  React.useEffect((): void => {
    resolvePageRef.current = mentions?.resolvePage;
  }, [mentions?.resolvePage]);

  const extensions = useMemo(() => {
    const list: Extensions = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      TiptapImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      TiptapMarkdown,
    ];
    if (mentionsEnabled) {
      list.push(
        buildMentionExtension(async (query, page) => {
          const resolver = resolvePageRef.current;
          if (!resolver) return { items: [], hasMore: false };
          return resolver(query, page);
        }),
      );
    }
    return list;
  }, [placeholder, mentionsEnabled]);

  const editorRef = useRef<TiptapEditor | null>(null);

  const ed = useEditor(
    {
      extensions,
      immediatelyRender: false,
      content: (isControlled && value) || '',
      editorProps: {
        handlePaste: (_view, event) => {
          const files = getImageFilesFromDataTransfer(event.clipboardData);
          if (files.length === 0) return false;
          const editor = editorRef.current;
          if (!editor) return false;
          event.preventDefault();
          void uploadAndInsertImages(editor, files);
          return true;
        },
        handleDrop: (_view, event, _slice, moved) => {
          if (moved) return false;
          const files = getImageFilesFromDataTransfer(event.dataTransfer);
          if (files.length === 0) return false;
          const editor = editorRef.current;
          if (!editor) return false;
          event.preventDefault();
          void uploadAndInsertImages(editor, files);
          return true;
        },
      },
      onUpdate: ({ editor: editorInstance }) => {
        onValueChange(editorInstance);
      },
    },
    [],
  );

  React.useEffect(() => {
    editorRef.current = ed ?? null;
  }, [ed]);

  // Sync external value (only in rich mode)
  React.useEffect(() => {
    if (!ed || !isControlled) return;
    if (ed.isFocused) return;
    if (mode !== 'rich') return;
    const currentMd = getMarkdownFromEditor(ed);
    if (currentMd !== value) {
      ed.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, ed, isControlled, mode]);

  // Focus key reset
  const lastFocusKeyRef = useRef<typeof focusKey>(focusKey);
  React.useEffect(() => {
    if (!ed || !isControlled) return;
    if (focusKey === undefined) return;
    if (lastFocusKeyRef.current === focusKey) return;
    lastFocusKeyRef.current = focusKey;
    ed.commands.setContent(value || '', { emitUpdate: false });
  }, [value, ed, focusKey, isControlled]);

  // Auto focus
  React.useEffect(() => {
    if (!ed || !autoFocus) return;
    ed.commands.focus('end');
  }, [autoFocus, ed, focusKey]);

  // Notify parent when editor instance is ready
  React.useEffect(() => {
    if (!ed) return;
    onEditorReady?.(ed);
  }, [ed, onEditorReady]);

  // --- Mode switching logic ---
  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      if (!ed || newMode === mode) return;

      // Sync content FROM the current mode before switching — despacho por modo
      // (code-style regra 6). `preview` → qualquer: restaura sem efeitos.
      const editor = ed;
      const syncFromMode: Record<EditorMode, (target: EditorMode) => void> = {
        rich: (target) => {
          const md = getMarkdownFromEditor(editor);
          if (target === 'markdown') {
            setRawMd(md);
          } else if (target === 'html') {
            setRawHtml(editor.getHTML());
          }
        },
        markdown: (target) => {
          if (target === 'rich') {
            editor.commands.setContent(rawMd, { emitUpdate: false });
            if (isControlledRef.current) {
              const normalized = getMarkdownFromEditor(editor);
              onChangeRef.current?.(normalized);
            }
          } else if (target === 'html') {
            editor.commands.setContent(rawMd, { emitUpdate: false });
            setRawHtml(editor.getHTML());
          }
        },
        html: (target) => {
          if (target === 'rich') {
            editor.commands.setContent(rawHtml, { emitUpdate: false });
            if (isControlledRef.current) {
              const normalized = getMarkdownFromEditor(editor);
              onChangeRef.current?.(normalized);
            }
          } else if (target === 'markdown') {
            editor.commands.setContent(rawHtml, { emitUpdate: false });
            setRawMd(getMarkdownFromEditor(editor));
          }
        },
        preview: () => {},
      };
      syncFromMode[mode](newMode);

      previousModeRef.current = mode;
      setMode(newMode);
    },
    [ed, mode, rawMd, rawHtml],
  );

  // Sync rawMd changes back to parent onChange
  const handleRawMdChange = useCallback((newMd: string) => {
    setRawMd(newMd);
    if (isControlledRef.current) {
      onChangeRef.current?.(newMd);
    }
  }, []);

  // Sync rawHtml changes back to parent onChange
  const handleRawHtmlChange = useCallback(
    (newHtml: string) => {
      setRawHtml(newHtml);
      if (isControlledRef.current && ed) {
        ed.commands.setContent(newHtml, { emitUpdate: false });
        const md = getMarkdownFromEditor(ed);
        onChangeRef.current?.(md);
      }
    },
    [ed],
  );

  if (!ed) return null;

  let variantClass = '';
  let editorContentVariantClass = '';
  if (variant === 'compact') {
    variantClass = 'editor-compact';
    editorContentVariantClass = 'rounded-md border bg-background';
  }

  // Preview content: depends on what mode we came from
  let previewContent = '';
  if (mode === 'preview') {
    const prev = previousModeRef.current;
    if (prev === 'html') {
      previewContent = rawHtml;
    } else if (prev === 'markdown') {
      previewContent = rawMd;
    } else {
      previewContent = getMarkdownFromEditor(ed);
    }
  }

  return (
    <div
      data-slot="editor"
      data-test-id="rich-editor"
      className={cn('w-full', variantClass, className)}
    >
      {showModeToggle && availableModes.length > 1 && (
        <EditorModeTabs
          mode={mode}
          availableModes={availableModes}
          onChange={handleModeChange}
        />
      )}

      {mode === 'rich' && showToolbar && <EditorToolbar editor={ed} />}

      {mode === 'rich' && (
        <EditorContent
          editor={ed}
          className={cn(
            'prose prose-sm max-w-none w-full',
            editorContentVariantClass,
          )}
        />
      )}

      {mode === 'markdown' && (
        <MarkdownTextarea
          value={rawMd}
          onChange={handleRawMdChange}
        />
      )}

      {mode === 'html' && (
        <HtmlTextarea
          value={rawHtml}
          onChange={handleRawHtmlChange}
        />
      )}

      {mode === 'preview' && (
        <ContentViewer
          content={previewContent}
          className="p-4 min-h-50"
        />
      )}

      {mode === 'rich' && showBubble && <EditorBubble editor={ed} />}
      {mode === 'rich' && showCharCount && <EditorCharCount editor={ed} />}

      {mode === 'markdown' && <MarkdownFooter />}
      {mode === 'html' && <HtmlFooter />}
    </div>
  );
}
