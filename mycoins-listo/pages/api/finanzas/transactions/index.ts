import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { auth } from '@/middleware/auth';
import { routerOptions } from '@/lib/api/router-config';
import { throwValidationError } from '@/lib/errors/throw-validation-error';
import { financeService } from '@/services/finanzas';
import { transactionQuerySchema, transactionSchema } from '@/validations/finanzas';

const handler = createRouter<NextApiRequest, NextApiResponse>();
handler.use(auth).get(async (req, res): Promise<void> => {
  const parsed = transactionQuerySchema.safeParse(req.query);
  throwValidationError(parsed);
  res.status(200).json(await financeService.listTransactions(req.user!.id, parsed.data));
}).post(async (req, res): Promise<void> => {
  const parsed = transactionSchema.safeParse(req.body);
  throwValidationError(parsed);
  res.status(201).json({ data: await financeService.createTransaction(req.user!.id, parsed.data) });
});
export default handler.handler(routerOptions);
