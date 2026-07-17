# Generate Test Data (extensão `core/tools/generate-test-data`)

Tool que gera registros fictícios em massa numa tabela, para testar listagem,
paginação e performance. Originalmente um recurso fora do padrão; portada para
extensão TOOL usando os serviços atuais do core.

## Endpoints
- `POST /tools/generate-test-data/estimate` | Auth: Yes | calcula a estimativa (não gera nada)
- `POST /tools/generate-test-data` | Auth: Yes | inicia job assíncrono (202 + `jobId`)
- `GET /tools/generate-test-data/status/:jobId` | Auth: Yes | progresso do job

Todos protegidos por `ExtensionActiveMiddleware` (pkg=core, type=TOOL,
id=generate-test-data).

## Fluxo
1. (Opcional, recomendado) `POST .../estimate` retorna `{ rowBytes,
   realTargetQuantity, simulatedQuantity, estimatedRealBytes(+Human), cappedBy,
   willSimulate, warnings[] }` — o frontend mostra isso e pede confirmação antes
   de gerar muita coisa
2. `POST` valida `{ tableId, quantity }` (Zod, 1 a 10 trilhões)
3. Use-case confere a tabela (`TABLE_NOT_FOUND` se não existir), cria um job em
   memória (`GenerationJobRegistry`, singleton) e dispara a geração em background
   (não bloqueia a request)
4. A geração monta o model dinâmico via `ModelBuilderContractService.build(table)`
   e insere em lotes de 1.000 com `insertMany`, cedendo o event loop entre lotes
   via `setImmediate` (sem delay fixo)
5. O frontend faz polling do `GET .../status/:jobId` (700ms) até `completed`/`failed`

## Regras
- **Teto físico por orçamento de bytes** (`generate-test-data.estimate.ts`): o
  número de registros realmente inseridos = `min(quantidade, HARD_REAL_CAP=1M,
  orçamento_bytes / bytes_por_linha)`. Acima do teto, insere o máximo real e
  **simula** o progresso até a quantidade pedida. `bytes_por_linha` é estimado
  pelos tipos/formatos dos campos. Orçamento default ~1 GiB, sobrescrevível por
  env `GENERATE_TEST_DATA_MAX_BYTES`. (Antes: 10.000 hardcoded.)
- **Relacionamentos**: gera registros no primeiro campo `RELATIONSHIP` (20x menos,
  máx 500 reais) e vincula os registros da tabela alvo a eles
- Mock por tipo de campo: TEXT_SHORT (respeita format EMAIL/URL/CPF/CNPJ/…),
  TEXT_LONG, DATE, DROPDOWN, RELATIONSHIP, USER, FILE, FIELD_GROUP
- Job é **em memória** (perde-se no restart) — aceitável para tool de dev

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela alvo inexistente (gerar ou estimar) |
| 404 | JOB_NOT_FOUND | jobId inexistente no status |
| 500 | GENERATE_TEST_DATA_ERROR | Erro interno ao iniciar/estimar |

## Testes
- Unit: `generate-test-data.use-case.spec.ts` (TABLE_NOT_FOUND, ciclo do job,
  `estimate` + helpers de `generate-test-data.estimate.ts` com
  `ModelBuilderContractService` mockado)
