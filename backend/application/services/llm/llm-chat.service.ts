import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Service } from 'fastify-decorators';
import type { Socket } from 'socket.io';

import {
  E_CHAT_EVENT,
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
} from '@application/core/entity.core';
import { E_AI_LLM_PROVIDER } from '@application/core/entity.core';
import { Logger } from '@application/model/logger.model';

import type {
  ChatCompletionParams,
  ChatCompletionResult,
} from './llm-chat-contract.service';
import { LlmChatContractService } from './llm-chat-contract.service';
import type { FileData, LlmChatMessage, LlmChatTool } from './llm-chat.types';
import type { LlmChatProvider } from './llm-chat.types';
import type { ResolvedLlmConfig } from './llm-config-contract.service';
import { ClaudeProviderContractService } from './providers/claude-provider-contract.service';
import { OpenAiCompatProviderContractService } from './providers/openai-compat-provider-contract.service';

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

const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GEMINI_OPENAI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/openai';

async function executeMcpTool(params: {
  mcpClient: Client;
  toolName: string;
  toolArgs: Record<string, unknown>;
  socket: Socket;
  userId: string;
}): Promise<string> {
  const { mcpClient, toolName, toolArgs, socket, userId } = params;

  socket.emit(E_CHAT_EVENT.TOOL_CALL, { name: toolName, args: toolArgs });

  console.log('[MCP Log] tool_call:', toolName, toolArgs);
  Logger.create({
    url: `mcp://${toolName}`,
    user: userId,
    action: E_LOGGER_ACTION_TYPE.AI_CALL,
    object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
    object_id: toolName,
    content: toolArgs,
  }).catch((err: unknown) => console.error('[MCP Log] create error:', err));

  try {
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    let contentStr = '';
    if (result.content && Array.isArray(result.content)) {
      for (const content of result.content) {
        if (content.type === 'text') {
          contentStr += content.text || '';
        } else {
          contentStr += `[${content.type}]`;
        }
      }
    } else {
      contentStr = String(result);
    }

    let preview = contentStr;
    if (contentStr.length > 150) preview = contentStr.slice(0, 150) + '...';

    socket.emit(E_CHAT_EVENT.TOOL_RESULT, { name: toolName, preview });

    console.log('[MCP Log] tool_result:', toolName, '|', preview);
    Logger.create({
      url: `mcp://${toolName}/result`,
      user: userId,
      action: E_LOGGER_ACTION_TYPE.AI_RESPONSE,
      object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
      object_id: toolName,
      content: { preview, length: contentStr.length },
    }).catch((err: unknown) => console.error('[MCP Log] create error:', err));

    return contentStr;
  } catch (err) {
    let errorMsg = String(err);
    if (err instanceof Error) errorMsg = err.message;

    socket.emit(E_CHAT_EVENT.TOOL_ERROR, {
      name: toolName,
      message: errorMsg,
    });

    console.error('[MCP Log] tool_error:', toolName, errorMsg);
    Logger.create({
      url: `mcp://${toolName}/error`,
      user: userId,
      action: E_LOGGER_ACTION_TYPE.AI_RESPONSE,
      object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
      object_id: toolName,
      content: { error: errorMsg },
    }).catch((logErr: unknown) =>
      console.error('[MCP Log] create error:', logErr),
    );

    return errorMsg;
  }
}

@Service()
export default class LlmChatService implements LlmChatContractService {
  constructor(
    private readonly claude: ClaudeProviderContractService,
    private readonly openAiCompat: OpenAiCompatProviderContractService,
  ) {}

  providerFor(config: ResolvedLlmConfig): LlmChatProvider {
    const { provider, apiKey, model, baseUrl } = config;

    if (provider === E_AI_LLM_PROVIDER.CLAUDE) {
      return this.claude.create({
        apiKey: apiKey!,
        model,
      });
    }

    if (provider === E_AI_LLM_PROVIDER.OPENROUTER) {
      return this.openAiCompat.create({
        baseUrl: OPENROUTER_BASE,
        apiKey: apiKey!,
        model,
        extraHeaders: {
          'HTTP-Referer': 'https://lowcodejs.org',
          'X-Title': 'LowCodeJS',
        },
      });
    }

    if (provider === E_AI_LLM_PROVIDER.OLLAMA) {
      return this.openAiCompat.create({
        baseUrl: baseUrl!,
        apiKey: apiKey?.trim() || 'ollama',
        model,
      });
    }

    if (provider === E_AI_LLM_PROVIDER.GEMINI) {
      return this.openAiCompat.create({
        baseUrl: GEMINI_OPENAI_BASE,
        apiKey: apiKey!,
        model,
      });
    }

    return this.openAiCompat.create({
      baseUrl: OPENAI_BASE,
      apiKey: apiKey!,
      model,
    });
  }

  async complete(params: ChatCompletionParams): Promise<ChatCompletionResult> {
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

    const provider = this.providerFor(llmConfig);
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
}
