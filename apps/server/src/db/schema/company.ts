import { pgTable } from "drizzle-orm/pg-core";


// Companies table
export const companies = pgTable('companies', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    domain: varchar('domain', { length: 100 }),
    subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('basic'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });