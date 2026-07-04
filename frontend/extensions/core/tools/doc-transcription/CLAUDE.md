# doc-transcription (tool `core`, frontend)

Entry UI da ferramenta de transcrição de documentos (CNH, comprovante, etc.)
via API externa configurável. Tabs de config (URL da API + tipos de documento)
e de transcrição. `index.tsx` com `export default` + subcomponentes
(`-config-tab`, `-transcription-tab`, `-document-type-form`, `-fill-button`).

Endpoints backend: `GET`/`PATCH /tools/doc-transcription/config`, `POST
/tools/doc-transcription/transcribe`. Ver [../../CLAUDE.md](../../CLAUDE.md) e
`backend/extensions/core/tools/doc-transcription/`.
