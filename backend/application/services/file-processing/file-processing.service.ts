import type { MultipartFile } from '@fastify/multipart';
import { Service } from 'fastify-decorators';
import sharp from 'sharp';

import type { ProcessedFile } from './file-processing-contract.service';
import { FileProcessingContractService } from './file-processing-contract.service';

const IMAGE_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
]);

// Nome gerado como numero de ate 8 digitos **de proposito**: o
// `ContentDispositionHookService` usa `/^\d{1,8}$/` para distinguir arquivo
// de conteudo (cache imutavel) de arquivo de nome fixo como `logo-small.webp`
// (que pode ser sobrescrito e precisa revalidar). Trocar por UUID quebraria
// essa heuristica.
const HASH_NAME_CEILING = 100_000_000;

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

@Service()
export default class SharpFileProcessingService implements FileProcessingContractService {
  async process(
    part: MultipartFile,
    staticName?: string,
  ): Promise<ProcessedFile> {
    const name =
      staticName ?? String(Math.floor(Math.random() * HASH_NAME_CEILING));
    const buffer = await part.toBuffer();

    if (IMAGE_MIMETYPES.has(part.mimetype)) {
      const webp = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      return this.build(part, `${name}.webp`, webp, 'image/webp');
    }

    const extension = part.filename?.split('.').pop() ?? 'bin';
    return this.build(part, `${name}.${extension}`, buffer, part.mimetype);
  }

  private build(
    part: MultipartFile,
    filename: string,
    buffer: Buffer,
    mimetype: string,
  ): ProcessedFile {
    return {
      filename,
      buffer,
      mimetype,
      originalName: part.filename,
      size: buffer.length,
    };
  }
}
