# clone-table/templates — Templates de Tabelas Pré-configuradas

Factories de estruturas de tabela para o recurso de clone com template. Permitem
criar tabelas pré-configuradas com campos e grupos prontos para uso.

## Arquivos

| Arquivo                | Template         | Estilo (`E_TABLE_STYLE`) | Campos criados                                      |
| ---------------------- | ---------------- | ------------------------ | --------------------------------------------------- |
| `calendar-template.ts` | Calendário       | CALENDAR                 | Título, datas início/fim, participantes, descrição  |
| `cards-template.ts`    | Cards            | CARD                     | Título, descrição, status, imagem                   |
| `document-template.ts` | Documento        | DOCUMENT                 | Título, corpo (rich text), categoria                |
| `forum-template.ts`    | Fórum            | FORUM                    | Título, corpo, autor, reações, avaliações           |
| `kanban-template.ts`   | Kanban           | KANBAN                   | Título, status (dropdown), responsável, prioridade  |
| `mosaic-template.ts`   | Mosaico          | MOSAIC                   | Título, imagem, descrição curta                     |
| `media-helpers.ts`     | —                | —                        | Helper para campos de mídia (título, descrição, imagem) |
| `table-template.service.ts` | — | — | Esqueleto compartilhado: cria os nativos, monta o `_schema`, ordena e grava a tabela |

## Padrões

- Cada arquivo exporta um **descritor** (`TableTemplateDescriptor`): `description`,
  `style`, `beforeSave` e o `buildFields()` próprio. O que era idêntico nos seis
  (criar nativos → `schemaBuilder.build` → montar `TableCreatePayload` → gravar)
  vive uma vez só em `TableTemplateContractService.create()`
- Templates que precisam de um registro inicial (o fórum cria o canal
  "Bem-vindos") declaram `seed()` no descritor
- `buildXFields()` continua exportada — é o que muda de verdade de um template
  para outro
- O use-case resolve o template por lookup (`findById`), não por cadeia de `if`
- Usa factories de campos dos field-types para criar campos com configurações padrão
- Os IDs gerados são rastreados para remapeamento após clonagem
- `media-helpers.ts` é importado por templates que incluem campo de imagem/mídia
- Templates são selecionados pelo usuário na UI de "Nova Tabela → Usar Modelo"
