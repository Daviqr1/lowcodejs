import type { IField, IFieldPermissions } from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

/**
 * Payload de campo de template. So nome, slug, tipo e permissoes sao
 * obrigatorios — o resto cai nos defaults abaixo, que eram repetidos literal a
 * literal nos 34 campos dos templates de calendar, document, forum, kanban e
 * media.
 */
export type TemplateFieldPayload = {
  name: string;
  slug: string;
  type: IField['type'];
  permissions: IFieldPermissions;
  required?: boolean;
  multiple?: boolean;
  format?: IField['format'];
  showInFilter?: boolean;
  defaultValue?: IField['defaultValue'];
  locked?: boolean;
  relationship?: IField['relationship'];
  dropdown?: IField['dropdown'];
  category?: IField['category'];
  group?: IField['group'];
  widthInForm?: IField['widthInForm'];
  widthInList?: IField['widthInList'];
  widthInDetail?: IField['widthInDetail'];
};

const TEMPLATE_FIELD_DEFAULTS = {
  required: false,
  multiple: false,
  format: null,
  showInFilter: false,
  defaultValue: null,
  locked: true,
  relationship: null,
  dropdown: [],
  category: [],
  group: null,
  widthInForm: 100,
  widthInList: 100,
  widthInDetail: null,
};

/**
 * Cria o campo e o empilha em `createdFields`, o mesmo par que cada template
 * declarava na mao antes de listar os proprios campos.
 */
export function createTemplateField(
  fieldRepository: FieldContractRepository,
  createdFields: IField[],
): (payload: TemplateFieldPayload) => Promise<IField> {
  return async (payload: TemplateFieldPayload): Promise<IField> => {
    const field = await fieldRepository.create({
      ...TEMPLATE_FIELD_DEFAULTS,
      ...payload,
    });

    createdFields.push(field);

    return field;
  };
}
