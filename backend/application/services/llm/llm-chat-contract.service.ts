import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Socket } from 'socket.io';

import type {
  FileData,
  LlmChatMessage,
  LlmChatProvider,
} from './llm-chat.types';
import type { ResolvedLlmConfig } from './llm-config-contract.service';

export type ChatCompletionParams = {
  llmConfig: ResolvedLlmConfig;
  messages: Array<LlmChatMessage>;
  mcpClient: Client;
  mcpTools: Awaited<ReturnType<Client['listTools']>>['tools'];
  socket: Socket;
  userId: string;
  userInput: string;
  file?: FileData;
};

export type ChatCompletionResult = {
  messages: Array<LlmChatMessage>;
  reply: string;
};

/**
 * Loop de conversa com o LLM: monta a mensagem do usuario, chama o provedor,
 * executa as ferramentas MCP que ele pedir e repete ate a resposta final ou o
 * teto de rodadas.
 */
export abstract class LlmChatContractService {
  abstract complete(
    params: ChatCompletionParams,
  ): Promise<ChatCompletionResult>;

  /** Provedor concreto para a config resolvida. */
  abstract providerFor(config: ResolvedLlmConfig): LlmChatProvider;
}
