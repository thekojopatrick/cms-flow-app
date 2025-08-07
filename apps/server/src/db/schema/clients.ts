import { pgEnum, pgTable } from "node_modules/drizzle-orm/pg-core";

export const companySizeEnum = pgEnum('company_size', ['small', 'medium', 'large', 'enterprise']);

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  companySize: companySizeEnum('company_size'),
  website: varchar('website', { length: 255 }),
  status: entityStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const clientContacts = pgTable('client_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 100 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});