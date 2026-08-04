import type { IDocTranscriptionConfig } from './doc-transcription.types';

/**
 * Config singleton do transcritor de documentos — uma linha so, id fixo.
 */
export abstract class DocTranscriptionConfigContractRepository {
  /** Cria a config vazia no primeiro acesso; nunca devolve `null`. */
  abstract getOrCreate(): Promise<IDocTranscriptionConfig>;
  abstract save(
    data: Partial<IDocTranscriptionConfig>,
  ): Promise<IDocTranscriptionConfig>;
}
