import type {
  LlmChatCompletionResult,
  LlmChatMessage,
  LlmChatProvider,
  LlmChatTool,
} from '../llm-chat.types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

type ClaudeConfig = {
  apiKey: string;
  model: string;
};

function toAnthropicMessages(messages: Array<LlmChatMessage>): {
  system: string | undefined;
  messages: Array<Record<string, unknown>>;
} {
  let system: string | undefined;
  const out: Array<Record<string, unknown>> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;

    if (msg.role === 'system') {
      system = msg.content;
      continue;
    }

    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        out.push({ role: 'user', content: msg.content });
      } else {
        const blocks = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          const dataUri = part.image_url.url;
          const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri);
          if (match) {
            return {
              type: 'image',
              source: {
                type: 'base64',
                media_type: match[1],
                data: match[2],
              },
            };
          }
          return { type: 'text', text: '[imagem]' };
        });
        out.push({ role: 'user', content: blocks });
      }
      continue;
    }

    if (msg.role === 'assistant') {
      const blocks: Array<Record<string, unknown>> = [];
      if (msg.content) {
        blocks.push({ type: 'text', text: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(tc.function.arguments || '{}');
          } catch {
            input = {};
          }
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input,
          });
        }
      }
      out.push({ role: 'assistant', content: blocks });
      continue;
    }

    if (msg.role === 'tool') {
      const blocks: Array<Record<string, unknown>> = [
        {
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content,
        },
      ];
      while (i + 1 < messages.length && messages[i + 1]?.role === 'tool') {
        i++;
        const next = messages[i];
        if (next && next.role === 'tool') {
          blocks.push({
            type: 'tool_result',
            tool_use_id: next.tool_call_id,
            content: next.content,
          });
        }
      }
      out.push({ role: 'user', content: blocks });
    }
  }

  return { system, messages: out };
}

function toAnthropicTools(
  tools: Array<LlmChatTool>,
): Array<Record<string, unknown>> {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

function parseClaudeResponse(
  data: Record<string, unknown>,
): LlmChatCompletionResult {
  const content = data.content;
  if (!Array.isArray(content)) {
    throw new Error('Resposta Anthropic sem content');
  }

  let text = '';
  const assistantMessage: Extract<LlmChatMessage, { role: 'assistant' }> = {
    role: 'assistant',
    content: null,
  };
  const toolCallList: NonNullable<
    Extract<LlmChatMessage, { role: 'assistant' }>['tool_calls']
  > = [];

  for (const block of content) {
    if (block.type === 'text') {
      text += String(block.text ?? '');
    }
    if (block.type === 'tool_use') {
      toolCallList.push({
        id: String(block.id ?? ''),
        type: 'function',
        function: {
          name: String(block.name ?? ''),
          arguments: JSON.stringify(block.input ?? {}),
        },
      });
    }
  }

  assistantMessage.content = text || null;
  if (toolCallList.length > 0) {
    assistantMessage.tool_calls = toolCallList;
  }

  const stopReason = data.stop_reason;
  if (stopReason === 'tool_use' && toolCallList.length > 0) {
    return { message: assistantMessage, finishReason: 'tool_calls' };
  }

  return { message: assistantMessage, finishReason: 'stop' };
}

export function createClaudeProvider(config: ClaudeConfig): LlmChatProvider {
  return {
    async complete(params: {
      messages: Array<LlmChatMessage>;
      tools?: Array<LlmChatTool>;
    }): Promise<LlmChatCompletionResult> {
      const { system, messages } = toAnthropicMessages(params.messages);

      const body: Record<string, unknown> = {
        model: config.model,
        max_tokens: 4096,
        messages,
      };
      if (system) body.system = system;
      if (params.tools && params.tools.length > 0) {
        body.tools = toAnthropicTools(params.tools);
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });

      const raw = await response.text();
      let data: Record<string, unknown> = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(
            `Resposta inválida da Anthropic: ${raw.slice(0, 200)}`,
          );
        }
      }

      if (!response.ok) {
        let errMessage = raw.slice(0, 300);
        const err = data.error;
        if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof err.message === 'string'
        ) {
          errMessage = err.message;
        }
        throw new Error(`Anthropic API ${response.status}: ${errMessage}`);
      }

      return parseClaudeResponse(data);
    },
  };
}
