import type { AxiosResponse } from 'axios';

import { API } from '@/lib/api';
import { downloadBlob } from '@/lib/download-blob';

/**
 * Extrai o `filename` de um header `Content-Disposition` (RFC 6266).
 * Aceita tanto `filename="..."` quanto `filename*=UTF-8''...`.
 * Retorna `null` se o header não estiver presente ou não puder ser parseado.
 */
export function extractFilenameFromContentDisposition(
  header: string | null | undefined,
): string | null {
  if (!header) return null;

  const utf8Match = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // ignore decoding errors and try regular filename
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  if (plainMatch?.[1]) return plainMatch[1].trim();

  return null;
}

/**
 * Baixa um CSV de um endpoint do backend respeitando filename do
 * `Content-Disposition` quando presente.
 */
export async function downloadCsvFromApi(
  path: string,
  params: Record<string, unknown> = {},
  fallbackFilename = 'export.csv',
): Promise<void> {
  const response: AxiosResponse<Blob> = await API.get(path, {
    params,
    responseType: 'blob',
  });

  let headerValue: string | null = null;
  const headers = response.headers;
  if (typeof headers?.get === 'function') {
    const raw = headers.get('content-disposition');
    if (typeof raw === 'string') headerValue = raw;
  } else if (headers && typeof headers === 'object') {
    const raw = headers['content-disposition'];
    if (typeof raw === 'string') headerValue = raw;
  }

  const filename =
    extractFilenameFromContentDisposition(headerValue) ?? fallbackFilename;

  downloadBlob(response.data, filename);
}
