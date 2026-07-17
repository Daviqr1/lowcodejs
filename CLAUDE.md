# LowCodeJS

Plataforma low-code para criacao de aplicacoes com tabelas dinamicas, formularios, dashboards e automacoes.

## Estrutura do Monorepo

```
lowcodejs/
├── backend/              # API Fastify + TypeScript + MongoDB
│   └── CLAUDE.md         # Arquitetura detalhada do backend
├── frontend/             # React + TanStack Start (SSR)
│   └── CLAUDE.md         # Arquitetura detalhada do frontend
├── _docs/                # Documentacao de negocio e testes
├── eslint-local-rules/   # Plugin ESLint local (regras 5 e 6 do code-pattern)
├── .github/workflows/    # CI/CD (build, test, push :latest no Docker Hub)
├── docker-compose.yml              # Desenvolvimento (core + profiles opcionais)
├── docker-compose.oficial.yml      # Self-host minimo via imagens :latest
├── install.md            # Guia de instalacao
├── setup.sh              # Script de configuracao inicial
└── credential-generator.sh         # Gera JWT keys e cookie secret
```

## Servicos

### Core (sempre sobem)

| Servico   | Tecnologia       | Porta | Descricao                    |
| --------- | ---------------- | ----- | ---------------------------- |
| mongo     | MongoDB          | 27017 | Banco de dados               |
| redis     | Redis 7 Alpine   | 6379  | Cache                        |
| api       | Fastify/Node 22  | 3000  | Backend REST + WebSocket     |
| app       | React/Nitro      | 5173  | Frontend SSR                 |

### Opcionais (via Docker Compose profiles)

| Servico | Profile | Tecnologia   | Porta      | Descricao                      |
| ------- | ------- | ------------ | ---------- | ------------------------------ |
| mcp     | `ai`    | MCP Server   | 3001       | Assistente IA (Chat + OpenAI)  |

```bash
# Core apenas
docker compose up -d

# Com Assistente IA
docker compose --profile ai up -d
```

## Configuracao via Settings UI

O usuario MASTER pode configurar pela interface (menu Configuracoes):

- **Armazenamento S3**: toggle ativar/desativar + endpoint, regiao, bucket, credenciais (usuario configura seu proprio S3 externo)
- **Assistente IA**: toggle ativar/desativar + chave OpenAI

Quando S3 desativado: storage usa filesystem local (`_storage/`). Quando IA desativada: chat fica indisponivel.

## Deploy (CI/CD)

- **GitHub Actions (`main` branch)**: roda testes, builda e publica
  `marcosjhollyfer/lowcodejs-api:latest` e `marcosjhollyfer/lowcodejs-app:latest`
  no Docker Hub. Essas imagens alimentam o `docker-compose.oficial.yml`
  para quem faz self-host sem Coolify.
- **Coolify**: observa as branches `main` e `develop` e faz build/deploy
  automatico a partir de `backend/Dockerfile-coolify` e
  `frontend/Dockerfile-coolify`. Variaveis de ambiente sao configuradas
  pelo painel do Coolify (build args do frontend:
  `VITE_API_BASE_URL`, `APP_SERVER_URL`, `APP_CLIENT_URL`).
  Logos, branding, locale, storage, SMTP e IA vivem no documento Setting
  do MongoDB e sao editados via UI `/settings`.

## Comandos Essenciais

```bash
# Setup inicial
./setup.sh

# Desenvolvimento
docker compose up -d
docker exec -it low-code-js-api npm run seed

# Backend local
cd backend && npm install && npm run dev

# Frontend local
cd frontend && npm install && npm run dev

# Testes backend
cd backend && npm run test        # todos
cd backend && npm run test:unit   # unitarios
cd backend && npm run test:e2e    # e2e (MongoDB real)

# Gerar boilerplate de extensao (plugin/module/tool) — backend + frontend
npm run make:extension                                   # interativo
npm run make:extension -- --type plugin --id hello-table # via flags
```

## Arquitetura

- **Backend**: Fastify 5 + fastify-decorators (DI) + Mongoose + Zod + Either pattern
- **Frontend**: React 19 + TanStack (Router, Query, Form, Table, Start) + Radix UI + Tailwind CSS 4
- **Auth**: JWT RS256 com cookies httpOnly
- **RBAC**: 4 roles (MASTER > ADMINISTRATOR > MANAGER > REGISTERED)
- **Storage**: Flydrive (local filesystem ou S3-compativel)
- **Tabelas dinamicas**: Schema MongoDB gerado em runtime via campos configurados no low-code

Consulte `backend/CLAUDE.md` e `frontend/CLAUDE.md` para documentacao detalhada de cada camada.
