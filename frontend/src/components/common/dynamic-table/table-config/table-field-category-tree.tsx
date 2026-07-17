import type { TreeNode } from '@/components/common/tree-editor/tree-list';
import { TreeEditor } from '@/components/common/tree-editor/tree-node';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type TableFieldCategoryTreeProps = {
  label: string;
  required?: boolean;
};

export function TableFieldCategoryTree({
  label,
  required,
}: TableFieldCategoryTreeProps): React.JSX.Element {
  const field = useFieldContext<Array<TreeNode>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-category-tree"
      data-test-id="table-field-category-tree"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <TreeEditor
        initialData={field.state.value}
        onChange={(treeData) => {
          field.handleChange(treeData);
          field.handleBlur();
        }}
        className={cn(isInvalid && 'border-destructive')}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
