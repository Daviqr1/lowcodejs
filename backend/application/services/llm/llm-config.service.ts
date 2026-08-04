import { Service } from 'fastify-decorators';

import {
  E_AI_LLM_PROVIDER,
  type ISetting,
} from '@application/core/entity.core';
import type { SettingUpdatePayload } from '@application/repositories/setting/setting-contract.repository';

import type {
  AiLlmProvider,
  ResolvedLlmConfig,
} from './llm-config-contract.service';
import { LlmConfigContractService } from './llm-config-contract.service';

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

@Service()
export default class LlmConfigService implements LlmConfigContractService {
  parseProvider(value: string | null | undefined): AiLlmProvider {
    const normalized = (value ?? '').trim().toLowerCase();
    const match = Object.values(E_AI_LLM_PROVIDER).find(
      (v) => v === normalized,
    );
    if (match) return match;
    return E_AI_LLM_PROVIDER.OPENAI;
  }

  providerLabel(provider: AiLlmProvider): string {
    return PROVIDER_LABELS[provider] ?? provider;
  }

  defaultModel(provider: AiLlmProvider): string {
    return DEFAULT_MODEL_BY_PROVIDER[provider];
  }

  defaultOllamaBaseUrl(): string {
    return DEFAULT_OLLAMA_BASE_URL;
  }

  resolve(setting: Partial<ISetting> | null | undefined): ResolvedLlmConfig {
    const provider = this.parseProvider(setting?.AI_LLM_PROVIDER);
    const apiKey =
      setting?.LLM_API_KEY?.trim() || setting?.OPENAI_API_KEY?.trim() || null;
    const model =
      setting?.LLM_MODEL?.trim() ||
      setting?.OPENAI_MODEL?.trim() ||
      this.defaultModel(provider);
    const baseUrl =
      setting?.LLM_BASE_URL?.trim() || this.defaultOllamaBaseUrl();

    // O if/else cobre os dois casos; o valor inicial era sempre descartado.
    let isConfigured = Boolean(apiKey?.trim() && model?.trim());
    if (provider === 'ollama') {
      isConfigured = Boolean(baseUrl?.trim() && model?.trim());
    }

    let resolvedBaseUrl = setting?.LLM_BASE_URL?.trim() || null;
    if (provider === 'ollama') resolvedBaseUrl = baseUrl;

    return {
      provider,
      apiKey,
      model,
      baseUrl: resolvedBaseUrl,
      isConfigured,
    };
  }

  projectFields(setting: Partial<ISetting>): Record<string, unknown> {
    const resolved = this.resolve(setting);
    return {
      AI_LLM_PROVIDER: resolved.provider,
      LLM_API_KEY: resolved.apiKey,
      LLM_MODEL: resolved.model,
      LLM_BASE_URL: resolved.baseUrl,
      OPENAI_API_KEY: resolved.apiKey,
      OPENAI_MODEL: resolved.model,
    };
  }

  prepareForSave(payload: SettingUpdatePayload): SettingUpdatePayload {
    const provider = this.parseProvider(payload.AI_LLM_PROVIDER);

    let llmKey: string | undefined;
    if (payload.LLM_API_KEY !== undefined && payload.LLM_API_KEY !== null) {
      llmKey = payload.LLM_API_KEY.trim() || undefined;
    }
    let openAiKey: string | undefined;
    if (
      payload.OPENAI_API_KEY !== undefined &&
      payload.OPENAI_API_KEY !== null
    ) {
      openAiKey = payload.OPENAI_API_KEY.trim() || undefined;
    }

    if (llmKey !== undefined) {
      payload.LLM_API_KEY = llmKey;
      if (provider === 'openai') {
        payload.OPENAI_API_KEY = llmKey;
      }
    } else if (openAiKey !== undefined) {
      payload.OPENAI_API_KEY = openAiKey;
      payload.LLM_API_KEY = openAiKey;
    } else {
      delete payload.LLM_API_KEY;
      delete payload.OPENAI_API_KEY;
    }

    if (payload.LLM_MODEL !== undefined) {
      if (provider === 'openai') {
        payload.OPENAI_MODEL = payload.LLM_MODEL;
      }
    } else if (payload.OPENAI_MODEL !== undefined) {
      payload.LLM_MODEL = payload.OPENAI_MODEL;
    }

    if (payload.AI_LLM_PROVIDER !== undefined) {
      payload.AI_LLM_PROVIDER = provider;
    }

    return payload;
  }
}
