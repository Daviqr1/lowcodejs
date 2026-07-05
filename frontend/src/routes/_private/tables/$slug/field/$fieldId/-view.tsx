/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { getDropdownContrastStyle } from '@/components/common/dynamic-table/table-cells/utils';
import { ContentViewer } from '@/components/common/rich-editor';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  DATE_FORMAT_OPTIONS,
  E_FIELD_TYPE,
  FIELD_TYPE_OPTIONS,
  TEXT_FORMAT_OPTIONS,
  TEXT_LONG_FORMAT_OPTIONS,
} from '@/lib/constant';
import type { IField } from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import { resolveFieldLabel } from '@/lib/table';

type FieldViewProps = {
  data: IField;
};

export function FieldView({ data }: FieldViewProps): React.JSX.Element {
  const typeLabel =
    FIELD_TYPE_OPTIONS.find((opt) => opt.value === data.type)?.label ||
    data.type;

  const formatLabel = (() => {
    if (!data.format) return null;

    if (data.type === E_FIELD_TYPE.TEXT_SHORT) {
      return (
        TEXT_FORMAT_OPTIONS.find((opt) => opt.value === data.format)?.label ||
        data.format
      );
    }
    if (data.type === E_FIELD_TYPE.TEXT_LONG) {
      return (
        TEXT_LONG_FORMAT_OPTIONS.find((opt) => opt.value === data.format)
          ?.label || data.format
      );
    }
    if (data.type === E_FIELD_TYPE.DATE) {
      return (
        DATE_FORMAT_OPTIONS.find((opt) => opt.value === data.format)?.label ||
        data.format
      );
    }
    return data.format;
  })();

  return (
    <section
      className="space-y-4 p-2"
      data-test-id="field-detail-view"
    >
      {/* Nome */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Título exibido</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {data.name || '-'}
        </p>
      </div>

      {/* Título efetivo na listagem (resolve label.list ou name) */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Título na listagem</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {resolveFieldLabel(data, 'list')}
        </p>
      </div>

      {/* Rótulos por contexto */}
      {data.label && (
        <Accordion
          type="single"
          collapsible
          defaultValue="labels"
          className="rounded-lg border"
        >
          <AccordionItem
            value="labels"
            className="px-3"
          >
            <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
              Rótulos por contexto
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Listagem</span>
                  <span>{data.label.list ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Filtros</span>
                  <span>{data.label.filter ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Formulário</span>
                  <span>{data.label.form ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Detalhes</span>
                  <span>{data.label.detail ?? '-'}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium">Slug</p>
        <p className="text-sm text-muted-foreground break-all">
          {data.slug || '-'}
        </p>
      </div>

      {data.tip && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Dica do campo</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data.tip}
          </p>
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Tipo</p>
        <p className="text-sm text-muted-foreground">{typeLabel}</p>
      </div>

      {/* Conteúdo HTML (HTML_CONTENT) */}
      {data.type === E_FIELD_TYPE.HTML_CONTENT && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Conteúdo HTML</p>
          <ContentViewer content={data.htmlContent ?? ''} />
        </div>
      )}

      {/* Formato (condicional) */}
      {formatLabel && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Formato</p>
          <p className="text-sm text-muted-foreground">{formatLabel}</p>
        </div>
      )}

      {/* Valor padrão (se existir) */}
      {data.defaultValue && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Valor padrão</p>
          <p className="text-sm text-muted-foreground">{data.defaultValue}</p>
        </div>
      )}

      {/* Configurações booleanas */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Configurações</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={(data.required && 'default') || 'secondary'}>
            {data.required && 'Obrigatório'}
            {!data.required && 'Opcional'}
          </Badge>
          {data.multiple && <Badge variant="outline">Múltiplos valores</Badge>}
          {isFieldShownInContext(data, 'list') && (
            <Badge variant="outline">Exibir em listagem</Badge>
          )}
          {data.showInFilter && (
            <Badge variant="outline">Permitir filtro</Badge>
          )}
          {isFieldShownInContext(data, 'form') && (
            <Badge variant="outline">Exibir em formulários</Badge>
          )}
          {isFieldShownInContext(data, 'detail') && (
            <Badge variant="outline">Exibir em detalhes</Badge>
          )}
        </div>
      </div>

      {/* Dropdown options (se for dropdown) */}
      {data.type === E_FIELD_TYPE.DROPDOWN &&
        (data.dropdown?.length ?? 0) > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Opções do Dropdown</p>
            <div className="flex flex-wrap gap-1">
              {data.dropdown.map((opt) => {
                const colorStyle = getDropdownContrastStyle(opt.color);
                let badgeClassName: string | undefined =
                  'text-muted-foreground';
                if (colorStyle) badgeClassName = undefined;
                return (
                  <Badge
                    key={opt.id}
                    variant="outline"
                    className={badgeClassName}
                    style={colorStyle}
                  >
                    {opt.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

      {/* Relacionamento (se for relationship) */}
      {data.type === E_FIELD_TYPE.RELATIONSHIP && data.relationship && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Relacionamento</p>
          <p className="text-sm text-muted-foreground">
            Tabela: {data.relationship.table.slug}
          </p>
          <p className="text-sm text-muted-foreground">
            Campo: {data.relationship.field.slug}
          </p>
          <p className="text-sm text-muted-foreground">
            Ordem: {data.relationship.order === 'asc' && 'Crescente'}
            {data.relationship.order !== 'asc' && 'Decrescente'}
          </p>
          {data.relationship.customLabel &&
            (data.relationship.labelParts?.length ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                Label personalizado:{' '}
                {data.relationship.labelParts
                  ?.map((part) => part.label || part.path)
                  .join(data.relationship.labelSeparator || ' - ')}
              </p>
            )}
        </div>
      )}

      {/* Categorias (se for category) */}
      {data.type === E_FIELD_TYPE.CATEGORY &&
        (data.category?.length ?? 0) > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Categorias</p>
            <p className="text-sm text-muted-foreground">
              {data.category.length} categoria(s) configurada(s)
            </p>
          </div>
        )}

      {/* Grupo de campos */}
      {data.type === E_FIELD_TYPE.FIELD_GROUP && data.group && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Tabela do grupo</p>
          <p className="text-sm text-muted-foreground">{data.group.slug}</p>
        </div>
      )}

      {/* Status de lixeira */}
      {data.trashed && (
        <div className="rounded-md border border-amber-500 p-3 bg-amber-50">
          <p className="text-sm text-amber-700">Este campo está na lixeira</p>
        </div>
      )}
    </section>
  );
}
