import type mongoose from 'mongoose';

import type {
  IEmbeddedSchema,
  IField,
  IGroupConfiguration,
} from '@application/core/entity.core';

// Seam dedicado a fatia FIELD_GROUP (composicao: subdocumento embedded de nivel
// unico) dos builders de tabela. Isola a logica de grupo da de RELATIONSHIP
// (associacao via links, §2 da spec relacionamento-cardinalidade), deixando a
// separacao estrutural e cada fatia testavel isolada.
//
// Os metodos sao PUROS (sem dependencias injetadas) de proposito: o
// SchemaBuilder e folha do grafo de DI (todos dependem dele) e passa a delegar
// `buildEmbeddedSchema` a este seam; se o seam injetasse o SchemaBuilder o grafo
// ficaria ciclico e a injecao por construtor viraria `undefined`. Por isso a
// unica fatia que continua no model-builder e a reconstrucao do sub-schema
// embedded a partir de `group.fields`, que precisa do SchemaBuilder.
export abstract class FieldGroupBuilderContractService {
  // Ramo FIELD_GROUP do schema: monta o entry embedded a partir do `_schema` do
  // grupo referenciado pelo campo.
  abstract buildEmbeddedSchema(
    field: IField,
    groups?: IGroupConfiguration[],
  ): Record<string, IEmbeddedSchema[]>;

  // Populate dos campos populaveis (USER/CREATOR/UPDATER/FILE) dentro de cada
  // FIELD_GROUP, via dot notation `grupo.campo`. RELATIONSHIP nao vive dentro de
  // grupo (§2), entao nao ha ramo de relacionamento aqui.
  abstract buildPopulate(
    fields: IField[],
    groups: IGroupConfiguration[],
  ): mongoose.PopulateOptions[];

  // Filtros (igualdade/intervalo de data) sobre campos dentro de FIELD_GROUP, em
  // dot notation. Retorna o mapa a ser mesclado na query principal (vazio quando
  // nao ha filtro de grupo no payload).
  abstract buildFilter(
    payload: Record<string, unknown>,
    fields: IField[],
    groups?: IGroupConfiguration[],
  ): Record<string, unknown>;

  // Clausulas de busca textual (TEXT_SHORT/TEXT_LONG) dentro de FIELD_GROUP, para
  // compor o `$or` da busca global.
  abstract buildSearch(
    search: string,
    fields: IField[],
    groups?: IGroupConfiguration[],
  ): Record<string, unknown>[];
}
