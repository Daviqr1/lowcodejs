import { E_AI_LLM_PROVIDER } from '@/lib/constant';

export type AiLlmProvider =
  (typeof E_AI_LLM_PROVIDER)[keyof typeof E_AI_LLM_PROVIDER];

export const AI_LLM_PROVIDER_OPTIONS: Array<{
  value: AiLlmProvider;
  label: string;
  description: string;
}> = [
  {
    value: E_AI_LLM_PROVIDER.OPENAI,
    label: 'OpenAI',
    description: 'API oficial da OpenAI (GPT-4.1, GPT-5, etc.)',
  },
  {
    value: E_AI_LLM_PROVIDER.GEMINI,
    label: 'Google Gemini',
    description: 'Modelos Gemini via Google AI Studio',
  },
  {
    value: E_AI_LLM_PROVIDER.CLAUDE,
    label: 'Anthropic Claude',
    description: 'Modelos Claude via API Anthropic',
  },
  {
    value: E_AI_LLM_PROVIDER.OPENROUTER,
    label: 'OpenRouter',
    description: 'Gateway com vários modelos (formato openai/modelo)',
  },
  {
    value: E_AI_LLM_PROVIDER.OLLAMA,
    label: 'Ollama (local)',
    description: 'LLM local via Ollama — API compatível com OpenAI',
  },
];

export const LLM_MODEL_OPTIONS: Record<
  AiLlmProvider,
  Array<{ value: string; label: string }>
> = {
  [E_AI_LLM_PROVIDER.OPENAI]: [
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'gpt-5.4', label: 'GPT-5.4' },
    { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' },
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    { value: 'gpt-5.5', label: 'GPT-5.5' },
    { value: 'gpt-5.5-pro', label: 'GPT-5.5 Pro' },
  ],
  [E_AI_LLM_PROVIDER.GEMINI]: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  [E_AI_LLM_PROVIDER.CLAUDE]: [
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  [E_AI_LLM_PROVIDER.OPENROUTER]: [
    { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
    { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
    {
      value: 'anthropic/claude-3.5-haiku',
      label: 'Anthropic Claude 3.5 Haiku',
    },
    { value: 'google/gemini-2.0-flash-001', label: 'Google Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B' },
  ],
  [E_AI_LLM_PROVIDER.OLLAMA]: [
    { value: 'llama3.2', label: 'Llama 3.2' },
    { value: 'llama3.1', label: 'Llama 3.1' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'gemma2', label: 'Gemma 2' },
  ],
};

export function getLlmProviderLabel(provider: string): string {
  const found = AI_LLM_PROVIDER_OPTIONS.find((o) => o.value === provider);
  return found?.label ?? provider;
}

export function providerRequiresApiKey(provider: AiLlmProvider): boolean {
  return provider !== E_AI_LLM_PROVIDER.OLLAMA;
}

export function providerShowsBaseUrl(provider: AiLlmProvider): boolean {
  return provider === E_AI_LLM_PROVIDER.OLLAMA;
}
