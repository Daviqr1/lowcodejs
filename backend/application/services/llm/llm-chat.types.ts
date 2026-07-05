/* eslint-disable no-unused-vars */
/** Formato interno alinhado ao Chat Completions (OpenAI). */
export type LlmChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type LlmChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | Array<LlmChatContentPart> }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<LlmToolCall>;
    }
  | { role: 'tool'; tool_call_id: string; content: string };

export type LlmChatTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmChatCompletionResult = {
  message: LlmChatMessage;
  finishReason: 'stop' | 'tool_calls' | 'error';
};

export type LlmChatProvider = {
  complete(params: {
    messages: Array<LlmChatMessage>;
    tools?: Array<LlmChatTool>;
  }): Promise<LlmChatCompletionResult>;
}
