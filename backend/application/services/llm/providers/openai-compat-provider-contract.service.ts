import type { LlmChatProvider } from '../llm-chat.types';

export type OpenAiCompatConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

/**
 * Adaptador de qualquer API compativel com `/chat/completions` da OpenAI —
 * cobre OpenAI, OpenRouter, Gemini (endpoint OpenAI) e Ollama.
 */
export abstract class OpenAiCompatProviderContractService {
  abstract create(config: OpenAiCompatConfig): LlmChatProvider;
}
