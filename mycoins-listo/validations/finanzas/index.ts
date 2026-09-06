import { z } from 'zod';

const entryType = z.enum(['INCOME', 'EXPENSE']);
const accountType = z.enum(['CASH', 'BANK', 'CARD', 'SAVINGS', 'OTHER']);

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountType,
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  initialBalance: z.coerce.number().finite().default(0),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: entryType,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0f766e'),
});

export const transactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: entryType,
  amount: z.coerce.number().positive().finite(),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  description: z.string().trim().min(1).max(240),
  occurredAt: z.coerce.date(),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  limitAmount: z.coerce.number().positive().finite(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export const transactionQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: entryType.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AccountBody = z.infer<typeof accountSchema>;
export type CategoryBody = z.infer<typeof categorySchema>;
export type TransactionBody = z.infer<typeof transactionSchema>;
export type BudgetBody = z.infer<typeof budgetSchema>;
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
