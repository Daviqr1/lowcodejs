import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type FormFooterProps = {
  form: {
    Subscribe: React.ComponentType<{
      selector: (state: {
        canSubmit: boolean;
        isSubmitting: boolean;
      }) => [boolean, boolean];
      children: (value: [boolean, boolean]) => React.ReactNode;
    }>;
    handleSubmit: () => void;
  };
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitTestId?: string;
  cancelTestId?: string;
  submitDisabled?: boolean;
  className?: string;
};

export function FormFooter({
  form,
  onCancel,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  submitTestId,
  cancelTestId,
  submitDisabled = false,
  className,
}: FormFooterProps): React.JSX.Element {
  return (
    <div
      data-slot="form-footer"
      className={className}
    >
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className={cn('flex justify-end gap-2')}>
            <Button
              data-test-id={cancelTestId}
              type="button"
              variant="outline"
              size="sm"
              className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              <span>{cancelLabel}</span>
            </Button>
            <Button
              data-test-id={submitTestId}
              type="button"
              size="sm"
              className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
              disabled={!canSubmit || submitDisabled}
              onClick={() => form.handleSubmit()}
            >
              {isSubmitting && <Spinner />}
              <span>{submitLabel}</span>
            </Button>
          </div>
        )}
      />
    </div>
  );
}
