import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router';
import type * as React from 'react';
import { z } from 'zod';

import { BlockedDialog } from './-blocked-dialog';
import { Stepper } from './-stepper';

import { AuthShell } from '@/components/common/auth-shell';
import { setupStatusOptions } from '@/hooks/tanstack-query/_query-options';
import { SETUP_STEPS } from '@/lib/constant';
import type { SetupStep } from '@/lib/interfaces';

function resolveCurrentStep(pathname: string): SetupStep {
  const segment = pathname.replace('/setup/', '').replace('/', '');
  const matched = SETUP_STEPS.find((step) => step === segment);

  if (matched) return matched;

  return 'admin';
}

const searchSchema = z.object({
  blocked: z.string().optional(),
});

export const Route = createFileRoute('/setup')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, location }) => {
    const status = await context.queryClient.fetchQuery(setupStatusOptions());

    if (status.completed) {
      throw redirect({ to: '/' });
    }

    const currentPath = location.pathname.replace('/setup/', '');
    const currentStep = status.currentStep ?? 'admin';
    const currentStepIndex = SETUP_STEPS.indexOf(currentStep);
    const requestedStepIndex = SETUP_STEPS.findIndex(
      (step) => step === currentPath,
    );

    if (requestedStepIndex > currentStepIndex && requestedStepIndex >= 0) {
      throw redirect({
        to: `/setup/${currentStep}`,
        search: { blocked: currentPath },
      });
    }
  },
  component: SetupLayout,
});

function SetupLayout(): React.JSX.Element {
  const { blocked } = Route.useSearch();
  const location = useLocation();
  const currentStep = resolveCurrentStep(location.pathname);

  return (
    <AuthShell contentClassName="max-w-xl">
      <div className="flex flex-col gap-8">
        <Stepper currentStep={currentStep} />
        <Outlet />
        <BlockedDialog blocked={blocked} />
      </div>
    </AuthShell>
  );
}
