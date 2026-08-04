import type { MultipartFile } from '@fastify/multipart';

export type ProcessedFile = {
  filename: string;
  buffer: Buffer;
  mimetype: string;
  originalName: string;
  size: number;
};

/**
 * Normalizacao do arquivo recebido no upload, antes de qualquer driver de
 * storage tocar nele. Imagem vira WebP redimensionado; o resto passa direto.
 */
export abstract class FileProcessingContractService {
  abstract process(
    part: MultipartFile,
    staticName?: string,
  ): Promise<ProcessedFile>;
}
