import SearchService from '@application/services/search/search.service';
import MongooseFieldGroupBuilder from '@application/services/table/field-group-builder.service';
import MongooseSchemaBuilder from '@application/services/table/schema-builder.service';

/**
 * Monta o `MongooseSchemaBuilder` com o grafo de dependencias real.
 *
 * Specs unitarios nao importam `@start/kernel`, entao o container de DI esta
 * vazio e `getInstanceByToken` falharia. Construir a mao aqui funciona tanto no
 * unit quanto no e2e e nao depende da ordem de boot.
 */
export function makeSchemaBuilder(): MongooseSchemaBuilder {
  return new MongooseSchemaBuilder(
    new MongooseFieldGroupBuilder(new SearchService()),
  );
}
