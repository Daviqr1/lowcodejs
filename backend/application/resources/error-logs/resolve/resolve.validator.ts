import z from 'zod';

export const ErrorLogResolveParamsValidator = z.object({
  id: z.string().min(1),
});

export const ErrorLogResolveBodyValidator = z.object({
  resolved: z.boolean(),
});

export type ErrorLogResolveParams = z.infer<
  typeof ErrorLogResolveParamsValidator
>;
export type ErrorLogResolveBody = z.infer<typeof ErrorLogResolveBodyValidator>;
