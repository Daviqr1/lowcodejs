import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Meta } from '@/lib/interfaces';

type Props = {
  meta: Meta;
  page?: number;
  perPage?: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function Pagination({
  meta,
  page: pageProp,
  perPage: perPageProp,
  onPageChange,
  onPerPageChange,
}: Props): React.JSX.Element {
  const page = Math.max(1, Number(pageProp || meta.page || 1));
  const perPage = Math.max(1, Number(perPageProp || meta.perPage || 50));
  const lastPage = Math.max(1, Number(meta.lastPage || 1));

  return (
    <section
      data-slot="pagination"
      data-test-id="pagination"
      className="flex flex-col lg:flex-row w-full justify-between shrink-0 gap-2"
    >
      <div className="inline-flex gap-2 items-center ">
        <span className="inline-flex flex-1">Itens por página: </span>
        <Select
          defaultValue={String(perPage)}
          onValueChange={(value) => {
            onPerPageChange(Number(value));
          }}
        >
          <SelectTrigger
            data-test-id="pagination-per-page-select"
            className="w-45"
          >
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="inline-flex space-x-8 items-center">
        <label className="inline-flex flex-1 gap-1">
          Página <strong>{page}</strong>{' '}
          {lastPage > 1 && (
            <>
              /<strong>{lastPage}</strong>
            </>
          )}
        </label>
        <PaginationContent className="justify-between w-45 ">
          <PaginationItem>
            <Button
              data-test-id="pagination-first-btn"
              variant="ghost"
              size="icon"
              className="border"
              disabled={page === 1}
              onClick={() => onPageChange(1)}
            >
              <ChevronsLeft />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              data-test-id="pagination-prev-btn"
              variant="ghost"
              size="icon"
              className="border"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              data-test-id="pagination-next-btn"
              variant="ghost"
              size="icon"
              className="border"
              disabled={page === lastPage}
              onClick={() => onPageChange(Math.min(lastPage, page + 1))}
            >
              <ChevronRight />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              data-test-id="pagination-last-btn"
              variant="ghost"
              size="icon"
              className="border"
              disabled={page === lastPage}
              onClick={() => onPageChange(lastPage)}
            >
              <ChevronsRight />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </div>
    </section>
  );
}
