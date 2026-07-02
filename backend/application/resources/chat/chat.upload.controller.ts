/**
 * Endpoint de upload de arquivos para o chat.
 * Segue estritamente a lógica do agent/web_app.py upload_file() linhas 75-124.
 * Recebe imagem ou PDF e retorna dados processados para enviar via Socket.IO.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST } from 'fastify-decorators';
import { PDFParse } from 'pdf-parse';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { ChatUploadSchema } from './chat.upload.schema';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const ALLOWED_PDF_TYPES = new Set(['application/pdf']);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@Controller()
export default class {
  @POST({
    url: '/chat/upload',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: ChatUploadSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const file = await request.file();

    if (!file) {
      return response.status(400).send({
        error: 'Nenhum arquivo enviado.',
      });
    }

    const contentType = file.mimetype || '';
    const filename = file.filename || 'arquivo';

    // Validar tipo (igual agent L81)
    if (
      !ALLOWED_IMAGE_TYPES.has(contentType) &&
      !ALLOWED_PDF_TYPES.has(contentType)
    ) {
      return response.status(400).send({
        error: `Tipo de arquivo não suportado: ${contentType}. Envie uma imagem (PNG, JPG, GIF, WebP) ou PDF.`,
      });
    }

    // Ler bytes do arquivo
    const fileBuffer = await file.toBuffer();

    // Validar tamanho (igual agent L88-92)
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return response.status(400).send({
        error: 'Arquivo muito grande. Tamanho máximo: 20 MB.',
      });
    }

    // Imagem: converter para base64 data URI (igual agent L94-102)
    if (ALLOWED_IMAGE_TYPES.has(contentType)) {
      const b64 = fileBuffer.toString('base64');
      const dataUri = `data:${contentType};base64,${b64}`;

      return response.send({
        type: 'image',
        filename,
        content_type: contentType,
        data_uri: dataUri,
      });
    }

    // PDF: extrair texto (igual agent L104-124)
    try {
      const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
      const textResult = await parser.getText();
      const extracted = textResult.text.trim() || '(PDF sem texto extraível)';

      return response.send({
        type: 'pdf',
        filename,
        page_count: textResult.total,
        extracted_text: extracted,
      });
    } catch (err) {
      let errorMsg = String(err);
      if (err instanceof Error) errorMsg = err.message;
      return response.status(400).send({
        error: `Erro ao processar PDF: ${errorMsg}`,
      });
    }
  }
}
