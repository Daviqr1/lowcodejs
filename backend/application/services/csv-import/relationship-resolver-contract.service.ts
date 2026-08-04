import type { IField } from '@application/core/entity.core';

/** Resolve um valor de display de RELATIONSHIP nos ids correspondentes. */
export type RelationshipResolver = (raw: string) => string[];

/**
 * Pre-computa, por coluna do CSV, o mapa display → ids de cada campo
 * RELATIONSHIP. Feito de uma vez antes do laco de linhas: sem isso o import
 * faria uma consulta por celula.
 */
export abstract class RelationshipResolverContractService {
  abstract build(
    csvRows: Array<Record<string, string>>,
    fieldMap: Map<string, IField>,
  ): Promise<Map<string, RelationshipResolver>>;
}
