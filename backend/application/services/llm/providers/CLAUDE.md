# LLM Providers

Adapters concretos por provedor de LLM. Cada um implementa a interface de
provider consumida por `run-chat-completion.ts`, normalizando a API do provedor
(mensagens, tool-calls, streaming) para o formato interno.

## Arquivos

| Arquivo | Provedor |
|---------|----------|
| `openai-chat-api.ts` | OpenAI (e compativeis via `LLM_BASE_URL` — openrouter, ollama, etc.) |
| `claude-chat-api.ts` | Anthropic Claude (Messages API) |

## Notas

- Selecionados por `createLlmChatProvider(config)` (`../create-llm-provider.ts`)
  conforme `AI_LLM_PROVIDER` do Setting.
- Cada adapter traduz tool-definitions e tool-calls entre o formato do provedor e
  o loop generico, mantendo `run-chat-completion` agnostico de provedor.
