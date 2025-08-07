// onboarding.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profile';
import { companies } from './profile';

export const employeeProfiles = sqliteTable('employee_profiles', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  userId: text('user_id').references(() => profiles.id),
  companyId: text('company_id').references(() => companies.id).notNull(),
  employeeId: text('employee_id'),
  startDate: text('start_date'), // Store as YYYY-MM-DD string
  department: text('department'),
  position: text('position'),
  managerId: text('manager_id').references(() => profiles.id),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const onboardingTasks = sqliteTable('onboarding_tasks', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  companyId: text('company_id').references(() => companies.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  taskType: text('task_type', { enum: ['form', 'document', 'acknowledgment', 'training'] }).notNull(),
  required: integer('required', { mode: 'boolean' }).default(true),
  orderSequence: integer('order_sequence'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const employeeTaskAssignments = sqliteTable('employee_task_assignments', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  employeeProfileId: text('employee_profile_id').references(() => employeeProfiles.id).notNull(),
  onboardingTaskId: text('onboarding_task_id').references(() => onboardingTasks.id).notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'skipped'] }).default('pending'),
  assignedDate: integer('assigned_date', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  completedDate: integer('completed_date', { mode: 'timestamp' }),
  notes: text('notes'),
});