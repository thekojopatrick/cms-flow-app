import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { profiles, companies } from './profile';

export const employeeProfiles = sqliteTable('employee_profiles', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  userId: text('user_id').references(() => profiles.id).notNull(), // Reference to profiles, not auth user
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

// Relations
export const employeeProfilesRelations = relations(employeeProfiles, ({ one, many }) => ({
  user: one(profiles, {
    fields: [employeeProfiles.userId],
    references: [profiles.id],
  }),
  company: one(companies, {
    fields: [employeeProfiles.companyId],
    references: [companies.id],
  }),
  manager: one(profiles, {
    fields: [employeeProfiles.managerId],
    references: [profiles.id],
    relationName: "manager",
  }),
  taskAssignments: many(employeeTaskAssignments),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({ one, many }) => ({
  company: one(companies, {
    fields: [onboardingTasks.companyId],
    references: [companies.id],
  }),
  assignments: many(employeeTaskAssignments),
}));

export const employeeTaskAssignmentsRelations = relations(employeeTaskAssignments, ({ one }) => ({
  employeeProfile: one(employeeProfiles, {
    fields: [employeeTaskAssignments.employeeProfileId],
    references: [employeeProfiles.id],
  }),
  task: one(onboardingTasks, {
    fields: [employeeTaskAssignments.onboardingTaskId],
    references: [onboardingTasks.id],
  }),
}));