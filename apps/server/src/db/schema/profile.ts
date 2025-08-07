// profiles.ts
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { employeeProfiles } from './onboarding';
import { vendors } from './vendors';
import { clients } from './clients';
import { user } from './auth';

export const profiles = sqliteTable('profiles', {
  id: text('id').references(() => user.id).notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ['admin', 'hr', 'manager', 'employee'] }).notNull(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  name: text('name').notNull(),
  domain: text('domain'),
  subscriptionPlan: text('subscription_plan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  employees: many(employeeProfiles),
  vendors: many(vendors),
  clients: many(clients),
}));