import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Socket } from 'socket.io';

import { E_CHAT_EVENT } from '@application/core/entity.core';

import type { ResolvedLlmConfig } from './ai-setting-fields';
import { createLlmChatProvider } from './create-llm-provider';
import type { LlmChatMessage, LlmChatTool } from './llm-chat.types';
import { executeMcpTool } from './mcp-tool-executor';

type FileData = {
  type: 'image' | 'pdf';
  filename: string;
  content_type?: string;
  data_uri?: string;
  extracted_text?: string;
  page_count?: number;
};

function buildUserMessage(userInput: string, file?: FileData): LlmChatMessage {
  if (!file) {
    return { role: 'user', content: userInput };
  }

  const filename = file.filename || 'arquivo';

  if (file.type === 'image' && file.data_uri) {
    const parts: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [];
    if (userInput) {
      parts.push({ type: 'text', text: userInput });
    } else {
      parts.push({
        type: 'text',
        text: `Transcreva e descreva detalhadamente o conteúdo desta imagem (${filename}):`,
      });
    }
    parts.push({ type: 'image_url', image_url: { url: file.data_uri } });
    return { role: 'user', content: parts };
  }

  if (file.type === 'pdf') {
    const extracted = file.extracted_text || '';
    const pageCount = file.page_count || 0;
    const prompt = userInput || 'Transcreva e analise o conteúdo deste PDF:';
    const fullContent = `${prompt}\n\nPDF: ${filename} (${pageCount} página(s))\n\n${extracted}`;
    return { role: 'user', content: fullContent };
  }

  return { role: 'user', content: userInput };
}

function buildLlmTools(
  mcpTools: Awaited<ReturnType<Client['listTools']>>['tools'],
): Array<LlmChatTool> | undefined {
  if (mcpTools.length === 0) return undefined;
  return mcpTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || {
        type: 'object',
        properties: {},
      },
    },
  }));
}

export async function runChatCompletion(params: {
  llmConfig: ResolvedLlmConfig;
  messages: Array<LlmChatMessage>;
  mcpClient: Client;
  mcpTools: Awaited<ReturnType<Client['listTools']>>['tools'];
  socket: Socket;
  userId: string;
  userInput: string;
  file?: FileData;
}): Promise<{ messages: Array<LlmChatMessage>; reply: string }> {
  const {
    llmConfig,
    messages,
    mcpClient,
    mcpTools,
    socket,
    userId,
    userInput,
    file,
  } = params;

  const trimmed = userInput.trim();
  if (!trimmed && !file) {
    return { messages, reply: '' };
  }

  messages.push(buildUserMessage(trimmed, file));

  const provider = createLlmChatProvider(llmConfig);
  const tools = buildLlmTools(mcpTools);

  const MAX_TOOL_ROUNDS = 25;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    socket.emit(E_CHAT_EVENT.THINKING);

    const result = await provider.complete({ messages, tools });
    const msg = result.message;
    messages.push(msg);

    if (msg.role !== 'assistant') {
      return { messages, reply: '' };
    }

    if (
      result.finishReason !== 'tool_calls' ||
      !msg.tool_calls ||
      msg.tool_calls.length === 0
    ) {
      return { messages, reply: msg.content ?? '' };
    }

    for (const toolCall of msg.tool_calls) {
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        toolArgs = {};
      }

      const contentStr = await executeMcpTool({
        mcpClient,
        toolName: toolCall.function.name,
        toolArgs,
        socket,
        userId,
      });

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: contentStr,
      });
    }
  }

  const last = messages[messages.length - 1];
  if (last?.role === 'assistant' && last.content) {
    return { messages, reply: last.content };
  }

  throw new Error(
    'Limite de chamadas de ferramentas do assistente atingido. Tente uma pergunta mais simples.',
  );
}
