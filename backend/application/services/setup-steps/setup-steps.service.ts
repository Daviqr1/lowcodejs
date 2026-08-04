import { Service } from 'fastify-decorators';

import type { SetupStep } from './setup-steps-contract.service';
import { SetupStepsContractService } from './setup-steps-contract.service';

const NEXT_STEP: Record<SetupStep, SetupStep | null> = {
  admin: 'name',
  name: 'storage',
  storage: 'logos',
  logos: 'upload',
  upload: 'paging',
  paging: 'email',
  email: null,
};

@Service()
export default class SetupStepsService implements SetupStepsContractService {
  next(step: SetupStep): SetupStep | null {
    return NEXT_STEP[step];
  }
}
