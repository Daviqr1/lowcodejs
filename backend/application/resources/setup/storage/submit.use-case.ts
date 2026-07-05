/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { StorageContractService } from '@application/services/storage/storage-contract.service';
import { syncStorageEnv } from '@config/setting-env-sync';

import { SETUP_STEPS, nextStep } from '../setup.steps';
import type { SetupStep } from '../setup.steps';

type Input = {
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION?: string;
  STORAGE_BUCKET?: string;
  STORAGE_ACCESS_KEY?: string;
  STORAGE_SECRET_KEY?: string;
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'storage';

@Service()
export default class SetupStorageSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly storageService: StorageContractService,
  ) {}

  async execute(payload: Input): Promise<Response> {
    try {
      const setting = await this.settingRepository.get();

      if (setting?.SETUP_COMPLETED) {
        return left(
          HTTPException.Conflict(
            'O setup já foi concluído',
            'SETUP_ALREADY_COMPLETED',
          ),
        );
      }

      if (setting && setting.SETUP_CURRENT_STEP !== CURRENT_STEP) {
        return left(
          HTTPException.PreconditionFailed(
            'Etapa incorreta do setup',
            'SETUP_WRONG_STEP',
            { expected: setting.SETUP_CURRENT_STEP ?? 'admin' },
          ),
        );
      }

      const next = nextStep(CURRENT_STEP);

      const updated = await this.settingRepository.update({
        STORAGE_DRIVER: payload.STORAGE_DRIVER,
        STORAGE_ENDPOINT: payload.STORAGE_ENDPOINT,
        STORAGE_REGION: payload.STORAGE_REGION ?? 'us-east-1',
        STORAGE_BUCKET: payload.STORAGE_BUCKET,
        STORAGE_ACCESS_KEY: payload.STORAGE_ACCESS_KEY,
        STORAGE_SECRET_KEY: payload.STORAGE_SECRET_KEY,
        SETUP_CURRENT_STEP: next,
      });

      syncStorageEnv(updated);

      if (payload.STORAGE_DRIVER === 's3') {
        await this.storageService.ensureBucket();
      }

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > storage > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_STORAGE_ERROR',
        ),
      );
    }
  }
}
