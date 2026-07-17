import { useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const INIT_SIZE = 6;
const MAX_SIZE = 10;

type TablePickerProps = {
  children: React.ReactNode;
  onInsert: (rows: number, cols: number) => void;
};

export function TablePicker({
  children,
  onInsert,
}: TablePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(INIT_SIZE);
  const [cols, setCols] = useState(INIT_SIZE);
  const [selectedRows, setSelectedRows] = useState(0);
  const [selectedCols, setSelectedCols] = useState(0);

  function onHover(r: number, c: number): void {
    setSelectedRows(r);
    setSelectedCols(c);
    if (r === rows) setRows(Math.min(r + 1, MAX_SIZE));
    if (c === cols) setCols(Math.min(c + 1, MAX_SIZE));
  }

  function onClick(r: number, c: number): void {
    onInsert(r, c);
    setOpen(false);
    setRows(INIT_SIZE);
    setCols(INIT_SIZE);
    setSelectedRows(0);
    setSelectedCols(0);
  }

  return (
    <Popover
      data-slot="editor-table-picker"
      data-test-id="rich-editor-table-picker"
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
          {Array.from({ length: rows }, (_, ri) => (
            <div
              key={ri}
              className="flex gap-1"
            >
              {Array.from({ length: cols }, (__, ci) => {
                const r = ri + 1;
                const c = ci + 1;
                const active = r <= selectedRows && c <= selectedCols;
                let cellBackground: string | undefined = undefined;
                if (active) {
                  cellBackground = 'var(--foreground)';
                }
                return (
                  <div
                    key={ci}
                    className="size-4 rounded-sm border border-border cursor-pointer transition-colors"
                    style={{
                      backgroundColor: cellBackground,
                    }}
                    onMouseOver={() => onHover(r, c)}
                    onMouseDown={() => onClick(r, c)}
                  />
                );
              })}
            </div>
          ))}
          <div className="mt-1 text-center text-xs text-muted-foreground">
            {selectedRows > 0 &&
              selectedCols > 0 &&
              `${selectedRows} x ${selectedCols}`}
            {(selectedRows === 0 || selectedCols === 0) &&
              'Selecione o tamanho'}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
