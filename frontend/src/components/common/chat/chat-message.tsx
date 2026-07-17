import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import type { ChatMessage as ChatMessageData } from '@/hooks/use-chat-socket';
import { cn } from '@/lib/utils';

type ChatMessageProps = {
  message: ChatMessageData;
};

export function ChatMessage({ message }: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user';
  const isSystemWarning =
    message.variant === 'system-warning' ||
    message.content.startsWith('Não foi possível concluir a resposta');

  if (isSystemWarning) {
    return (
      <div
        data-slot="chat-message"
        data-test-id="chat-message-system-warning"
        className="flex w-full justify-center px-1 py-0.5"
      >
        <div className="w-full max-w-[92%] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-destructive/80 not-italic">
            Aviso do sistema
          </p>
          <p className="text-xs italic leading-relaxed text-destructive">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="chat-message"
      data-test-id="chat-message"
      className={cn(
        'flex gap-2 min-w-0 w-full',
        isUser && 'justify-end',
        !isUser && 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] min-w-0 rounded-lg px-3 py-2 text-sm',
          isUser && 'bg-primary text-primary-foreground',
          !isUser && 'bg-muted text-foreground',
        )}
      >
        {message.file && (
          <div className="mb-1 text-xs opacity-70">
            {message.file.type === 'image' && 'Imagem'}
            {message.file.type !== 'image' && 'PDF'}: {message.file.filename}
          </div>
        )}
        <div
          className={cn(
            'prose prose-sm max-w-none break-words',
            '[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap',
            '[&_code]:break-all',
            '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
            isUser && 'prose-invert',
            !isUser && 'dark:prose-invert',
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
