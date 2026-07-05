import React from 'react';

import { ChatPanel } from './chat-panel';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type ChatSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatSidebar({
  open,
  onOpenChange,
}: ChatSidebarProps): React.JSX.Element {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet
        data-slot="chat-sidebar"
        data-test-id="chat-sidebar"
        open={open}
        onOpenChange={onOpenChange}
      >
        <SheetContent
          side="right"
          className="flex flex-col p-0 gap-0 w-full sm:max-w-md"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Assistente IA</SheetTitle>
          </SheetHeader>
          <ChatPanel onClose={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="chat-sidebar"
      data-test-id="chat-sidebar"
      className={cn(
        'shrink-0 transition-[width] duration-200 ease-linear overflow-hidden border-l',
        open && 'w-[340px]',
        !open && 'w-0 border-l-0',
      )}
    >
      <div className="w-[340px] h-full">
        <ChatPanel onClose={() => onOpenChange(false)} />
      </div>
    </div>
  );
}
