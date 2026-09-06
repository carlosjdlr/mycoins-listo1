import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { auth } from '@/middleware/auth';
import { routerOptions } from '@/lib/api/router-config';
import { financeService } from '@/services/finanzas';

const handler = createRouter<NextApiRequest, NextApiResponse>();
handler.use(auth).get(async (req, res): Promise<void> => {
  res.status(200).json({ data: await financeService.getSummary(req.user!.id) });
});
export default handler.handler(routerOptions);
