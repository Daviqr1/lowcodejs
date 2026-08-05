import z from 'zod';

const FilterOperatorValidator = z.enum([
  'equals',
  'not_equals',
  'contains',
  'is_empty',
  'is_not_empty',
  'date_between',
]);

const FilterValidator = z.object({
  id: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
  fieldSlug: z.string().trim().min(1),
  fieldType: z.string().trim().min(1),
  operator: FilterOperatorValidator,
  value: z.string().trim().nullable().default(null),
  values: z.array(z.string().trim()).default([]),
  dateStart: z.string().trim().nullable().default(null),
  dateEnd: z.string().trim().nullable().default(null),
});

export const CascadeDropdownParamsValidator = z.object({
  slug: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
});

export const CascadeDropdownOptionsParamsValidator = z.object({
  slug: z.string().trim().min(1),
  targetTableSlug: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
});

export const CascadeDropdownChildOptionsQueryValidator = z.object({
  parentValue: z.string().trim().min(1),
  search: z.string().trim().optional(),
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(20),
});

export const CascadeDropdownParentOptionsQueryValidator = z.object({
  search: z.string().trim().optional(),
});

export const CascadeDropdownConfigBodyValidator = z.object({
  sourceTableId: z.string().trim().min(1),
  sourceTableSlug: z.string().trim().min(1),
  parentFieldId: z.string().trim().min(1),
  parentFieldSlug: z.string().trim().min(1),
  childFieldId: z.string().trim().min(1),
  childFieldSlug: z.string().trim().min(1),
  enabled: z.boolean().default(true),
  parentWidth: z.coerce.number().min(1).max(100).default(30),
  childWidth: z.coerce.number().min(1).max(100).default(70),
  filters: z.array(FilterValidator).default([]),
});

export type CascadeDropdownParams = z.infer<
  typeof CascadeDropdownParamsValidator
>;
export type CascadeDropdownOptionsParams = z.infer<
  typeof CascadeDropdownOptionsParamsValidator
>;
export type CascadeDropdownConfigBody = z.infer<
  typeof CascadeDropdownConfigBodyValidator
>;
export type CascadeDropdownParentOptionsQuery = z.infer<
  typeof CascadeDropdownParentOptionsQueryValidator
>;
export type CascadeDropdownChildOptionsQuery = z.infer<
  typeof CascadeDropdownChildOptionsQueryValidator
>;
