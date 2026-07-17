/* eslint-disable import/order */
import { createFormHook } from '@tanstack/react-form';

// Campos basicos (leves)
import {
  FieldBooleanSwitch,
  FieldEmail,
  FieldFileUpload,
  FieldGroupCombobox,
  FieldGroupMultiSelect,
  FieldMenuCombobox,
  FieldMenuPositionSelect,
  FieldMenuTypeSelect,
  FieldNumber,
  FieldOwnerSelect,
  FieldPassword,
  FieldPermissionBinding,
  FieldPermissionMultiSelect,
  FieldSwitch,
  FieldTableMembers,
  FieldTableMultiSelect,
  FieldText,
  FieldTextarea,
  FieldUrl,
  FieldUserMultiSelect,
} from './fields/base';

// Campos pesados com lazy loading interno
import { FieldCodeEditor, FieldEditor } from './fields/rich';

// Configuracao de tabela
import {
  TableComboboxField,
  TableFieldCategoryDefaultValue,
  TableFieldCategoryTree,
  TableFieldDateDefaultValue,
  TableFieldDropdownDefaultValue,
  TableFieldDropdownOptions,
  TableFieldFormatSelect,
  TableFieldRelationshipFieldSelect,
  TableFieldRelationshipOnDeleteSelect,
  TableFieldRelationshipOrderSelect,
  TableFieldRelationshipTableSelect,
  TableFieldTypeSelect,
  TableFieldUserDefaultValue,
  TableFieldValidationsField,
  TableLayoutFieldSelect,
  TableOrderSelectField,
  TableStyleSelectField,
} from './fields/table-config';

// Campos de input de dados de registros
import {
  TableRowCategoryField,
  TableRowDateField,
  TableRowDropdownField,
  TableRowFileField,
  TableRowRelationshipField,
  TableRowRichTextField,
  TableRowTextField,
  TableRowTextareaField,
  TableRowUserField,
  TableRowUserGroupField,
} from './fields/table-row';
import { fieldContext, formContext } from './form-context';

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    // General fields
    FieldText,
    FieldTextarea,
    FieldEmail,
    FieldPassword,
    FieldUrl,
    FieldSwitch,
    FieldBooleanSwitch,
    FieldEditor,
    FieldCodeEditor,
    FieldFileUpload,
    FieldGroupCombobox,
    FieldGroupMultiSelect,
    FieldMenuCombobox,
    FieldMenuPositionSelect,
    FieldMenuTypeSelect,
    FieldNumber,
    FieldOwnerSelect,
    FieldPermissionBinding,
    FieldPermissionMultiSelect,
    FieldTableMembers,
    FieldUserMultiSelect,
    FieldTableMultiSelect,
    // Table configuration
    TableComboboxField,
    TableLayoutFieldSelect,
    TableOrderSelectField,
    TableStyleSelectField,
    // Table field configuration
    TableFieldTypeSelect,
    TableFieldFormatSelect,
    TableFieldDropdownOptions,
    TableFieldDropdownDefaultValue,
    TableFieldDateDefaultValue,
    TableFieldCategoryDefaultValue,
    TableFieldUserDefaultValue,
    TableFieldRelationshipTableSelect,
    TableFieldRelationshipFieldSelect,
    TableFieldRelationshipOrderSelect,
    TableFieldRelationshipOnDeleteSelect,
    TableFieldCategoryTree,
    TableFieldValidationsField,
    // Table row data input
    TableRowTextField,
    TableRowTextareaField,
    TableRowRichTextField,
    TableRowDropdownField,
    TableRowDateField,
    TableRowFileField,
    TableRowRelationshipField,
    TableRowCategoryField,
    TableRowUserField,
    TableRowUserGroupField,
  },
  formComponents: {},
});
