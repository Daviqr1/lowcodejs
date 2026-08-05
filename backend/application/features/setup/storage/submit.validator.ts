import z from 'zod';

export const SetupStorageBodyValidator = z
  .object({
    STORAGE_DRIVER: z.enum(['local', 's3'], {
      message: 'O driver de armazenamento deve ser "local" ou "s3"',
    }),
    STORAGE_ENDPOINT: z.string().trim().optional(),
    STORAGE_REGION: z.string().trim().optional(),
    STORAGE_BUCKET: z.string().trim().optional(),
    STORAGE_ACCESS_KEY: z.string().trim().optional(),
    STORAGE_SECRET_KEY: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.STORAGE_DRIVER !== 's3') return true;
      return (
        !!data.STORAGE_ENDPOINT &&
        !!data.STORAGE_BUCKET &&
        !!data.STORAGE_ACCESS_KEY &&
        !!data.STORAGE_SECRET_KEY
      );
    },
    {
      message:
        'Endpoint, bucket, access key e secret key são obrigatórios para S3',
      path: ['STORAGE_ENDPOINT'],
    },
  );

export type SetupStoragePayload = z.infer<typeof SetupStorageBodyValidator>;
