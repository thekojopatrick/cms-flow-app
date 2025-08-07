import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { employeeProfiles } from './onboarding';
import { onboardingTasks } from './onboarding';

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  name: text('name').notNull(),
  domain: text('domain'),
  subscriptionPlan: text('subscription_plan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  userId: text('user_id').references(() => user.id).notNull().unique(), // Link to auth user
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ['admin', 'hr', 'manager', 'employee'] }).notNull(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
});

// Relations
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
  employeeProfile: one(employeeProfiles, {
    fields: [profiles.id],
    references: [employeeProfiles.userId],
  }),
  managedEmployees: many(employeeProfiles, {
    relationName: "manager",
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  employees: many(employeeProfiles),
  onboardingTasks: many(onboardingTasks),
}));