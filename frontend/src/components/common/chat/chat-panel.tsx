import { getRouteApi } from '@tanstack/react-router';
import { Paperclip, Send, Trash2, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ChatMessage } from './chat-message';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatSocket } from '@/hooks/use-chat-socket';
import type { FileData } from '@/hooks/use-chat-socket';

const rootApi = getRouteApi('__root__');

type ChatPanelProps = {
  onClose?: () => void;
};

export function ChatPanel({ onClose }: ChatPanelProps): React.JSX.Element {
  const { baseUrl, chatHistoryEnabled } = rootApi.useLoaderData();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    toolActivities,
    status,
    statusMessage,
    llmProviderLabel,
    llmModel,
    sendMessage,
    clearMessages,
    reconnect,
  } = useChatSocket(baseUrl, chatHistoryEnabled ?? false);

  const isLoading = status === 'thinking' || status === 'connecting';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolActivities]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
    inputRef.current?.focus();
  }

  function renderStatusOrWelcome(): React.JSX.Element | null {
    if (status === 'connecting') {
      return (
        <div className="text-center text-sm text-muted-foreground py-8">
          {statusMessage}
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-center text-sm text-destructive">
            {statusMessage}
          </p>
          <button
            type="button"
            onClick={reconnect}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className="text-center text-sm text-muted-foreground py-8">
          Ola! Sou o assistente do LowCodeJS. Posso ajudar a gerenciar suas
          tabelas, campos e registros. Como posso ajudar?
        </div>
      );
    }
    return null;
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload via POST /chat/upload (igual agent POST /upload)
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${baseUrl}/chat/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erro ao enviar arquivo');
        return;
      }

      const fileData: FileData = data;
      const text = input.trim();
      sendMessage(text || '', fileData);
      setInput('');
    } catch {
      alert('Erro ao enviar arquivo');
    }

    // Limpar input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div
      data-slot="chat-panel"
      data-test-id="chat-panel"
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Assistente IA</h3>
          <p className="text-xs text-muted-foreground">
            {(llmProviderLabel &&
              llmModel &&
              `${llmProviderLabel} · ${llmModel}`) ||
              'LowCodeJS'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearMessages}
              title="Limpar historico"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="space-y-3 py-4 px-4">
          {renderStatusOrWelcome()}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}
          {/* Tool activities (igual agent: tool_call com loading, tool_result, tool_error) */}
          {toolActivities.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm space-y-1">
                {toolActivities.map((activity) => {
                  if (activity.type === 'tool_call') {
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                        Usando ferramenta: {activity.name.replace(/_/g, ' ')}
                      </div>
                    );
                  }
                  if (activity.type === 'tool_error') {
                    return (
                      <div
                        key={activity.id}
                        className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive"
                      >
                        Erro: {activity.errorMessage || activity.name}
                      </div>
                    );
                  }
                  // tool_result - mostrar como concluído
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      {activity.name.replace(/_/g, ' ')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {status === 'thinking' && toolActivities.length === 0 && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Pensando...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t p-3"
      >
        <div className="flex gap-2">
          {/* Upload de arquivo (igual agent POST /upload) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Enviar arquivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={inputRef}
            data-test-id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            data-test-id="chat-send-btn"
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
