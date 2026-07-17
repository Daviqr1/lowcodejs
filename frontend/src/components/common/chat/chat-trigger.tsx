import { MessageCircleIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

type ChatTriggerProps = {
  onClick: () => void;
  isOpen: boolean;
};

export function ChatTrigger({
  onClick,
  isOpen,
}: ChatTriggerProps): React.JSX.Element {
  return (
    <Button
      data-slot="chat-trigger"
      data-test-id="chat-trigger-btn"
      variant={((): 'default' | 'outline' => {
        if (isOpen) {
          return 'default';
        }
        return 'outline';
      })()}
      className="shadow-none p-1 h-auto"
      onClick={onClick}
    >
      <MessageCircleIcon className="size-4" />
      <span>Assistente</span>
    </Button>
  );
}
