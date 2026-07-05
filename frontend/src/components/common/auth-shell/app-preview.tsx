import { TrendingUpIcon } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

type AppPreviewProps = {
  className?: string;
};

type MockRow = {
  cells: Array<string>;
  status: 'on' | 'off';
};

const ROWS: Array<MockRow> = [
  { cells: ['w-20', 'w-14', 'w-10'], status: 'on' },
  { cells: ['w-16', 'w-20', 'w-12'], status: 'off' },
  { cells: ['w-24', 'w-12', 'w-10'], status: 'on' },
  { cells: ['w-14', 'w-16', 'w-14'], status: 'on' },
];

export function AppPreview({ className }: AppPreviewProps): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none select-none', className)}
    >
      {/* Plate principal — janela do app */}
      <div className="bezel-outer-dark shadow-soft-lg w-[26rem] max-w-full rotate-[-4deg]">
        <div className="bezel-inner-dark">
          {/* Topbar */}
          <div className="hairline-white-t flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="size-2.5 rounded-full bg-white/25" />
            <span className="size-2.5 rounded-full bg-white/25" />
            <span className="size-2.5 rounded-full bg-brand-orange/80" />
            <span className="ml-3 h-2 w-24 rounded-full bg-white/15" />
          </div>

          {/* Mini tabela dinâmica */}
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-24 rounded-full bg-white/30" />
              <span className="ml-auto h-2.5 w-12 rounded-full bg-white/15" />
              <span className="h-2.5 w-10 rounded-full bg-white/15" />
            </div>
            {ROWS.map((row, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <span className="size-6 shrink-0 rounded-md bg-white/10" />
                {row.cells.map((width, cellIndex) => (
                  <span
                    key={cellIndex}
                    className={cn('h-2 rounded-full bg-white/20', width)}
                  />
                ))}
                <span
                  className={cn(
                    'ml-auto h-4 w-12 shrink-0 rounded-full',
                    row.status === 'on' && 'bg-brand-orange/80',
                    row.status === 'off' && 'bg-white/12',
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat card flutuando à frente */}
      <div className="bezel-outer-dark shadow-soft-lg absolute -top-6 -left-10 rotate-[3deg]">
        <div className="bezel-inner-dark flex items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange">
            <TrendingUpIcon className="size-4" />
          </span>
          <div>
            <p className="text-base font-semibold text-white">1.248</p>
            <p className="text-[11px] text-white/60">registros hoje</p>
          </div>
        </div>
      </div>
    </div>
  );
}
