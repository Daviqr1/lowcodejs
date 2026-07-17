import z from 'zod';

export const GenerateTestDataValidator = z.object({
  tableId: z.string().trim().min(1, 'Selecione uma tabela'),
  quantity: z.coerce
    .number()
    .min(1, 'Quantidade mínima é 1')
    .max(10_000_000_000_000, 'Quantidade máxima é 10 trilhões'),
});
