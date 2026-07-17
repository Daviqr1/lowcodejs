import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DataTableSkeletonCellProps = {
  width: string;
  height?: string;
  rounded?: string;
  className?: string;
};

function DataTableSkeletonCell({
  width,
  height = 'h-4',
  rounded,
  className,
}: DataTableSkeletonCellProps): React.JSX.Element {
  return (
    <TableCell data-slot="data-table-skeleton-cell">
      <Skeleton className={cn(height, width, rounded, className)} />
    </TableCell>
  );
}

function DataTableSkeletonActionCell(): React.JSX.Element {
  return (
    <TableCell data-slot="data-table-skeleton-action-cell">
      <Skeleton className="h-8 w-8 rounded-md" />
    </TableCell>
  );
}

type DataTableSkeletonProps = {
  headers: Array<string>;
  children: React.ReactNode;
  rows?: number;
  className?: string;
};

function DataTableSkeletonRoot({
  headers,
  children,
  rows = 10,
  className,
}: DataTableSkeletonProps): React.JSX.Element {
  return (
    <Table
      data-slot="data-table-skeleton"
      className={className}
    >
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          {headers.map((head) => (
            <TableHead key={head}>
              <span>{head}</span>
            </TableHead>
          ))}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={index}>{children}</TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const DataTableSkeleton = Object.assign(DataTableSkeletonRoot, {
  Cell: DataTableSkeletonCell,
  ActionCell: DataTableSkeletonActionCell,
});
