import type { ISetting, ValueOf } from '@application/core/entity.core';
import type { E_AI_LLM_PROVIDER } from '@application/core/entity.core';
import type { SettingUpdatePayload } from '@application/repositories/setting/setting-contract.repository';

export type AiLlmProvider = ValueOf<typeof E_AI_LLM_PROVIDER>;

export type ResolvedLlmConfig = {
  provider: AiLlmProvider;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  isConfigured: boolean;
};

/**
 * Configuracao do LLM derivada do documento Setting. Concentra os defaults por
 * provedor e a conciliacao com os campos legados `OPENAI_*`, que continuam
 * gravados em espelho para nao quebrar instalacoes antigas.
 */
export abstract class LlmConfigContractService {
  /** Provedor valido a partir de um valor livre; cai em OPENAI. */
  abstract parseProvider(value: string | null | undefined): AiLlmProvider;

  /** Rotulo de exibicao do provedor. */
  abstract providerLabel(provider: AiLlmProvider): string;

  /** Modelo default do provedor. */
  abstract defaultModel(provider: AiLlmProvider): string;

  /** Base URL default do Ollama. */
  abstract defaultOllamaBaseUrl(): string;

  /** Config efetiva, ja com defaults e fallback dos campos legados. */
  abstract resolve(
    setting: Partial<ISetting> | null | undefined,
  ): ResolvedLlmConfig;

  /** Campos de IA prontos para resposta da API. */
  abstract projectFields(setting: Partial<ISetting>): Record<string, unknown>;

  /** Normaliza o payload de update, espelhando LLM_* e OPENAI_*. */
  abstract prepareForSave(payload: SettingUpdatePayload): SettingUpdatePayload;
}
