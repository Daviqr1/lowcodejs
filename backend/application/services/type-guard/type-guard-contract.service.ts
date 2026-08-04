export abstract class TypeGuardContractService {
  /**
   * Objeto **ou array** — e o `typeof value === 'object' && value !== null` cru
   * que estava repetido em 12 arquivos. Array passa; quem precisa excluir array
   * usa `isPlainObject`.
   */
  abstract isRecord(value: unknown): value is Record<string, unknown>;
  /** Como `isRecord`, mas array nao passa. */
  abstract isPlainObject(value: unknown): value is Record<string, unknown>;
}
