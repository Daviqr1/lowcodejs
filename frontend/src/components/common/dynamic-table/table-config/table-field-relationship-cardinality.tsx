import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';

export function TableFieldRelationshipCardinality(props: {
  sourceMultiple: boolean;
  mirrorMultiple: boolean;
}): React.JSX.Element {
  let label = '1:N (um para muitos)';
  if (!props.sourceMultiple && !props.mirrorMultiple) {
    label = '1:1 (um para um)';
  }
  if (props.sourceMultiple && props.mirrorMultiple) {
    label = 'N:N (muitos para muitos)';
  }

  return (
    <Field
      data-slot="table-field-relationship-cardinality"
      data-test-id="table-field-relationship-cardinality"
    >
      <FieldLabel>Cardinalidade</FieldLabel>
      <Badge variant="secondary">{label}</Badge>
    </Field>
  );
}
