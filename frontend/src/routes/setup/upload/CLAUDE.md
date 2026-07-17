# setup/upload — Configurações de Upload (etapa 5)

Define os limites globais de upload de arquivos da plataforma, gravados no
documento Setting. Não envia arquivos — apenas configura as regras que valem
para todos os uploads futuros (inclusive nos campos FILE das tabelas).

## Arquivos

| Arquivo          | Tipo       | Descrição                                            |
| ---------------- | ---------- | ---------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Uploads"                  |
| `index.lazy.tsx` | Componente | Três campos numéricos/texto + `useSetupSubmitUpload` |

## Campos

| Estado     | Setting                            | Default            | Descrição                                |
| ---------- | ---------------------------------- | ------------------ | ---------------------------------------- |
| `maxSize`  | `FILE_UPLOAD_MAX_SIZE`             | `10485760` (10 MB) | Tamanho máximo por arquivo, em **bytes** |
| `maxFiles` | `FILE_UPLOAD_MAX_FILES_PER_UPLOAD` | `10`               | Quantidade máxima de arquivos por upload |
| `accepted` | `FILE_UPLOAD_ACCEPTED`             | `jpg;jpeg;png;pdf` | Extensões aceitas, separadas por `;`     |

## Lógica

- `formatFileSize(bytes)` converte o valor para MB/KB/bytes apenas como feedback
  visual sob o campo (`Em bytes: 10.0 MB`). O valor persistido continua em bytes
  crus.
- `maxSize` e `maxFiles` são `type="number"` convertidos com `Number(...)`.
- `accepted` é texto livre delimitado por ponto-e-vírgula.

## Navegação

`useSetupSubmitUpload` faz `POST /setup/upload`. No sucesso segue o padrão do
wizard (`completed → '/'`, senão `→ /setup/${data.currentStep}`, normalmente
`paging`). Estado todo local via `useState`.
