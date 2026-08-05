import 'reflect-metadata';

import AjvCompiler, { type BuildCompilerFromPool } from '@fastify/ajv-compiler';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import scalar from '@scalar/fastify-api-reference';
import ajv from 'ajv-errors';
import fastify from 'fastify';
import { bootstrap, getInstanceByToken } from 'fastify-decorators';
import type { Server } from 'node:http';

import { loadControllers } from '@application/core/controllers';
import { registerDependencies } from '@application/core/di-registry';
import { ErrorHandlerContractService } from '@application/services/error-handler/error-handler-contract.service';
import ErrorHandlerService from '@application/services/error-handler/error-handler.service';
import { ACCESS_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { ContentDispositionHookContractService } from '@hooks/content-disposition-hook-contract.service';
import ContentDispositionHookService from '@hooks/content-disposition-hook.service';
import { ErrorLogHookContractService } from '@hooks/error-log-hook-contract.service';
import ErrorLogHookService from '@hooks/error-log-hook.service';
import { LoadExtensionsHookContractService } from '@hooks/load-extensions-hook-contract.service';
import LoadExtensionsHookService from '@hooks/load-extensions-hook.service';
import { LoggerHookContractService } from '@hooks/logger-hook-contract.service';
import LoggerHookService from '@hooks/logger-hook.service';
import { Env } from '@start/env';

function matchOrigin(origin: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    try {
      const url = new URL(origin);
      return url.hostname.endsWith(suffix) && url.hostname !== suffix.slice(1);
    } catch {
      return false;
    }
  }
  return origin === pattern;
}

function registerAjvErrors(
  instance: Parameters<typeof ajv>[0],
): ReturnType<typeof ajv> {
  return ajv(instance);
}

const AJV_OPTIONS = {
  customOptions: {
    allErrors: true, // Retorna todos os erros, não só o primeiro
  },
  plugins: [registerAjvErrors],
};

/**
 * O Fastify entrega ao compilador a definicao da rota, nao o schema cru — e o
 * `httpPart` dela e o que separa o que chega tipado do que chega como texto.
 * O tipo publico do `@fastify/ajv-compiler` declara so `AnySchema`, entao a
 * checagem e feita na mao.
 */
function isBodyPart(definition: object | boolean): boolean {
  if (typeof definition !== 'object') return false;
  if (!('httpPart' in definition)) return false;
  return definition.httpPart === 'body';
}

/**
 * Dois compiladores, um por natureza da entrada.
 *
 * `querystring`, `params` e `headers` chegam sempre como texto: sem coercao,
 * `?page=2` nunca casaria com `z.number()`. Ja o **body e JSON** — o tipo vem no
 * proprio dado, e coagir ali so destroi informacao. Como os schemas de rota
 * passaram a ser derivados do Zod (`zodToRouteSchema`), `.nullable()` virou
 * `anyOf: [{type:'X'},{type:'null'}]`: o AJV casa o primeiro ramo coagindo
 * `null` para `""`/`0`, e `coerceTypes: 'array'` ainda desembrulha `["a"]` em
 * `"a"` para casar uniao com ramo escalar. O `null` de um campo que e ObjectId
 * no Mongoose chegava como `""` e estourava CastError -> 500.
 *
 * O `.parse()` Zod do controller ja recusaria o valor nao coagido, entao
 * desligar a coercao no body alinha as duas camadas em vez de afrouxar alguma.
 */
const buildValidatorCompiler: BuildCompilerFromPool = (externalSchemas) => {
  const compilerFromPool = AjvCompiler();

  const compileRest = compilerFromPool(externalSchemas, AJV_OPTIONS);
  const compileBody = compilerFromPool(externalSchemas, {
    ...AJV_OPTIONS,
    customOptions: { ...AJV_OPTIONS.customOptions, coerceTypes: false },
  });

  return (definition, meta) => {
    if (isBodyPart(definition)) return compileBody(definition, meta);
    return compileRest(definition, meta);
  };
};

const kernel = fastify<Server>({
  logger: false,
  ajv: AJV_OPTIONS,
  schemaController: {
    compilersFactory: { buildValidator: buildValidatorCompiler },
  },
});

kernel.register(cors, {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);

    // Origens fixas (sempre permitidas, não configuráveis)
    const fixedOrigins = [Env.APP_CLIENT_URL, Env.APP_SERVER_URL];
    if (fixedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Origens configuráveis via env var (ALLOWED_ORIGINS)
    const matched = Env.ALLOWED_ORIGINS.some((pattern) =>
      matchOrigin(origin, pattern),
    );
    if (matched) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Timezone',
    'X-Skip-Log',
    'X-Auth-Account-Id',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  preflight: true,
});

kernel.register(cookie, {
  secret: Env.COOKIE_SECRET,
});

const expiresIn = 60 * 60 * 24 * 1; // 1 day

kernel.register(jwt, {
  secret: {
    private: Buffer.from(Env.JWT_PRIVATE_KEY, 'base64'),
    public: Buffer.from(Env.JWT_PUBLIC_KEY, 'base64'),
  },
  sign: { expiresIn: expiresIn, algorithm: 'RS256' },
  verify: { algorithms: ['RS256'] },
  cookie: {
    signed: false,
    cookieName: ACCESS_TOKEN_COOKIE,
  },
});

// Teto rígido do parser de upload (proteção do servidor). O limite real por
// upload é o FILE_UPLOAD_MAX_SIZE do Setting, aplicado por requisição no
// controller de upload (upload.controller.ts). Este valor só precisa ser >= ao
// maior limite configurável. O antigo teto de 5MB rejeitava qualquer arquivo
// grande antes mesmo de o Setting ser consultado.
const UPLOAD_HARD_CEILING = 200 * 1024 * 1024; // 200mb
kernel.register(multipart, {
  limits: {
    fileSize: UPLOAD_HARD_CEILING,
  },
});

kernel.register(swagger, {
  openapi: {
    info: {
      title: 'LowCodeJs API',
      version: '1.0.0',
      description: 'LowCodeJs API with JWT cookie-based authentication',
    },
    servers: [
      {
        url: Env.APP_SERVER_URL,
        description: 'Base URL',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
    },
  },
});

kernel.register(scalar, {
  routePrefix: '/documentation',
  configuration: {
    title: 'LowCodeJs API',
    theme: 'default',
  },
});

kernel.register(websocket);

await registerDependencies();

// Hooks e error handler resolvidos do container — precisa ser depois do
// `registerDependencies()` acima.
const contentDispositionHook =
  getInstanceByToken<ContentDispositionHookContractService>(
    ContentDispositionHookService,
  );
kernel.addHook('onRequest', (request, response) =>
  contentDispositionHook.handle(request, response),
);

const loggerHook =
  getInstanceByToken<LoggerHookContractService>(LoggerHookService);
kernel.addHook('onResponse', (request, response) =>
  loggerHook.handle(request, response),
);

// Registra no "Histórico de erros" respostas de erro (>= 400, exceto 401) de
// usuários autenticados (best-effort).
const errorLogHook =
  getInstanceByToken<ErrorLogHookContractService>(ErrorLogHookService);
kernel.addHook('onSend', (request, response, payload) =>
  errorLogHook.handle(request, response, payload),
);

const errorHandler =
  getInstanceByToken<ErrorHandlerContractService>(ErrorHandlerService);
kernel.setErrorHandler((error, request, response) =>
  errorHandler.handle(error, request, response),
);

kernel.register(bootstrap, {
  controllers: [...(await loadControllers())],
});

// Carrega o registry de extensões assim que o kernel está pronto. Roda tanto
// no boot do servidor (bin/server.ts) quanto nos testes E2E (que dão
// kernel.ready() na suíte). Falha de scan é não-fatal — apenas loga.
const loadExtensionsHook =
  getInstanceByToken<LoadExtensionsHookContractService>(
    LoadExtensionsHookService,
  );
kernel.addHook('onReady', () => loadExtensionsHook.handle());

kernel.get('/openapi.json', async function () {
  return kernel.swagger();
});

export { kernel };
