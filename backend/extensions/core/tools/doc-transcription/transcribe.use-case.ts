import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';

import { DocTranscriptionConfigContractRepository } from './doc-transcription-config-contract.repository';
import type { ITranscribeResult } from './doc-transcription.types';

type Input = {
  documentTypeId: string;
  fileBuffer: Buffer;
  filename: string;
  mimetype: string;
};

type Response = Either<HTTPException, ITranscribeResult>;

// Narrows para a resposta (JSON) da API externa — evita asserção sobre `unknown`.
function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value));
  }
  return {};
}
function toPrimitive(value: unknown): string | number | boolean | null {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}

@Service()
export default class TranscribeDocumentUseCase {
  constructor(
    private readonly configRepository: DocTranscriptionConfigContractRepository,
  ) {}

  async execute(input: Input): Promise<Response> {
    try {
      const config = await this.configRepository.getOrCreate();

      if (!config.apiUrl) {
        return left(
          HTTPException.BadRequest(
            'URL da API de transcrição não configurada. Acesse Ferramentas > Transcrição de Documentos para configurar.',
            'API_NOT_CONFIGURED',
          ),
        );
      }

      if (!config.apiKey) {
        return left(
          HTTPException.BadRequest(
            'API Key não configurada. Acesse Ferramentas > Transcrição de Documentos para configurar.',
            'API_KEY_NOT_CONFIGURED',
          ),
        );
      }

      const docType = config.documentTypes.find(
        (dt) => dt.id === input.documentTypeId,
      );
      if (!docType) {
        return left(
          HTTPException.BadRequest(
            'Tipo de documento não encontrado na configuração',
            'DOCUMENT_TYPE_NOT_FOUND',
          ),
        );
      }

      const formData = new FormData();
      const blob = new Blob([input.fileBuffer], { type: input.mimetype });
      formData.append('document', blob, input.filename);
      formData.append('documentType', docType.id);
      formData.append('responseFields', JSON.stringify(docType.responseFields));
      if (config.model) formData.append('model', config.model);

      let rawData: unknown;

      try {
        const res = await fetch(config.apiUrl, {
          method: 'POST',
          headers: { 'X-Api-Key': config.apiKey },
          body: formData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            `[core/doc-transcription][transcribe] API retornou ${res.status}: ${errorText}`,
          );
          let detail = `${res.status} ${res.statusText}`;
          try {
            const parsed: unknown = JSON.parse(errorText);
            if (
              parsed &&
              typeof parsed === 'object' &&
              'error' in parsed &&
              typeof parsed.error === 'string'
            ) {
              detail = parsed.error;
            }
          } catch {
            /* não é JSON */
          }
          return left(
            HTTPException.BadGateway(
              `Erro na API de transcrição: ${detail}`,
              'TRANSCRIPTION_API_ERROR',
            ),
          );
        }

        rawData = await res.json();
      } catch (fetchError) {
        console.error(
          '[core/doc-transcription][transcribe] Falha ao chamar API externa:',
          fetchError,
        );
        return left(
          HTTPException.BadGateway(
            'Não foi possível conectar à API de transcrição',
            'TRANSCRIPTION_API_UNREACHABLE',
          ),
        );
      }

      const rawResponse = toRecord(rawData);
      // A API externa retorna { data: {...}, model, usage }
      // O payload de campos está em .data — com fallback para o objeto raiz
      const dataField = rawResponse['data'];
      let raw = rawResponse;
      if (dataField && typeof dataField === 'object') raw = toRecord(dataField);

      const fields = docType.responseFields.map((rf) => ({
        key: rf.key,
        label: rf.label,
        type: rf.type,
        value: toPrimitive(raw[rf.key]),
      }));

      return right({
        documentTypeId: docType.id,
        documentTypeName: docType.name,
        fields,
        raw,
      });
    } catch (error) {
      console.error('[core/doc-transcription][transcribe] error:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno ao processar transcrição',
          'TRANSCRIPTION_INTERNAL_ERROR',
        ),
      );
    }
  }
}
