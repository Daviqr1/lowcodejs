import type { ITable } from '@application/core/entity.core';

/**
 * Constroi uma copia da tabela com TODOS os campos marcados como
 * `required: false`, usada exclusivamente pelo auto-save para persistir
 * rascunhos parciais sem disparar os validators de obrigatoriedade do Mongoose.
 *
 * O core (`schema-builder`/`model-builder`) permanece intocado: a tabela
 * original continua gerando o schema com `required` real para create/update
 * normais. Como `buildTable` reconstroi o model a cada chamada, este schema
 * relaxado vive apenas durante a request do auto-save.
 */
export abstract class DraftTableContractService {
  abstract from(table: ITable): ITable;
}
