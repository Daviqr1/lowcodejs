import type { ISetting } from '@application/core/entity.core';
import type { SettingUpdatePayload } from '@application/repositories/setting/setting-contract.repository';

import {
  getDefaultLlmModel,
  getDefaultOllamaBaseUrl,
  parseAiLlmProvider,
  type AiLlmProvider,
} from './llm-defaults';

export type ResolvedLlmConfig = {
  provider: AiLlmProvider;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  isConfigured: boolean;
};

export function resolveLlmConfig(
  setting: Partial<ISetting> | null | undefined,
): ResolvedLlmConfig {
  const provider = parseAiLlmProvider(setting?.AI_LLM_PROVIDER);
  const apiKey =
    setting?.LLM_API_KEY?.trim() || setting?.OPENAI_API_KEY?.trim() || null;
  const model =
    setting?.LLM_MODEL?.trim() ||
    setting?.OPENAI_MODEL?.trim() ||
    getDefaultLlmModel(provider);
  const baseUrl = setting?.LLM_BASE_URL?.trim() || getDefaultOllamaBaseUrl();

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

export function projectAiSettingsFields(
  setting: Partial<ISetting>,
): Record<string, unknown> {
  const resolved = resolveLlmConfig(setting);
  return {
    AI_LLM_PROVIDER: resolved.provider,
    LLM_API_KEY: resolved.apiKey,
    LLM_MODEL: resolved.model,
    LLM_BASE_URL: resolved.baseUrl,
    OPENAI_API_KEY: resolved.apiKey,
    OPENAI_MODEL: resolved.model,
  };
}

export function prepareAiSettingsForSave(
  payload: SettingUpdatePayload,
): SettingUpdatePayload {
  const provider = parseAiLlmProvider(payload.AI_LLM_PROVIDER);

  let llmKey: string | undefined;
  if (payload.LLM_API_KEY !== undefined && payload.LLM_API_KEY !== null) {
    llmKey = payload.LLM_API_KEY.trim() || undefined;
  }
  let openAiKey: string | undefined;
  if (payload.OPENAI_API_KEY !== undefined && payload.OPENAI_API_KEY !== null) {
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
