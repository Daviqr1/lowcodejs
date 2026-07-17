import { Loader2Icon } from 'lucide-react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type MentionItem = {
  id: string;
  label: string;
  email?: string;
};

export type MentionPage = {
  items: Array<MentionItem>;
  hasMore: boolean;
};

export type ResolveMentionPage = (
  query: string,
  page: number,
) => Promise<MentionPage>;

export type MentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type MentionListProps = {
  items: Array<MentionItem>;
  query: string;
  hasMore: boolean;
  resolvePage: ResolveMentionPage;
  command: (item: MentionItem) => void;
};

function getInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return trimmed.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  (
    { items, query, hasMore: initialHasMore, resolvePage, command },
    ref,
  ): React.JSX.Element => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [allItems, setAllItems] = useState<Array<MentionItem>>(items);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect((): void => {
      setAllItems(items);
      setPage(1);
      setHasMore(initialHasMore);
      setSelectedIndex(0);
      setIsLoadingMore(false);
    }, [query, items, initialHasMore]);

    const selectItem = (index: number): boolean => {
      const item = allItems[index];
      if (!item) return false;
      command(item);
      return true;
    };

    const handleLoadMore = useCallback(async (): Promise<void> => {
      if (isLoadingMore) return;
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const result = await resolvePage(query, nextPage);
      setAllItems((prev): Array<MentionItem> => [...prev, ...result.items]);
      setPage(nextPage);
      setHasMore(result.hasMore);
      setIsLoadingMore(false);
    }, [isLoadingMore, page, query, resolvePage]);

    useImperativeHandle(
      ref,
      (): MentionListHandle => ({
        onKeyDown: (event: KeyboardEvent): boolean => {
          if (event.key === 'ArrowUp') {
            setSelectedIndex(
              (current): number =>
                (current + allItems.length - 1) % Math.max(allItems.length, 1),
            );
            return true;
          }
          if (event.key === 'ArrowDown') {
            setSelectedIndex(
              (current): number => (current + 1) % Math.max(allItems.length, 1),
            );
            return true;
          }
          if (event.key === 'Enter') {
            return selectItem(selectedIndex);
          }
          return false;
        },
      }),
    );

    return (
      <div
        data-slot="mention-list"
        data-test-id="mention-list"
        className="bg-popover text-popover-foreground rounded-md border shadow-md w-72 py-1"
      >
        {allItems.length === 0 && (
          <div
            data-test-id="mention-list-empty"
            className="px-3 py-2 text-xs text-muted-foreground"
          >
            Nenhum usuário encontrado
          </div>
        )}
        {allItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            data-test-id="mention-list-item"
            data-active={index === selectedIndex || undefined}
            onMouseEnter={(): void => setSelectedIndex(index)}
            onMouseDown={(event): void => {
              event.preventDefault();
              selectItem(index);
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer text-left',
              {
                'bg-accent text-accent-foreground': index === selectedIndex,
                'hover:bg-accent hover:text-accent-foreground':
                  index !== selectedIndex,
              },
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {getInitials(item.label)}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col flex-1 min-w-0">
              <span className="font-medium truncate">{item.label}</span>
              {item.email && (
                <span className="text-xs text-muted-foreground truncate">
                  {item.email}
                </span>
              )}
            </span>
          </button>
        ))}
        {hasMore && (
          <button
            type="button"
            data-test-id="mention-list-load-more"
            disabled={isLoadingMore}
            onMouseDown={(event): void => {
              event.preventDefault();
              void handleLoadMore();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore && <Loader2Icon className="size-3 animate-spin" />}
            {!isLoadingMore && 'Carregar mais'}
          </button>
        )}
      </div>
    );
  },
);

MentionList.displayName = 'MentionList';
