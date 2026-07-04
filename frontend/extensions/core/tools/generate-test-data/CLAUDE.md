# generate-test-data (tool `core`, frontend)

Entry UI da ferramenta que gera registros de teste em massa numa tabela.
`index.tsx` com `export default` — formulário com estimativa
(`POST .../estimate`), disparo (`POST /tools/generate-test-data`) e polling do
progresso (`GET .../status/:jobId`).

Ver [../../CLAUDE.md](../../CLAUDE.md) (`frontend/extensions/core/`) e
`backend/extensions/core/tools/generate-test-data/`.
