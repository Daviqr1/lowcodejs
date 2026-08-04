import type { LlmChatProvider } from '../llm-chat.types';

export type ClaudeConfig = {
  apiKey: string;
  model: string;
};

/** Adaptador da API de mensagens da Anthropic para o contrato de chat. */
export abstract class ClaudeProviderContractService {
  abstract create(config: ClaudeConfig): LlmChatProvider;
}
