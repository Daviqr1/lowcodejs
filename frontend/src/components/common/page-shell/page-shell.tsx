import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Merge } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type PageShellProps = Merge<
  React.ComponentProps<'div'>,
  {
    children: React.ReactNode;
  }
>;

function PageShellRoot({
  children,
  className,
  ...props
}: PageShellProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell"
      className={cn('flex flex-col h-full overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

type PageShellHeaderProps = Merge<
  React.ComponentProps<'div'>,
  {
    children: React.ReactNode;
    borderBottom?: boolean;
  }
>;

function PageShellHeader({
  children,
  className,
  borderBottom = true,
  ...props
}: PageShellHeaderProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-header"
      className={cn(
        'shrink-0 p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-1',
        borderBottom && 'border-b',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type PageShellContentProps = Merge<
  React.ComponentProps<'div'>,
  {
    children: React.ReactNode;
  }
>;

function PageShellContent({
  children,
  className,
  ...props
}: PageShellContentProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-content"
      className={cn(
        'flex-1 flex flex-col min-h-0 overflow-auto relative',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type PageShellFooterProps = Merge<
  React.ComponentProps<'div'>,
  {
    children?: React.ReactNode;
  }
>;

function PageShellFooter({
  children,
  className,
  ...props
}: PageShellFooterProps): React.JSX.Element {
  return (
    <div
      data-slot="page-shell-footer"
      className={cn('shrink-0 border-t p-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  onBack?: () => void;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  onBack,
  children,
  className,
}: PageHeaderProps): React.JSX.Element {
  return (
    <>
      <div
        data-slot="page-header"
        className={cn('inline-flex items-center space-x-2', className)}
      >
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <h1 className="text-xl font-medium">{title}</h1>
      </div>
      {children}
    </>
  );
}

export const PageShell = Object.assign(PageShellRoot, {
  Header: PageShellHeader,
  Content: PageShellContent,
  Footer: PageShellFooter,
});
