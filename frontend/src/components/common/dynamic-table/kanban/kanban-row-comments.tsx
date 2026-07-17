import type { Editor as TiptapEditor } from '@tiptap/core';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';

import { ContentViewer, Editor } from '@/components/common/rich-editor';
import type { MentionConfig } from '@/components/common/rich-editor';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { IUser } from '@/lib/interfaces';
import { getUserInitials } from '@/lib/kanban-helpers';

export function KanbanRowCommentsSection({
  comments,
  profile,
  currentUserId,
  rowCreatorId,
  editingCommentIndex,
  editingCommentText,
  onEditStart,
  onEditCancel,
  onEditChange,
  onEditEditorReady,
  onSave,
  onDelete,
  commentText,
  onCommentTextChange,
  onCommentEditorReady,
  onAddComment,
  mentions,
}: {
  // comentários são dados dinâmicos de row (valor por slug é any no low-code).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: Array<Record<string, any>>;
  profile?: IUser;
  currentUserId: string;
  rowCreatorId?: string;
  editingCommentIndex: number | null;
  editingCommentText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditStart: (index: number, comment: Record<string, any>) => void;
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onEditEditorReady?: (editor: TiptapEditor) => void;
  onSave: () => void;
  onDelete: (index: number) => void;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onCommentEditorReady?: (editor: TiptapEditor) => void;
  onAddComment: () => void;
  mentions?: MentionConfig;
}): React.JSX.Element {
  return (
    <section
      data-slot="kanban-row-comments"
      data-test-id="kanban-row-comments"
      className="mt-6 space-y-3"
    >
      <h3 className="text-sm font-semibold">Comentarios</h3>
      <div className="space-y-3">
        {comments.map((comment, index) => {
          let rawAuthor = comment.autor;
          if (Array.isArray(comment.autor)) rawAuthor = comment.autor[0];
          let author: IUser | string | undefined = rawAuthor;
          if (
            typeof rawAuthor === 'string' &&
            profile &&
            rawAuthor === profile._id
          ) {
            author = profile;
          }
          let authorId: string | undefined;
          if (typeof author === 'string') {
            authorId = author;
          } else {
            authorId = author?._id;
          }
          const canManage =
            authorId === currentUserId || rowCreatorId === currentUserId;
          let dateLabel = '';
          if (comment.data) {
            dateLabel = format(new Date(comment.data), 'dd/MM/yyyy HH:mm', {
              locale: ptBR,
            });
          }

          return (
            <div
              key={index}
              className="rounded-lg border bg-background p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getUserInitials(author ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <div className="font-medium">
                      {((): React.ReactNode => {
                        if (typeof author === 'string') {
                          return author;
                        }
                        return author?.name || author?.email || 'Usuario';
                      })()}
                    </div>
                    <div className="text-muted-foreground">{dateLabel}</div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => onEditStart(index, comment)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => onDelete(index)}
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              </div>

              {((): React.ReactNode => {
                if (editingCommentIndex === index) {
                  return (
                    <div className="space-y-2">
                      <div data-test-id="kanban-comment-edit-input">
                        <Editor
                          variant="compact"
                          showToolbar={false}
                          showBubble={false}
                          showModeToggle={false}
                          availableModes={['rich']}
                          value={editingCommentText}
                          onChange={onEditChange}
                          placeholder="Editar comentário"
                          focusKey={`edit-${index}`}
                          autoFocus
                          mentions={mentions}
                          onEditorReady={onEditEditorReady}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={onEditCancel}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={onSave}
                          className="cursor-pointer"
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <ContentViewer
                    className="text-sm"
                    content={comment.comentario || ''}
                  />
                );
              })()}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div data-test-id="kanban-comment-input">
          <Editor
            variant="compact"
            showToolbar={false}
            showBubble={false}
            showModeToggle={false}
            availableModes={['rich']}
            value={commentText}
            onChange={onCommentTextChange}
            placeholder="Escreva um comentário"
            mentions={mentions}
            onEditorReady={onCommentEditorReady}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onAddComment}
            data-test-id="kanban-comment-submit-btn"
            className="cursor-pointer"
          >
            Enviar comentario
          </Button>
        </div>
      </div>
    </section>
  );
}
