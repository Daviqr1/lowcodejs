import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { BUILTIN_TABLE_TEMPLATE_IDS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { IdentifierContractService } from '@application/services/identifier/identifier-contract.service';

import { SETUP_STEPS, nextStep } from '../setup.steps';
import type { SetupStep } from '../setup.steps';

type Input = {
  PAGINATION_PER_PAGE: number;
  MODEL_CLONE_TABLES?: string[];
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'paging';

@Service()
export default class SetupPagingSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly identifier: IdentifierContractService,
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

      let filteredCloneTables: string[] = [];
      if (payload.MODEL_CLONE_TABLES) {
        filteredCloneTables = payload.MODEL_CLONE_TABLES.filter((id) => {
          if (BUILTIN_TABLE_TEMPLATE_IDS.has(id)) return false;
          if (!this.identifier.isValid(id)) return false;
          return true;
        });
      }

      const updated = await this.settingRepository.update({
        PAGINATION_PER_PAGE: payload.PAGINATION_PER_PAGE,
        MODEL_CLONE_TABLES: filteredCloneTables,
        SETUP_CURRENT_STEP: next,
      });

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > paging > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_PAGING_ERROR',
        ),
      );
    }
  }
}
