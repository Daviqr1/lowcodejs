/**
 * Base dos doubles in-memory. Carrega so o que era byte-a-byte identico nos 12:
 * a simulacao de erro que os specs usam para cobrir o catch dos use-cases.
 *
 * A colecao fica em cada subclasse — a maioria guarda um array `items`, mas o
 * de row guarda um `Map` por tabela.
 *
 * Nao entra no DI: o scanner so pareia `<base>-contract.repository.ts` com o
 * irmao, e esta classe nao tem contract.
 */
export abstract class InMemoryRepository {
  private forcedErrors = new Map<string, Error>();

  /** Faz a proxima chamada de `method` lancar `error` — uma vez so. */
  simulateError(method: string, error: Error): void {
    this.forcedErrors.set(method, error);
  }

  protected checkError(method: string): void {
    const error = this.forcedErrors.get(method);
    if (error) {
      this.forcedErrors.delete(method);
      throw error;
    }
  }
}
