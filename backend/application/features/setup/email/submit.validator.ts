import z from 'zod';

export const SetupEmailBodyValidator = z
  .object({
    EMAIL_PROVIDER_HOST: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_PORT: z.coerce.number().nullable().optional(),
    EMAIL_PROVIDER_USER: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_PASSWORD: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_FROM: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.EMAIL_PROVIDER_HOST) return true;
      return !!(
        data.EMAIL_PROVIDER_PORT &&
        data.EMAIL_PROVIDER_USER &&
        data.EMAIL_PROVIDER_PASSWORD &&
        data.EMAIL_PROVIDER_FROM
      );
    },
    {
      message:
        'Se o host SMTP for preenchido, porta, usuário, senha e remetente são obrigatórios',
      path: ['EMAIL_PROVIDER_HOST'],
    },
  );

export type SetupEmailPayload = z.infer<typeof SetupEmailBodyValidator>;
