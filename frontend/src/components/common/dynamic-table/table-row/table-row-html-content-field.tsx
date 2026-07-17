import { ContentViewer } from '@/components/common/rich-editor';
import type { IField } from '@/lib/interfaces';

type TableRowHtmlContentFieldProps = {
  field: IField;
};

export function TableRowHtmlContentField({
  field,
}: TableRowHtmlContentFieldProps): React.JSX.Element {
  return <ContentViewer content={field.htmlContent ?? ''} />;
}
