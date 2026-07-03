import { E_FIELD_FORMAT } from './constant';

export const PHONE_MASK = [
  { mask: '(00) 0000-0000' },
  { mask: '(00) 00000-0000' },
];

export const CPF_MASK = '000.000.000-00';

export const CNPJ_MASK = '00.000.000/0000-00';

export function getMaskConfig(format: string | null | undefined):
  | Array<{
      mask: string;
    }>
  | '000.000.000-00'
  | '00.000.000/0000-00'
  | null {
  switch (format) {
    case E_FIELD_FORMAT.PHONE:
      return PHONE_MASK;
    case E_FIELD_FORMAT.CPF:
      return CPF_MASK;
    case E_FIELD_FORMAT.CNPJ:
      return CNPJ_MASK;
    default:
      return null;
  }
}

export function isFormatMasked(format: string | null | undefined): boolean {
  return (
    format === E_FIELD_FORMAT.PHONE ||
    format === E_FIELD_FORMAT.CPF ||
    format === E_FIELD_FORMAT.CNPJ
  );
}

export function isPasswordFormat(format: string | null | undefined): boolean {
  return format === E_FIELD_FORMAT.PASSWORD;
}

export function getInputTypeForFormat(
  format: string | null | undefined,
): string {
  switch (format) {
    case E_FIELD_FORMAT.EMAIL:
      return 'email';
    case E_FIELD_FORMAT.URL:
      return 'url';
    default:
      return 'text';
  }
}

export function getInputModeForFormat(
  format: string | null | undefined,
): 'numeric' | 'decimal' | 'email' | 'url' | 'tel' | undefined {
  switch (format) {
    case E_FIELD_FORMAT.INTEGER:
      return 'numeric';
    case E_FIELD_FORMAT.DECIMAL:
      return 'decimal';
    case E_FIELD_FORMAT.EMAIL:
      return 'email';
    case E_FIELD_FORMAT.URL:
      return 'url';
    case E_FIELD_FORMAT.PHONE:
      return 'tel';
    default:
      return undefined;
  }
}
