import { E_AI_LLM_PROVIDER } from '@application/core/entity.core';

import type { ResolvedLlmConfig } from './ai-setting-fields';
import type { LlmChatProvider } from './llm-chat.types';
import { createClaudeProvider } from './providers/claude-chat-api';
import { createOpenAiCompatProvider } from './providers/openai-chat-api';

const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GEMINI_OPENAI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/openai';

export function createLlmChatProvider(
  config: ResolvedLlmConfig,
): LlmChatProvider {
  const { provider, apiKey, model, baseUrl } = config;

  if (provider === E_AI_LLM_PROVIDER.CLAUDE) {
    return createClaudeProvider({
      apiKey: apiKey!,
      model,
    });
  }

  if (provider === E_AI_LLM_PROVIDER.OPENROUTER) {
    return createOpenAiCompatProvider({
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
    return createOpenAiCompatProvider({
      baseUrl: baseUrl!,
      apiKey: apiKey?.trim() || 'ollama',
      model,
    });
  }

  if (provider === E_AI_LLM_PROVIDER.GEMINI) {
    return createOpenAiCompatProvider({
      baseUrl: GEMINI_OPENAI_BASE,
      apiKey: apiKey!,
      model,
    });
  }

  return createOpenAiCompatProvider({
    baseUrl: OPENAI_BASE,
    apiKey: apiKey!,
    model,
  });
}
