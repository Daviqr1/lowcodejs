import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Socket } from 'socket.io';

import {
  E_CHAT_EVENT,
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
} from '@application/core/entity.core';
import { Logger } from '@application/model/logger.model';

export async function executeMcpTool(params: {
  mcpClient: Client;
  toolName: string;
  toolArgs: Record<string, unknown>;
  socket: Socket;
  userId: string;
}): Promise<string> {
  const { mcpClient, toolName, toolArgs, socket, userId } = params;

  socket.emit(E_CHAT_EVENT.TOOL_CALL, { name: toolName, args: toolArgs });

  console.log('[MCP Log] tool_call:', toolName, toolArgs);
  Logger.create({
    url: `mcp://${toolName}`,
    user: userId,
    action: E_LOGGER_ACTION_TYPE.AI_CALL,
    object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
    object_id: toolName,
    content: toolArgs,
  }).catch((err: unknown) => console.error('[MCP Log] create error:', err));

  try {
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    let contentStr = '';
    if (result.content && Array.isArray(result.content)) {
      for (const content of result.content) {
        if (content.type === 'text') {
          contentStr += content.text || '';
        } else {
          contentStr += `[${content.type}]`;
        }
      }
    } else {
      contentStr = String(result);
    }

    let preview = contentStr;
    if (contentStr.length > 150) preview = contentStr.slice(0, 150) + '...';

    socket.emit(E_CHAT_EVENT.TOOL_RESULT, { name: toolName, preview });

    console.log('[MCP Log] tool_result:', toolName, '|', preview);
    Logger.create({
      url: `mcp://${toolName}/result`,
      user: userId,
      action: E_LOGGER_ACTION_TYPE.AI_RESPONSE,
      object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
      object_id: toolName,
      content: { preview, length: contentStr.length },
    }).catch((err: unknown) => console.error('[MCP Log] create error:', err));

    return contentStr;
  } catch (err) {
    let errorMsg = String(err);
    if (err instanceof Error) errorMsg = err.message;

    socket.emit(E_CHAT_EVENT.TOOL_ERROR, {
      name: toolName,
      message: errorMsg,
    });

    console.error('[MCP Log] tool_error:', toolName, errorMsg);
    Logger.create({
      url: `mcp://${toolName}/error`,
      user: userId,
      action: E_LOGGER_ACTION_TYPE.AI_RESPONSE,
      object: E_LOGGER_OBJECT_TYPE.AI_TOOL,
      object_id: toolName,
      content: { error: errorMsg },
    }).catch((logErr: unknown) =>
      console.error('[MCP Log] create error:', logErr),
    );

    return errorMsg;
  }
}
