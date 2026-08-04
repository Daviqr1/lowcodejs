import { Service } from 'fastify-decorators';

import type {
  LlmChatCompletionResult,
  LlmChatMessage,
  LlmChatProvider,
  LlmChatTool,
} from '../llm-chat.types';

import type { OpenAiCompatConfig } from './openai-compat-provider-contract.service';
import { OpenAiCompatProviderContractService } from './openai-compat-provider-contract.service';

async function postChatCompletions(
  config: OpenAiCompatConfig,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = config.baseUrl.replace(/\/$/, '');
  const url = `${base}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
    ...config.extraHeaders,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inválida da API: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    let msg = text.slice(0, 300) || response.statusText;
    const err = data.error;
    if (
      err &&
      typeof err === 'object' &&
      'message' in err &&
      typeof err.message === 'string'
    ) {
      msg = err.message;
    }
    throw new Error(`API retornou ${response.status}: ${msg}`);
  }

  return data;
}

function parseOpenAiResponse(
  data: Record<string, unknown>,
): LlmChatCompletionResult {
  const choices = data.choices;
  if (!Array.isArray(choices) || !choices[0]) {
    throw new Error('Resposta da API sem choices');
  }
  const choice = choices[0];

  const msg = choice.message;
  if (!msg || msg.role !== 'assistant') {
    throw new Error('Resposta inesperada: role não é assistant');
  }

  let finish = 'stop';
  if (choice.finish_reason) finish = String(choice.finish_reason);
  const toolCallsRaw = msg.tool_calls;

  const assistantMessage: LlmChatMessage = {
    role: 'assistant',
    content: msg.content ?? null,
  };

  if (Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0) {
    assistantMessage.tool_calls = toolCallsRaw.map((tc) => {
      const fn = tc.function;
      return {
        id: String(tc.id ?? ''),
        type: 'function' as const,
        function: {
          name: String(fn.name ?? ''),
          arguments: String(fn.arguments ?? '{}'),
        },
      };
    });
    return { message: assistantMessage, finishReason: 'tool_calls' };
  }

  let finishReason: 'tool_calls' | 'stop' = 'stop';
  if (finish === 'tool_calls') finishReason = 'tool_calls';
  return { message: assistantMessage, finishReason };
}

@Service()
export default class OpenAiCompatProviderService implements OpenAiCompatProviderContractService {
  create(config: OpenAiCompatConfig): LlmChatProvider {
    return {
      async complete(params: {
        messages: Array<LlmChatMessage>;
        tools?: Array<LlmChatTool>;
      }): Promise<LlmChatCompletionResult> {
        const body: Record<string, unknown> = {
          model: config.model,
          messages: params.messages,
        };
        if (params.tools && params.tools.length > 0) {
          body.tools = params.tools;
        }

        const data = await postChatCompletions(config, body);
        return parseOpenAiResponse(data);
      },
    };
  }
}
