import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_ROLE,
  E_USER_STATUS,
  type IUser,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { PasswordContractService } from '@application/services/password/password-contract.service';

import { SETUP_STEPS, nextStep } from '../setup.steps';

type SetupAdminInput = {
  name: string;
  email: string;
  password: string;
};

type SetupAdminOutput = {
  completed: boolean;
  currentStep: string | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
  user: IUser;
};

type Response = Either<HTTPException, SetupAdminOutput>;

@Service()
export default class SetupAdminSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly passwordService: PasswordContractService,
  ) {}

  async execute(payload: SetupAdminInput): Promise<Response> {
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

      if (setting && setting.SETUP_CURRENT_STEP !== 'admin') {
        return left(
          HTTPException.PreconditionFailed(
            'Etapa incorreta do setup',
            'SETUP_WRONG_STEP',
            { expected: setting.SETUP_CURRENT_STEP ?? 'admin' },
          ),
        );
      }

      const existingUser = await this.userRepository.findByEmail(payload.email);
      if (existingUser) {
        return left(
          HTTPException.Conflict('Usuário já existe', 'USER_ALREADY_EXISTS', {
            email: 'Este email já está em uso',
          }),
        );
      }

      const masterGroup = await this.userGroupRepository.findBySlug(
        E_ROLE.MASTER,
      );

      if (!masterGroup) {
        return left(
          HTTPException.Conflict(
            'Grupo MASTER não encontrado. Execute os seeders primeiro.',
            'MASTER_GROUP_NOT_FOUND',
          ),
        );
      }

      const users = await this.userRepository.findMany({});
      const alreadyHasMaster = users.some(
        (user) => user.group?.slug === E_ROLE.MASTER,
      );

      if (alreadyHasMaster) {
        return left(
          HTTPException.Conflict(
            'Já existe um usuário MASTER',
            'MASTER_ALREADY_EXISTS',
          ),
        );
      }

      const passwordHash = await this.passwordService.hash(payload.password);

      const created = await this.userRepository.create({
        name: payload.name,
        email: payload.email,
        password: passwordHash,
        group: masterGroup._id,
        status: E_USER_STATUS.ACTIVE,
      });

      const next = nextStep('admin');
      const updated = await this.settingRepository.update({
        SETUP_CURRENT_STEP: next,
      });

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
        user: created,
      });
    } catch (error) {
      console.error('[setup > admin > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao criar administrador',
          'SETUP_ADMIN_ERROR',
        ),
      );
    }
  }
}
