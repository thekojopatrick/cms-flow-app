// onboarding.ts
import { pgTable, uuid, varchar, text, date, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const employeeStatusEnum = pgEnum('employee_status', ['pending', 'in_progress', 'completed']);
export const taskTypeEnum = pgEnum('task_type', ['form', 'document', 'acknowledgment', 'training']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'skipped']);

export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  employeeId: varchar('employee_id', { length: 50 }),
  startDate: date('start_date'),
  department: varchar('department', { length: 100 }),
  position: varchar('position', { length: 100 }),
  managerId: uuid('manager_id').references(() => users.id),
  status: employeeStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const onboardingTasks = pgTable('onboarding_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  taskType: taskTypeEnum('task_type').notNull(),
  required: boolean('required').default(true),
  orderSequence: integer('order_sequence'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const employeeTaskAssignments = pgTable('employee_task_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeProfileId: uuid('employee_profile_id').references(() => employeeProfiles.id).notNull(),
  onboardingTaskId: uuid('onboarding_task_id').references(() => onboardingTasks.id).notNull(),
  status: taskStatusEnum('status').default('pending'),
  assignedDate: timestamp('assigned_date').defaultNow(),
  completedDate: timestamp('completed_date'),
  notes: text('notes'),
});