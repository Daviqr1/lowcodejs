# LLM Service

Orquestracao de chat com LLM para o Assistente IA (chat socket + MCP tools).
Multi-provider (OpenAI, Claude, e compativeis via base URL). Config vem do
documento Setting (`AI_LLM_PROVIDER`, `LLM_*`, `OPENAI_*`).

## Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `run-chat-completion.ts` | `runChatCompletion(params)` — loop principal do chat: monta mensagens, chama o provider, despacha tool-calls (MCP) e itera ate a resposta final |
| `create-llm-provider.ts` | `createLlmChatProvider(config)` — fabrica o adapter do provider ativo (ver `providers/`) |
| `providers/` | Adapters concretos por provider — ver `providers/CLAUDE.md` |
| `mcp-tool-executor.ts` | `executeMcpTool(params)` — executa uma tool descoberta no MCP server e devolve o resultado ao loop |
| `llm-chat.types.ts` | Tipos compartilhados (mensagens, tool-calls, provider interface) |
| `llm-defaults.ts` | Defaults de modelo/parametros por provider |
| `ai-setting-fields.ts` | `resolveLlmConfig(setting)`, `projectAiSettingsFields(setting)` (subset seguro exposto), `prepareAiSettingsForSave(payload)` |

## Comportamento Chave

- Provider resolvido em runtime a partir do Setting (sem depender de env).
- Descobre tools do MCP server dinamicamente e converte para o formato do
  provider; o loop executa tool-calls via `executeMcpTool` e realimenta o modelo.
- `ai-setting-fields` isola quais campos de IA sao expostos/salvos (nunca vaza
  chave de API na leitura publica).

## Consumidores

`resources/chat/chat.socket.ts` (chat em tempo real) e `setting` (projecao/save
dos campos de IA).
