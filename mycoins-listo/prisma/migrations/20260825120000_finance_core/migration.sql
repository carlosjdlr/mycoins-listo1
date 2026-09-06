CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'CARD', 'SAVINGS', 'OTHER');
CREATE TYPE "FinancialEntryType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "financial_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL,
  "type" "FinancialAccountType" NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "initial_balance" DECIMAL(18,2) NOT NULL DEFAULT 0, "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ, CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financial_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL,
  "type" "FinancialEntryType" NOT NULL, "color" VARCHAR(20) NOT NULL DEFAULT '#0f766e',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ, CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financial_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "account_id" UUID NOT NULL, "category_id" UUID NOT NULL,
  "type" "FinancialEntryType" NOT NULL, "amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "description" VARCHAR(240) NOT NULL, "occurred_at" DATE NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL, "deleted_at" TIMESTAMPTZ, CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financial_budgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "category_id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL,
  "limit_amount" DECIMAL(18,2) NOT NULL, "period_start" DATE NOT NULL, "period_end" DATE NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ, CONSTRAINT "financial_budgets_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_budgets" ADD CONSTRAINT "financial_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_budgets" ADD CONSTRAINT "financial_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "financial_categories_user_id_name_type_key" ON "financial_categories"("user_id", "name", "type");
CREATE INDEX "financial_accounts_user_id_deleted_at_idx" ON "financial_accounts"("user_id", "deleted_at");
CREATE INDEX "financial_categories_user_id_type_deleted_at_idx" ON "financial_categories"("user_id", "type", "deleted_at");
CREATE INDEX "financial_transactions_user_id_occurred_at_idx" ON "financial_transactions"("user_id", "occurred_at");
CREATE INDEX "financial_transactions_account_id_occurred_at_idx" ON "financial_transactions"("account_id", "occurred_at");
CREATE INDEX "financial_budgets_user_id_period_start_period_end_idx" ON "financial_budgets"("user_id", "period_start", "period_end");
