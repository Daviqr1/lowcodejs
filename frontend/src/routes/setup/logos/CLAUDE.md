# setup/logos — Logos (etapa 4)

Envia os logos pequeno e grande da plataforma para o storage configurado na
etapa anterior e grava as URLs resultantes (`LOGO_SMALL_URL`, `LOGO_LARGE_URL`)
no Setting. Etapa **opcional** — pode ser refeita depois em Configurações.

## Arquivos

| Arquivo          | Tipo       | Descrição                                            |
| ---------------- | ---------- | ---------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Logos"                    |
| `index.lazy.tsx` | Componente | Dois `FileUploadWithStorage` + `useSetupSubmitLogos` |

## Lógica de Upload

Usa `FileUploadWithStorage` (`@/components/common/file-upload`), um por logo:

- `onStorageChange` recebe `Array<IStorage>`; ao concluir o upload, grava
  `storages[0].url` em `logoSmallUrl` / `logoLargeUrl`. O arquivo já é enviado
  ao storage **durante** a seleção — o submit apenas persiste as URLs no
  Setting.
- `accept="image/*"`, `maxFiles={1}`, `maxSize={4 * 1024 * 1024}` (4 MB).
- `staticName="logo-small"` / `"logo-large"`: nomes fixos no storage (sem hash),
  garantindo URL estável.
- `shouldDeleteFromStorage={false}`: trocar de arquivo não apaga o anterior do
  storage.

## Payload e Navegação

`mutation.mutate({ LOGO_SMALL_URL, LOGO_LARGE_URL })` via `useSetupSubmitLogos`
→ `POST /setup/logos`. Ambos podem ser `null` (etapa pulável sem enviar nada).
No sucesso segue o padrão do wizard (`completed → '/'`, senão
`→ /setup/${data.currentStep}`, normalmente `upload`).

## Gotchas

- Depende da etapa `storage` já concluída — o upload mira o driver
  recém-configurado. O gating do wizard garante essa ordem.
