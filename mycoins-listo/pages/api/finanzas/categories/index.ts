import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { auth } from '@/middleware/auth';
import { routerOptions } from '@/lib/api/router-config';
import { throwValidationError } from '@/lib/errors/throw-validation-error';
import { financeService } from '@/services/finanzas';
import { categorySchema } from '@/validations/finanzas';

const handler = createRouter<NextApiRequest, NextApiResponse>();
handler.use(auth).get(async (req, res): Promise<void> => {
  res.status(200).json({ data: await financeService.listCategories(req.user!.id) });
}).post(async (req, res): Promise<void> => {
  const parsed = categorySchema.safeParse(req.body);
  throwValidationError(parsed);
  res.status(201).json({ data: await financeService.createCategory(req.user!.id, parsed.data) });
});
export default handler.handler(routerOptions);
