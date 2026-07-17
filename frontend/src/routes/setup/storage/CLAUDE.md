# setup/storage — Armazenamento (etapa 3)

Define onde os arquivos da plataforma são gravados: filesystem local (padrão) ou
S3-compatível. Grava `STORAGE_*` no documento Setting; no boot o backend
sincroniza esses campos para `process.env` via `syncStorageEnv()`.

## Arquivos

| Arquivo          | Tipo       | Descrição                                                 |
| ---------------- | ---------- | --------------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Armazenamento"                 |
| `index.lazy.tsx` | Componente | Toggle S3 + campos condicionais + `useSetupSubmitStorage` |

## Lógica

- `Switch` controla `driver` (`'local'` | `'s3'`). `isS3 = driver === 's3'`.
- Quando **S3 ativo**, exibe bloco condicional com: Endpoint, Região (default
  `us-east-1`), Bucket, Access Key, Secret Key. Access/Secret têm toggle de
  visibilidade (password ↔ text).
- **Validação client-side** antes do submit: com S3 ligado, `endpoint`,
  `bucket`, `accessKey` e `secretKey` são obrigatórios — senão `toast.error` e
  aborta. Região cai para `us-east-1` se vazia.

## Payload

```ts
{
  STORAGE_DRIVER: driver,
  ...(isS3 && {
    STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_BUCKET,
    STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY,
  }),
}
```

Os campos S3 só vão no payload quando `isS3` — em modo local apenas
`STORAGE_DRIVER` é enviado.

## Navegação

`useSetupSubmitStorage` faz `POST /setup/storage`. No sucesso segue o padrão do
wizard (`completed → '/'`, senão `→ /setup/${data.currentStep}`, normalmente
`logos`). Estado é todo local via `useState` (sem TanStack Form aqui).

## Gotchas

- Este passo precisa rodar **antes** de `logos` (etapa 4): os logos são enviados
  ao storage recém-configurado. Por isso o gating do wizard impede acessar
  `logos` antes de concluir `storage`.
