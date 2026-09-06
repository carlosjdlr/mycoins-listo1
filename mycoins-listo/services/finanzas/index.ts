import * as financeData from '@/database/finanzas';
import type { AccountBody, BudgetBody, CategoryBody, TransactionBody, TransactionQuery } from '@/validations/finanzas';

export const financeService = {
  listAccounts: (userId: string) => financeData.listAccounts(userId),
  createAccount: (userId: string, data: AccountBody) => financeData.createAccount(userId, data),
  listCategories: (userId: string) => financeData.listCategories(userId),
  createCategory: (userId: string, data: CategoryBody) => financeData.createCategory(userId, data),
  listTransactions: (userId: string, query: TransactionQuery) => financeData.listTransactions(userId, query),
  createTransaction: (userId: string, data: TransactionBody) => financeData.createTransaction(userId, data),
  listBudgets: (userId: string) => financeData.listBudgets(userId),
  createBudget: (userId: string, data: BudgetBody) => financeData.createBudget(userId, data),
  getSummary: (userId: string) => financeData.getSummary(userId),
};
