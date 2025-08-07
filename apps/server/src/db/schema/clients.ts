import { sqliteTable, text, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { companies } from "./profile";


// clients.ts
export const clients = sqliteTable('clients', {
    id: text('id').primaryKey(),
    companyId: text('company_id').references(() => companies.id).notNull(),
    clientName: text('client_name', { length: 255 }).notNull(),
    industry: text('industry', { length: 100 }),
    companySize: text('company_size', { enum: ['small', 'medium', 'large', 'enterprise'] }),
    website: text('website', { length: 255 }),
    status: text('status', { enum: ['active', 'inactive', 'pending', 'prospect'] }).default('active'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  });
  
  export const clientContacts = sqliteTable('client_contacts', {
    id: text('id').primaryKey(),
    clientId: text('client_id').references(() => clients.id).notNull(),
    firstName: text('first_name', { length: 100 }).notNull(),
    lastName: text('last_name', { length: 100 }).notNull(),
    email: text('email', { length: 255 }),
    phone: text('phone', { length: 20 }),
    role: text('role', { length: 100 }),
    isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  });
  
  