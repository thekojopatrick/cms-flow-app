import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { employeeProfiles, roleAssignments } from './onboarding';
import { onboardingTasks } from './onboarding';

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  name: text('name').notNull(),
  domain: text('domain'),
  subscriptionPlan: text('subscription_plan', { 
    enum: ['free', 'basic', 'pro', 'enterprise'] 
  }).default('free'),
  maxEmployees: integer('max_employees').default(10),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: text('industry'),
  companySize: text('company_size', { 
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'] 
  }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Updated profiles to work better with the new employee system
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  userId: text('user_id').references(() => user.id).notNull().unique(),
  
  // Basic Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  
  // Primary role (simplified - detailed roles in roleAssignments table)
  primaryRole: text('primary_role', { 
    enum: ['admin','hr', 'manager', 'employee'] 
  }).default('employee'),
  
  // Company relationship
  companyId: text('company_id').references(() => companies.id).notNull(),
  
  // Profile settings
  timezone: text('timezone').default('UTC'),
  locale: text('locale').default('en'),
  avatar: text('avatar'),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailNotifications: integer('email_notifications', { mode: 'boolean' }).default(true),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
});

// Relations
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  // Link to auth user
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
  
  // Company relationship
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
  
  // Employee profile (if this user is also an employee)
  employeeProfile: one(employeeProfiles, {
    fields: [profiles.id],
    references: [employeeProfiles.userId],
  }),
  
  // Employees this person manages
  managedEmployees: many(employeeProfiles, {
    relationName: "manager",
  }),
  
  // Employees this person created
  createdEmployees: many(employeeProfiles, {
    relationName: "creator",
  }),
  
  // Role assignments
  roleAssignments: many(roleAssignments),
  
  // Role assignments made by this person
  assignedRoles: many(roleAssignments, {
    relationName: "roleAssigner",
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  employees: many(employeeProfiles),
  onboardingTasks: many(onboardingTasks),
}));