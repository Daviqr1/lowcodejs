import React from 'react';

import { cn } from '@/lib/utils';

export function DocumentHeadingRow({
  id,
  level,
  className,
  children,
  icon,
  actions,
}: {
  id: string;
  level: number;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}): React.JSX.Element {
  const headingStyles: Record<number, string> = {
    2: 'text-2xl font-bold mt-8 border-b pb-2',
    3: 'text-xl font-semibold mt-6',
    4: 'text-lg font-semibold mt-4',
    5: 'text-base font-semibold mt-3',
    6: 'text-sm font-semibold mt-2',
  };

  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const Tag: React.ElementType = tags[level - 1] ?? 'h2';

  return (
    <div data-slot="document-heading-row">
      <Tag
        id={id}
        className={cn(className, headingStyles[level])}
      >
        <span className="inline-flex items-center gap-1 w-full">
          {icon && <span className="inline-flex opacity-70">{icon}</span>}
          <span>{children}</span>
          {actions && (
            <span className="inline-flex no-print mt-auto">{actions}</span>
          )}
        </span>
      </Tag>
    </div>
  );
}
