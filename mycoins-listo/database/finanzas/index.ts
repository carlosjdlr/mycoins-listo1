import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/database/client';
import type { AccountBody, BudgetBody, CategoryBody, TransactionBody, TransactionQuery } from '@/validations/finanzas';

const serialize = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  if (value instanceof Date) return value.toISOString();
  return value;
};

const mapRecord = <T extends Record<string, unknown>>(record: T): T =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, serialize(value)])) as T;

export const listAccounts = (userId: string) => prisma.financialAccount.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'asc' } }).then(items => items.map(item => mapRecord(item)));
export const createAccount = (userId: string, data: AccountBody) => prisma.financialAccount.create({ data: { ...data, userId } }).then(item => mapRecord(item));

export const listCategories = (userId: string) => prisma.category.findMany({ where: { userId, deletedAt: null }, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
export const createCategory = (userId: string, data: CategoryBody) => prisma.category.create({ data: { ...data, userId } });

export const listTransactions = async (userId: string, query: TransactionQuery) => {
  const { page, pageSize, from, to, type } = query;
  const where: Prisma.FinancialTransactionWhereInput = { userId, deletedAt: null, ...(type && { type }), ...(from || to ? { occurredAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}) };
  const [items, total] = await Promise.all([
    prisma.financialTransaction.findMany({ where, include: { account: { select: { name: true } }, category: { select: { name: true, color: true } } }, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.financialTransaction.count({ where }),
  ]);
  return { data: items.map(item => mapRecord(item)), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const createTransaction = async (userId: string, data: TransactionBody) => {
  const [account, category] = await Promise.all([
    prisma.financialAccount.findFirst({ where: { id: data.accountId, userId, deletedAt: null } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId, type: data.type, deletedAt: null } }),
  ]);
  if (!account || !category) throw new Error('La cuenta o categoría no pertenece al usuario.');
  return prisma.financialTransaction.create({ data: { ...data, userId } }).then(item => mapRecord(item));
};

export const createBudget = (userId: string, data: BudgetBody) => prisma.budget.create({ data: { ...data, userId } }).then(item => mapRecord(item));
export const listBudgets = (userId: string) => prisma.budget.findMany({ where: { userId, deletedAt: null }, include: { category: { select: { name: true, color: true } } }, orderBy: { periodStart: 'desc' } }).then(items => items.map(item => mapRecord(item)));

export const getSummary = async (userId: string) => {
  const transactions = await prisma.financialTransaction.findMany({ where: { userId, deletedAt: null }, select: { type: true, amount: true } });
  const accounts = await prisma.financialAccount.findMany({ where: { userId, deletedAt: null }, select: { initialBalance: true } });
  const income = transactions.filter(item => item.type === 'INCOME').reduce((total, item) => total + Number(item.amount), 0);
  const expenses = transactions.filter(item => item.type === 'EXPENSE').reduce((total, item) => total + Number(item.amount), 0);
  const initialBalance = accounts.reduce((total, item) => total + Number(item.initialBalance), 0);
  return { income, expenses, balance: initialBalance + income - expenses, transactionCount: transactions.length };
};
