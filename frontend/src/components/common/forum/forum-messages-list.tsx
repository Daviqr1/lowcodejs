import {
  DownloadIcon,
  FileIcon,
  PencilIcon,
  ReplyIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';

import type { ForumMessage } from './forum-types';

import { AttachmentContextMenu } from '@/components/common/file-upload/attachment-context-menu';
import { ContentViewer } from '@/components/common/rich-editor';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { stripHtml } from '@/lib/forum-helpers';
import { getUserInitials } from '@/lib/kanban-helpers';
import { getStorageDownloadUrl } from '@/lib/storage-url';
import { cn } from '@/lib/utils';

interface ForumMessagesListProps {
  messages: Array<ForumMessage>;
  currentUserId: string;
  endRef: React.RefObject<HTMLDivElement | null>;
  onReply: (messageId: string) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleReaction: (index: number, emoji: string) => void;
  trackedMentionMessageIds?: Array<string>;
  onMentionMessageVisible?: (messageId: string) => void;
  scrollToMessageId?: string | null;
  scrollToMessageTick?: number;
  highlightedMessageId?: string | null;
  highlightedMessageTick?: number;
}

export function ForumMessagesList({
  messages,
  currentUserId,
  endRef,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  trackedMentionMessageIds = [],
  onMentionMessageVisible,
  scrollToMessageId,
  scrollToMessageTick,
  highlightedMessageId,
  highlightedMessageTick,
}: ForumMessagesListProps): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [flashMessageId, setFlashMessageId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!scrollToMessageId) return;
    const target = messageRefs.current[scrollToMessageId];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToMessageId, scrollToMessageTick]);

  React.useEffect((): void | (() => void) => {
    if (!highlightedMessageId) return;
    setFlashMessageId(highlightedMessageId);
    const timeout = window.setTimeout(() => {
      setFlashMessageId((current) => {
        if (current === highlightedMessageId) {
          return null;
        }
        return current;
      });
    }, 3500);
    return (): void => window.clearTimeout(timeout);
  }, [highlightedMessageId, highlightedMessageTick]);

  React.useEffect(() => {
    if (!onMentionMessageVisible) return;
    if (trackedMentionMessageIds.length === 0) return;
    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const trackedSet = new Set(trackedMentionMessageIds);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!(entry.target instanceof HTMLElement)) continue;
          const messageId = entry.target.dataset.messageId;
          if (!messageId || !trackedSet.has(messageId)) continue;
          onMentionMessageVisible(messageId);
        }
      },
      {
        root,
        threshold: 0.6,
      },
    );

    for (const messageId of trackedMentionMessageIds) {
      const node = messageRefs.current[messageId];
      if (node) observer.observe(node);
    }

    return (): void => observer.disconnect();
  }, [onMentionMessageVisible, trackedMentionMessageIds, messages.length]);

  return (
    <div
      data-slot="forum-messages-list"
      data-test-id="forum-messages-list"
      ref={containerRef}
      className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-4"
    >
      {messages.map((message, index) => {
        let authorName = 'Usuario';
        if (typeof message.author === 'string') {
          authorName = message.author;
        } else if (message.author?.name) {
          authorName = message.author.name;
        } else if (message.author?.email) {
          authorName = message.author.email;
        }
        const canManage = message.authorId === currentUserId;
        const hasLiked = message.reactions
          .find((r) => r.emoji === '👍')
          ?.users.includes(currentUserId);
        const hasLoved = message.reactions
          .find((r) => r.emoji === '❤️')
          ?.users.includes(currentUserId);
        let replyMessage: ForumMessage | null = null;
        if (message.replyTo) {
          replyMessage =
            messages.find((item) => item.id === message.replyTo) ?? null;
        }
        let replySnippet = '';
        if (replyMessage) {
          replySnippet =
            stripHtml(replyMessage.text || '') || 'Mensagem sem texto';
        }

        return (
          <div
            key={message.id}
            ref={(node) => {
              messageRefs.current[message.id] = node;
            }}
            data-message-id={message.id}
            className={cn(
              'flex gap-3 rounded-md transition',
              trackedMentionMessageIds.includes(message.id) &&
                'ring-1 ring-primary/40 bg-primary/5 p-2 -m-2',
              flashMessageId === message.id &&
                'ring-2 ring-amber-400 bg-amber-50/70 dark:bg-amber-950/20 animate-pulse',
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getUserInitials(message.author ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {message.dateLabel}
                </span>
                {canManage && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onEdit(index)}
                      className="cursor-pointer"
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onDelete(index)}
                      className="cursor-pointer"
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                )}
              </div>

              {replyMessage && (
                <div className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  <div className="font-medium text-muted-foreground">
                    Respondendo a{' '}
                    {((): string => {
                      if (typeof replyMessage.author === 'string') {
                        return replyMessage.author;
                      }
                      return replyMessage.author?.name || 'Usuario';
                    })()}
                  </div>
                  <div className="line-clamp-2">{replySnippet}</div>
                </div>
              )}

              {message.text && <ContentViewer content={message.text} />}

              {message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((file) => {
                    const isImage = file.mimetype.includes('image');
                    let filePreview = <FileIcon className="size-5" />;
                    if (isImage) {
                      filePreview = (
                        <img
                          src={file.url}
                          alt={file.originalName}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      );
                    }
                    return (
                      <div
                        key={file._id}
                        className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted/40"
                      >
                        <AttachmentContextMenu storage={file}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 min-w-0"
                          >
                            {filePreview}
                            <span className="max-w-[160px] truncate">
                              {file.originalName}
                            </span>
                          </a>
                        </AttachmentContextMenu>
                        <a
                          href={getStorageDownloadUrl(file)}
                          aria-label={`Baixar ${file.originalName}`}
                          title="Baixar"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <DownloadIcon className="size-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {message.mentions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {message.mentions.map((mention, idx) => {
                    let mentionLabel = '';
                    if (typeof mention === 'string') {
                      mentionLabel = mention;
                    } else {
                      mentionLabel = mention.name || mention.email;
                    }
                    return (
                      <Badge
                        key={`${message.id}-mention-${idx}`}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        @{mentionLabel}
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onReply(message.id)}
                  className="cursor-pointer"
                >
                  <ReplyIcon className="size-4" />
                  Responder
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={((): 'secondary' | 'ghost' => {
                    if (hasLiked) {
                      return 'secondary';
                    }
                    return 'ghost';
                  })()}
                  onClick={() => onToggleReaction(index, '👍')}
                  className={cn(
                    'cursor-pointer transition',
                    hasLiked &&
                      'bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                >
                  👍{' '}
                  {message.reactions.find((r) => r.emoji === '👍')?.users
                    .length ?? 0}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={((): 'secondary' | 'ghost' => {
                    if (hasLoved) {
                      return 'secondary';
                    }
                    return 'ghost';
                  })()}
                  onClick={() => onToggleReaction(index, '❤️')}
                  className={cn(
                    'cursor-pointer transition',
                    hasLoved &&
                      'bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                >
                  ❤️{' '}
                  {message.reactions.find((r) => r.emoji === '❤️')?.users
                    .length ?? 0}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
      )}
      <div ref={endRef} />
    </div>
  );
}
