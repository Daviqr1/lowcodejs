/**
 * Hook Socket.IO para o chat com IA.
 * Segue estritamente o protocolo do agent/web_app.py.
 * Invalida queries do TanStack Query após tool results que modificam dados.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { queryKeys } from './tanstack-query/_query-keys';

import { E_CHAT_EVENT, E_CHAT_TOOL_PREFIX } from '@/lib/constant';

export type FileData = {
  type: 'image' | 'pdf';
  filename: string;
  content_type?: string;
  data_uri?: string;
  extracted_text?: string;
  page_count?: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  file?: FileData;
  variant?: 'default' | 'system-warning';
};

export type ToolActivity = {
  id: string;
  type: 'tool_call' | 'tool_result' | 'tool_error';
  name: string;
  args?: Record<string, unknown>;
  preview?: string;
  errorMessage?: string;
};

export type ChatStatus = 'connecting' | 'ready' | 'thinking' | 'idle' | 'error';

// Tools que são somente leitura (não modificam dados)
const READ_ONLY_TOOLS = new Set([
  'auth_check',
  'tables_list',
  'tables_find',
  'fields_list',
  'fields_find',
  'rows_list',
  'rows_find',
  'files_list',
  'profile_get',
]);

let messageIdCounter = 0;
function nextId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

export function useChatSocket(
  baseUrl: string,
  persistHistory = false,
): {
  messages: Array<ChatMessage>;
  toolActivities: Array<ToolActivity>;
  status: ChatStatus;
  statusMessage: string;
  toolsCount: number;
  llmProviderLabel: string | null;
  llmModel: string | null;
  sendMessage: (text: string, file?: FileData) => void;
  clearMessages: () => void;
  reconnect: () => void;
  isConnected: boolean;
} {
  const STORAGE_KEY = 'chat-messages';
  const MAX_MESSAGES = 100;

  function loadMessages(): Array<ChatMessage> {
    if (!persistHistory) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: Array<ChatMessage> = JSON.parse(raw);
      return parsed;
    } catch {
      return [];
    }
  }

  function saveMessages(msgs: Array<ChatMessage>): void {
    if (!persistHistory) return;
    try {
      const capped = msgs.slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    } catch {
      /* ignore quota errors */
    }
  }

  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Array<ChatMessage>>(loadMessages);
  const [toolActivities, setToolActivities] = useState<Array<ToolActivity>>([]);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState('Conectando...');
  const [toolsCount, setToolsCount] = useState(0);
  const [llmProviderLabel, setLlmProviderLabel] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /**
   * Invalida queries relevantes após um tool_result que modifica dados.
   * Mapeia o prefixo do nome da tool para as query keys afetadas.
   */
  function invalidateQueriesForTool(toolName: string): void {
    if (READ_ONLY_TOOLS.has(toolName)) return;

    if (toolName.startsWith(E_CHAT_TOOL_PREFIX.TABLES)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
    }

    if (toolName.startsWith(E_CHAT_TOOL_PREFIX.FIELDS)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    }

    if (toolName.startsWith(E_CHAT_TOOL_PREFIX.ROWS)) {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    }

    if (toolName.startsWith(E_CHAT_TOOL_PREFIX.FILES)) {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    }

    if (toolName.startsWith(E_CHAT_TOOL_PREFIX.PROFILE)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    }
  }

  useEffect(() => {
    const socket = io(baseUrl, {
      withCredentials: true,
      path: '/socket.io',
    });

    socketRef.current = socket;

    // Track if server explicitly sent an error (config/auth issue)
    let serverError = false;

    socket.on('connect', () => {
      serverError = false;
      setIsConnected(true);
      setStatus('connecting');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      // Don't overwrite status/message when server already sent an error
      if (!serverError) {
        setStatus('connecting');
        setStatusMessage('Reconectando...');
      }
    });

    // --- Eventos do protocolo do agent ---

    socket.on(E_CHAT_EVENT.STATUS, (data: { message: string }) => {
      setStatusMessage(data.message);
    });

    socket.on(
      E_CHAT_EVENT.READY,
      (data: {
        message: string;
        tools_count: number;
        llm_provider?: string;
        llm_provider_label?: string;
        llm_model?: string;
      }) => {
        setStatusMessage(data.message);
        setToolsCount(data.tools_count);
        setLlmProviderLabel(
          data.llm_provider_label ?? data.llm_provider ?? null,
        );
        setLlmModel(data.llm_model ?? null);
        setStatus('idle');

        // Restore history so backend has conversation context
        if (persistHistory) {
          const stored = loadMessages();
          if (stored.length > 0) {
            socket.emit(E_CHAT_EVENT.HISTORY, {
              messages: stored.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            });
          }
        }
      },
    );

    socket.on(E_CHAT_EVENT.THINKING, () => {
      setStatus('thinking');
      setToolActivities([]);
    });

    socket.on(
      E_CHAT_EVENT.LLM_INFO,
      (data: {
        llm_provider?: string;
        llm_provider_label?: string;
        llm_model?: string;
      }) => {
        setLlmProviderLabel(
          data.llm_provider_label ?? data.llm_provider ?? null,
        );
        setLlmModel(data.llm_model ?? null);
      },
    );

    socket.on(
      E_CHAT_EVENT.TOOL_CALL,
      (data: { name: string; args: Record<string, unknown> }) => {
        setToolActivities((prev) => [
          ...prev,
          {
            id: nextId(),
            type: 'tool_call',
            name: data.name,
            args: data.args,
          },
        ]);
      },
    );

    socket.on(
      E_CHAT_EVENT.TOOL_RESULT,
      (data: { name: string; preview: string }) => {
        setToolActivities((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (
              updated[i].name === data.name &&
              updated[i].type === 'tool_call'
            ) {
              updated[i] = {
                ...updated[i],
                type: 'tool_result',
                preview: data.preview,
              };
              break;
            }
          }
          return updated;
        });

        // Invalidar queries após tool que modifica dados
        invalidateQueriesForTool(data.name);
      },
    );

    socket.on(
      E_CHAT_EVENT.TOOL_ERROR,
      (data: { name: string; message: string }) => {
        setToolActivities((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (
              updated[i].name === data.name &&
              updated[i].type === 'tool_call'
            ) {
              updated[i] = {
                ...updated[i],
                type: 'tool_error',
                errorMessage: data.message,
              };
              break;
            }
          }
          return updated;
        });
      },
    );

    socket.on(
      E_CHAT_EVENT.MESSAGE,
      (data: { content: string; variant?: 'system-warning' }) => {
        setMessages((prev) => {
          const message = {
            id: nextId(),
            role: 'assistant',
            content: data.content,
            variant: data.variant ?? 'default',
          } satisfies ChatMessage;
          const next = [...prev, message];
          saveMessages(next);
          return next;
        });
        setToolActivities([]);
        setStatus('idle');
      },
    );

    socket.on(E_CHAT_EVENT.ERROR, (data: { message: string }) => {
      const fatal =
        data.message.includes('Autenticação') ||
        data.message.includes('Token inválido') ||
        data.message.includes('não está habilitado') ||
        data.message.includes('não está configurado');

      if (fatal) {
        serverError = true;
        socket.io.opts.reconnection = false;
        setStatus('error');
        setStatusMessage(data.message);
        return;
      }

      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: nextId(),
            role: 'assistant' as const,
            content: data.message,
            variant: 'system-warning' as const,
          },
        ];
        saveMessages(next);
        return next;
      });
      setToolActivities([]);
      setStatus('idle');
    });

    return (): void => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [baseUrl]);

  const sendMessage = useCallback((text: string, file?: FileData) => {
    if (!socketRef.current) return;

    setMessages((prev) => {
      const next = [
        ...prev,
        { id: nextId(), role: 'user' as const, content: text, file },
      ];
      saveMessages(next);
      return next;
    });

    socketRef.current.emit(E_CHAT_EVENT.MESSAGE, {
      message: text,
      file,
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setToolActivities([]);
    setStatus('idle');
    if (persistHistory) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.io.opts.reconnection = true;
    setStatus('connecting');
    setStatusMessage('Conectando...');
    socket.connect();
  }, []);

  return {
    messages,
    toolActivities,
    status,
    statusMessage,
    toolsCount,
    llmProviderLabel,
    llmModel,
    sendMessage,
    clearMessages,
    reconnect,
    isConnected,
  };
}
