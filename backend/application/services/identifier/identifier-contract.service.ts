/**
 * Identidade de documento. Concentra a validacao de id e a geracao de
 * identificadores, mantendo o driver de persistencia (hoje Mongoose) atras do
 * contrato. Antes existiam 4 implementacoes divergentes de validacao de
 * ObjectId espalhadas pelo backend, cada uma com um regex proprio.
 */
export abstract class IdentifierContractService {
  /** `true` quando a string e um identificador de documento valido. */
  abstract isValid(id: string): boolean;

  /** Gera um identificador novo (UUID v4). */
  abstract generate(): string;
}
