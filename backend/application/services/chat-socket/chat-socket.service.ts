/**
 * Socket.IO handler para o chat com IA.
 * - Uma sessão MCP persistente por conexão
 * - Provedor LLM configurável (OpenAI, Gemini, Claude, OpenRouter, Ollama)
 * - Protocolo de eventos: status, ready, thinking, tool_call, tool_result, tool_error, message, error
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Service } from 'fastify-decorators';
import * as http from 'node:http';
import type { Server as HttpServer } from 'node:http';
import * as https from 'node:https';
import { Server as SocketIOServer } from 'socket.io';

import {
  E_AREA_CAPABILITY,
  E_CHAT_EVENT,
  E_JWT_TYPE,
  type Merge,
} from '@application/core/entity.core';
import { Setting } from '@application/model/setting.model';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { LlmChatContractService } from '@application/services/llm/llm-chat-contract.service';
import type { FileData } from '@application/services/llm/llm-chat.types';
import type { LlmChatMessage } from '@application/services/llm/llm-chat.types';
import { LlmConfigContractService } from '@application/services/llm/llm-config-contract.service';
import {
  ACCESS_TOKEN_COOKIE,
  SessionContractService,
} from '@application/services/session/session-contract.service';
import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { Env } from '@start/env';

import { ChatSocketContractService } from './chat-socket-contract.service';

type ClientMessage = {
  message?: string;
  file?: FileData;
};

class NodeHttpTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private readonly url: URL;
  private readonly headers: Record<string, string>;

  constructor(url: URL, headers: Record<string, string> = {}) {
    this.url = url;
    this.headers = headers;
  }

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    const isNotification = !('id' in message);
    if (isNotification) {
      this.post(message).catch((err: unknown) => {
        let error = new Error(String(err));
        if (err instanceof Error) error = err;
        this.onerror?.(error);
      });
      return;
    }
    const response = await this.post(message);
    if (response !== null && this.onmessage) {
      this.onmessage(response);
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  private post(
    body: object,
    timeoutMs = 15000,
  ): Promise<JSONRPCMessage | null> {
    return new Promise((resolve, reject) => {
      let mod: typeof http | typeof https = http;
      if (this.url.protocol === 'https:') mod = https;
      const data = JSON.stringify(body);
      let defaultPort = '80';
      if (this.url.protocol === 'https:') defaultPort = '443';
      const port = this.url.port || defaultPort;

      const req = mod.request(
        {
          hostname: this.url.hostname,
          port,
          path: this.url.pathname + this.url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            Accept: 'application/json, text/event-stream',
            ...this.headers,
          },
        },
        (res) => {
          const ct = res.headers['content-type'] ?? '';

          if (ct.includes('text/event-stream')) {
            let buf = '';
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
              buf += chunk;
              const lines = buf.split('\n');
              buf = lines.pop() ?? '';
              let eventData = '';
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  eventData += line.slice(6);
                } else if (line.trim() === '' && eventData) {
                  try {
                    const msg: JSONRPCMessage = JSON.parse(eventData);
                    this.onmessage?.(msg);
                  } catch {
                    /* ignore */
                  }
                  eventData = '';
                }
              }
            });
            res.on('end', () => resolve(null));
            return;
          }

          let chunks = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            chunks += chunk;
          });
          res.on('end', () => {
            if (!chunks) {
              resolve(null);
              return;
            }
            try {
              const parsed: JSONRPCMessage = JSON.parse(chunks);
              resolve(parsed);
            } catch {
              reject(
                new Error(`Resposta inválida do MCP: ${chunks.slice(0, 200)}`),
              );
            }
          });
        },
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`MCP request timeout (${timeoutMs}ms)`));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

@Service()
export default class ChatSocketService implements ChatSocketContractService {
  private getErrorMessage(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const errWithCause: Merge<Error, { cause?: unknown }> = err;
    const cause = errWithCause.cause;
    let causeMsg = '';
    if (cause instanceof Error) causeMsg = ` — causa: ${cause.message}`;
    return err.message + causeMsg;
  }

  private formatChatUserError(err: unknown): string {
    const raw = this.getErrorMessage(err).toLowerCase();

    if (
      raw.includes('429') ||
      raw.includes('quota') ||
      raw.includes('rate limit')
    ) {
      return 'Cota ou limite de requisições da API do provedor LLM esgotado. Aguarde alguns minutos, verifique o billing do provedor ou troque o provedor/modelo em Configurações → Assistente IA.';
    }

    if (
      raw.includes('401') ||
      raw.includes('403') ||
      raw.includes('invalid api key') ||
      raw.includes('incorrect api key') ||
      raw.includes('authentication')
    ) {
      return 'Chave da API inválida ou sem permissão. Verifique a chave em Configurações → Assistente IA.';
    }

    if (
      raw.includes('timeout') ||
      raw.includes('econnrefused') ||
      raw.includes('fetch failed')
    ) {
      return 'Não foi possível conectar ao provedor LLM. Verifique URL, rede e se o serviço (ex.: Ollama) está rodando.';
    }

    const full = this.getErrorMessage(err);
    if (full.length > 400) return `${full.slice(0, 400)}…`;
    return full;
  }

  private async connectMcpClient(
    mcpUrl: string,
    mcpAuthToken: string | null,
    mcpLowcodeApiUrl: string | null,
    accessToken: string,
  ): Promise<{
    client: Client;
    tools: Awaited<ReturnType<Client['listTools']>>['tools'];
  }> {
    const headers: Record<string, string> = {
      'X-Access-Token': accessToken,
    };
    if (mcpAuthToken) {
      headers['Authorization'] = `Bearer ${mcpAuthToken}`;
    }

    const lowcodeApiUrl =
      mcpLowcodeApiUrl?.trim().replace(/\/$/, '') ||
      Env.APP_SERVER_URL.replace(/\/$/, '');
    headers['X-Lowcode-Api-Url'] = lowcodeApiUrl;

    const transport = new NodeHttpTransport(new URL(mcpUrl), headers);
    const client = new Client({ name: 'lowcodejs-chat', version: '1.0.0' });
    await client.connect(transport);
    const { tools } = await client.listTools();
    return { client, tools };
  }
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly session: SessionContractService,
    private readonly llmConfig: LlmConfigContractService,
    private readonly llmChat: LlmChatContractService,
  ) {}

  init(httpServer: HttpServer, decode: JwtDecoder): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
      path: '/socket.io',
      cors: {
        origin: [
          Env.APP_CLIENT_URL,
          Env.APP_SERVER_URL,
          ...Env.ALLOWED_ORIGINS,
        ],
        credentials: true,
      },
    });

    io.on('connection', async (socket) => {
      const cookieHeader = socket.handshake.headers.cookie;
      const accessToken = this.session.extractLastCookieValue(
        cookieHeader,
        ACCESS_TOKEN_COOKIE,
      );

      if (!accessToken) {
        socket.emit(E_CHAT_EVENT.ERROR, {
          message: 'Autenticação necessária.',
        });
        socket.disconnect();
        return;
      }

      const decoded = decode(accessToken);
      if (!decoded || decoded.type !== E_JWT_TYPE.ACCESS) {
        socket.emit(E_CHAT_EVENT.ERROR, {
          message: 'Token inválido ou expirado.',
        });
        socket.disconnect();
        return;
      }

      const user = decoded;

      // Capacidade de chat por grupo (MASTER bypassa). Privilegio MASTER resolvido
      // pelo fecho de grupos (nao pelo role do JWT). Mantem o chat indisponivel
      // para grupos sem a permissao, alem do toggle global AI_ASSISTANT_ENABLED.
      const fullUser = await this.userRepository.findById(user.sub);

      if (!(await this.groupResolver.isMaster(fullUser))) {
        const capabilities =
          await this.groupResolver.resolveCapabilities(fullUser);

        if (!capabilities.has(E_AREA_CAPABILITY.MANAGE_CHAT)) {
          socket.emit(E_CHAT_EVENT.ERROR, {
            message: 'Você não tem permissão para usar o assistente de IA.',
          });
          socket.disconnect();
          return;
        }
      }

      const setting = await Setting.findOne().lean();
      const aiEnabled = Boolean(setting?.AI_ASSISTANT_ENABLED);
      const mcpUrl = setting?.MCP_SERVER_URL ?? null;
      const mcpAuthToken = setting?.MCP_SERVER_TOKEN ?? null;
      const mcpLowcodeApiUrl = setting?.MCP_LOWCODE_API_URL ?? null;
      let llmConfig = this.llmConfig.resolve(setting);

      if (!aiEnabled || !mcpUrl || !llmConfig.isConfigured) {
        socket.emit(E_CHAT_EVENT.ERROR, {
          message: 'Assistente IA não está habilitado ou não está configurado.',
        });
        socket.disconnect();
        return;
      }

      let mcpClient: Client | null = null;

      try {
        socket.emit(E_CHAT_EVENT.STATUS, {
          message: 'Conectando ao servidor MCP...',
        });

        const { client, tools: mcpTools } = await this.connectMcpClient(
          mcpUrl,
          mcpAuthToken,
          mcpLowcodeApiUrl,
          accessToken,
        );
        mcpClient = client;

        const messages: Array<LlmChatMessage> = [
          {
            role: 'system',
            content: this.systemPrompt(
              user.email.split('@')[0],
              user.email,
              llmConfig.provider,
              llmConfig.model,
            ),
          },
        ];

        socket.on(
          E_CHAT_EVENT.HISTORY,
          (data: {
            messages: Array<{ role: 'user' | 'assistant'; content: string }>;
          }) => {
            if (!Array.isArray(data?.messages)) return;
            for (const msg of data.messages) {
              if (
                (msg.role === 'user' || msg.role === 'assistant') &&
                typeof msg.content === 'string'
              ) {
                messages.push({ role: msg.role, content: msg.content });
              }
            }
          },
        );

        socket.emit(E_CHAT_EVENT.READY, {
          message: 'Agente pronto! Você pode enviar mensagens.',
          tools_count: mcpTools.length,
          llm_provider: llmConfig.provider,
          llm_provider_label: this.llmConfig.providerLabel(llmConfig.provider),
          llm_model: llmConfig.model,
        });

        socket.on(E_CHAT_EVENT.MESSAGE, async (data: ClientMessage) => {
          try {
            const latestSetting = await Setting.findOne().lean();
            llmConfig = this.llmConfig.resolve(latestSetting);

            const systemPrompt = this.systemPrompt(
              user.email.split('@')[0],
              user.email,
              llmConfig.provider,
              llmConfig.model,
            );
            if (messages[0]?.role === 'system') {
              messages[0] = { role: 'system', content: systemPrompt };
            }

            socket.emit(E_CHAT_EVENT.LLM_INFO, {
              llm_provider: llmConfig.provider,
              llm_provider_label: this.llmConfig.providerLabel(
                llmConfig.provider,
              ),
              llm_model: llmConfig.model,
            });

            const { reply } = await this.llmChat.complete({
              llmConfig,
              messages,
              mcpClient: mcpClient!,
              mcpTools,
              socket,
              userId: user.sub,
              userInput: (data.message || '').trim(),
              file: data.file,
            });

            if (reply) {
              socket.emit(E_CHAT_EVENT.MESSAGE, { content: reply });
            }
          } catch (err) {
            console.error('Erro no processamento:', err);
            const errorMsg = this.formatChatUserError(err);
            try {
              socket.emit(E_CHAT_EVENT.MESSAGE, {
                content: `Não foi possível concluir a resposta: ${errorMsg}`,
                variant: 'system-warning',
              });
            } catch {
              /* ignore */
            }
          }
        });

        socket.on('disconnect', async () => {
          try {
            if (mcpClient) {
              await mcpClient.close();
            }
          } catch {
            /* ignore */
          }
        });
      } catch (err) {
        console.error('Erro ao inicializar chat socket:', err);
        const errorMsg = this.getErrorMessage(err);
        try {
          socket.emit(E_CHAT_EVENT.ERROR, {
            message: `Erro no servidor: ${errorMsg}`,
          });
        } catch {
          /* ignore */
        }
        try {
          if (mcpClient) {
            await mcpClient.close();
          }
        } catch {
          /* ignore */
        }
        socket.disconnect();
      }
    });

    return io;
  }

  /** Prompt de sistema do assistente, com o contexto do usuario e do modelo. */
  private systemPrompt(
    userName: string,
    userEmail: string,
    llmProvider: string,
    llmModel: string,
  ): string {
    return `You are the LowCodeJS assistant, a helpful AI that helps users interact with the LowCodeJS platform through natural language.

  LowCodeJS is an open-source low-code platform for creating databases and management applications without programming. It is built with Node.js, Fastify, React, and MongoDB.

  ## Runtime configuration
  This session uses LLM provider "${llmProvider}" with model "${llmModel}" (configured in system settings).
  When the user asks which AI model or provider is in use, answer with these exact values only. Do not guess or default to OpenAI unless the provider is openai.

  ## Your capabilities
  You can help users with:
  - Tables/Collections: list, find, create, update, delete, trash, restore tables
  - Fields/Columns: list, find, create, edit, delete, trash, restore fields, add categories
  - Rows/Records: list, find, create, update, delete records
  - Files: list files stored in FILE fields for a table
  - Profile: view and update user profile
  - Authentication: check login status

  ## Important: parameter names
  - Tables are identified by their **slug** (not an ID). Use the parameter name "slug" for tables_find, tables_update, tables_delete, tables_trash, tables_restore.
  - Fields and rows use **tableSlug** to identify which table they belong to.
  - Fields are identified by **fieldIdOrName** (for fields_edit, fields_delete) or **fieldId** (for fields_trash, fields_restore, fields_add_category).
  - Rows are identified by **rowId**.
  - When creating rows, the data object keys must be **field slugs** (e.g. "nome-completo", "cpf"), not field display names.
  - When creating or editing fields, keep **name** as the display title shown to users and **slug** as the short technical key.
  - Field **slug** must be short, semantic, lowercase, without accents, and use only letters, numbers and hyphens. Good examples: "nome-slug-campo", "busca-anterioridade". Do not create huge slugs from long field titles.

  ## Authentication
  You are already authenticated as ${userName} (${userEmail}). Do not attempt to login, logout, or create new accounts. If a tool call fails with an authentication error, inform the user that their session may have expired and they should refresh the page.

  ## Rules
  - Respond in Portuguese (Brazil)
  - Be concise and direct
  - Do not use emojis
  - When listing data, format it clearly
  - If a tool call fails, explain the error and suggest next steps
  - For destructive operations (delete), confirm with the user before proceeding
  - When creating tables or fields, confirm the details with the user first, including the field display title and the proposed technical slug`;
  }
}
