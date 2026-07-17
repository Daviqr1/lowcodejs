import { useCallback, useMemo, useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  '#dd7e6b',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#a4c2f4',
  '#9fc5e8',
  '#b4a7d6',
  '#d5a6bd',
  '#cc4125',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6d9eeb',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
];

type ColorPickerProps = {
  children: React.ReactNode;
  onChange?: (color: string | undefined) => void;
  value?: string;
  highlight?: boolean;
};

export function ColorPicker({
  children,
  onChange,
  value,
  highlight = false,
}: ColorPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  let storageKey = 'editor-recent-colors';
  if (highlight) {
    storageKey = 'editor-recent-highlight';
  }

  const [recentColors, setRecentColors] = useState<Array<string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });

  const addRecentColor = useCallback(
    (color: string) => {
      setRecentColors((prev) => {
        const next = [color, ...prev.filter((c) => c !== color)].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const chunkedColors = useMemo(() => {
    const chunks: Array<Array<string>> = [];
    for (let i = 0; i < COLORS.length; i += 10) {
      chunks.push(COLORS.slice(i, i + 10));
    }
    return chunks;
  }, []);

  function pickColor(color: string | undefined): void {
    onChange?.(color);
    if (color) addRecentColor(color);
    setOpen(false);
  }

  return (
    <Popover
      data-slot="editor-color-picker"
      data-test-id="rich-editor-color-picker"
      modal
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-2"
        side="bottom"
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
            onClick={() => pickColor(undefined)}
          >
            <span className="size-4 rounded border border-border bg-background" />
            {highlight && 'Sem destaque'}
            {!highlight && 'Cor padrão'}
          </button>

          {chunkedColors.map((row, ri) => (
            <div
              key={ri}
              className="flex gap-0.5"
            >
              {row.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="size-5 rounded-sm border border-transparent hover:border-border cursor-pointer p-0"
                  style={{ backgroundColor: color }}
                  onClick={() => pickColor(color)}
                >
                  {color === value && (
                    <svg
                      viewBox="0 0 18 18"
                      className="size-3 mx-auto"
                      fill="white"
                    >
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}

          {recentColors.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground mt-1">
                Recentes
              </span>
              <div className="flex gap-0.5">
                {recentColors.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    className="size-5 rounded-sm border border-transparent hover:border-border cursor-pointer p-0"
                    style={{ backgroundColor: color }}
                    onClick={() => pickColor(color)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
