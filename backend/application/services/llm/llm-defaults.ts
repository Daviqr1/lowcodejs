import { E_AI_LLM_PROVIDER, type ValueOf } from '@application/core/entity.core';

export type AiLlmProvider = ValueOf<typeof E_AI_LLM_PROVIDER>;

const DEFAULT_MODEL_BY_PROVIDER: Record<AiLlmProvider, string> = {
  [E_AI_LLM_PROVIDER.OPENAI]: 'gpt-4.1-nano',
  [E_AI_LLM_PROVIDER.GEMINI]: 'gemini-2.0-flash',
  [E_AI_LLM_PROVIDER.CLAUDE]: 'claude-3-5-haiku-20241022',
  [E_AI_LLM_PROVIDER.OPENROUTER]: 'openai/gpt-4o-mini',
  [E_AI_LLM_PROVIDER.OLLAMA]: 'llama3.2',
};

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1';

const PROVIDER_LABELS: Record<AiLlmProvider, string> = {
  [E_AI_LLM_PROVIDER.OPENAI]: 'OpenAI',
  [E_AI_LLM_PROVIDER.GEMINI]: 'Google Gemini',
  [E_AI_LLM_PROVIDER.CLAUDE]: 'Anthropic Claude',
  [E_AI_LLM_PROVIDER.OPENROUTER]: 'OpenRouter',
  [E_AI_LLM_PROVIDER.OLLAMA]: 'Ollama (local)',
};

export function getLlmProviderLabel(provider: AiLlmProvider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function getDefaultLlmModel(provider: AiLlmProvider): string {
  return DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function getDefaultOllamaBaseUrl(): string {
  return DEFAULT_OLLAMA_BASE_URL;
}

export function parseAiLlmProvider(
  value: string | null | undefined,
): AiLlmProvider {
  const normalized = (value ?? '').trim().toLowerCase();
  const match = Object.values(E_AI_LLM_PROVIDER).find((v) => v === normalized);
  if (match) return match;
  return E_AI_LLM_PROVIDER.OPENAI;
}
