import type { MultipartFile } from '@fastify/multipart';
import { Service } from 'fastify-decorators';

import { StorageConfigContractService } from '@application/services/storage-config/storage-config-contract.service';

import { LocalStorageContractService } from './local-storage-contract.service';
import { S3StorageContractService } from './s3-storage-contract.service';
import type {
  StorageReadResponse,
  StorageUploadResponse,
  StorageWriteRawResponse,
} from './storage-contract.service';
import { StorageContractService } from './storage-contract.service';

@Service()
export default class StorageService implements StorageContractService {
  constructor(
    private readonly local: LocalStorageContractService,
    private readonly s3: S3StorageContractService,
    private readonly config: StorageConfigContractService,
  ) {}

  private get impl(): StorageContractService {
    if (this.config.driver() === 's3') return this.s3;
    return this.local;
  }

  forDriver(driver: 'local' | 's3'): StorageContractService {
    if (driver === 's3') return this.s3;
    return this.local;
  }

  async upload(
    part: MultipartFile,
    staticName?: string,
  ): Promise<StorageUploadResponse> {
    return this.impl.upload(part, staticName);
  }

  async delete(filename: string): Promise<boolean> {
    return this.impl.delete(filename);
  }

  async exists(filename: string): Promise<boolean> {
    return this.impl.exists(filename);
  }

  async ensureBucket(): Promise<void> {
    return this.impl.ensureBucket();
  }

  async read(filename: string): Promise<StorageReadResponse> {
    return this.impl.read(filename);
  }

  async writeRaw(
    filename: string,
    body: Buffer,
    mimetype: string,
  ): Promise<StorageWriteRawResponse> {
    return this.impl.writeRaw(filename, body, mimetype);
  }
}
