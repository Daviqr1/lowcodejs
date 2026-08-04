import type { MultipartFile } from '@fastify/multipart';
import { Service } from 'fastify-decorators';
import { createReadStream, existsSync } from 'node:fs';
import { access, mkdir, stat, unlink, writeFile } from 'node:fs/promises';

import { StorageConfigContractService } from '@application/services/storage-config/storage-config-contract.service';

import { processFile } from './process-file';
import type {
  StorageReadResponse,
  StorageUploadResponse,
  StorageWriteRawResponse,
} from './storage-contract.service';
import { StorageContractService } from './storage-contract.service';

@Service()
export default class LocalStorageService implements StorageContractService {
  constructor(private readonly config: StorageConfigContractService) {}

  async ensureBucket(): Promise<void> {
    const storagePath = this.config.localPath();
    if (!existsSync(storagePath)) {
      await mkdir(storagePath, { recursive: true });
    }
  }

  async upload(
    part: MultipartFile,
    staticName?: string,
  ): Promise<StorageUploadResponse> {
    await this.ensureBucket();

    const file = await processFile(part, staticName);

    await writeFile(this.config.localFilePath(file.filename), file.buffer);

    return {
      filename: file.filename,
      mimetype: file.mimetype,
      originalName: file.originalName,
      size: file.size,
    };
  }

  async delete(filename: string): Promise<boolean> {
    try {
      await unlink(this.config.localFilePath(filename));
      return true;
    } catch (error) {
      console.error('[Storage Local] Erro ao deletar arquivo:', error);
      return false;
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      await access(this.config.localFilePath(filename));
      return true;
    } catch {
      return false;
    }
  }

  async read(filename: string): Promise<StorageReadResponse> {
    const path = this.config.localFilePath(filename);
    const stats = await stat(path);
    return {
      stream: createReadStream(path),
      size: stats.size,
      mimetype: 'application/octet-stream',
    };
  }

  async writeRaw(
    filename: string,
    body: Buffer,

    _mimetype: string,
  ): Promise<StorageWriteRawResponse> {
    await this.ensureBucket();
    const path = this.config.localFilePath(filename);
    await writeFile(path, body);
    const stats = await stat(path);
    return { size: stats.size };
  }
}
