import z from 'zod';

export const SetupUploadBodyValidator = z.object({
  FILE_UPLOAD_MAX_SIZE: z.coerce
    .number({ message: 'O tamanho máximo de arquivo deve ser um número' })
    .min(1, 'O tamanho máximo de arquivo deve ser maior que zero'),
  FILE_UPLOAD_ACCEPTED: z
    .string()
    .trim()
    .min(1, 'As extensões aceitas devem ter ao menos 1 caractere'),
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: z.coerce
    .number({ message: 'O máximo de arquivos por upload deve ser um número' })
    .min(1, 'O máximo de arquivos por upload deve ser maior que zero'),
});

export type SetupUploadPayload = z.infer<typeof SetupUploadBodyValidator>;
