import { useState } from 'react';

type LinkEditBlockProps = {
  defaultUrl?: string;
  defaultText?: string;
  defaultTarget?: string;
  onSubmit: (url: string, text?: string, openInNewTab?: boolean) => void;
};

export function LinkEditBlock({
  defaultUrl = '',
  defaultText = '',
  defaultTarget,
  onSubmit,
}: LinkEditBlockProps): React.JSX.Element {
  const [url, setUrl] = useState(defaultUrl);
  const [text, setText] = useState(defaultText);
  const [openInNewTab, setOpenInNewTab] = useState(defaultTarget === '_blank');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), text.trim() || undefined, openInNewTab);
  }

  return (
    <form
      data-slot="editor-link-edit-block"
      data-test-id="rich-editor-link-edit"
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-1"
    >
      <input
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-8 rounded border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        autoFocus
      />
      <input
        type="text"
        placeholder="Texto (opcional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-8 rounded border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
        />
        Abrir em nova aba
      </label>
      <button
        type="submit"
        disabled={!url.trim()}
        className="h-8 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
      >
        Aplicar
      </button>
    </form>
  );
}
