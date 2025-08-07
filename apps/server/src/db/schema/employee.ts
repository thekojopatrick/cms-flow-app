import { pgTable, uuid, varchar, date, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';


// Employee profiles table
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
  
  // Onboarding tasks table
  export const onboardingTasks = pgTable('onboarding_tasks', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    taskType: taskTypeEnum('task_type').notNull().default('form'),
    required: boolean('required').default(true),
    orderSequence: integer('order_sequence').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // Employee task assignments table
  export const employeeTaskAssignments = pgTable('employee_task_assignments', {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeProfileId: uuid('employee_profile_id').references(() => employeeProfiles.id).notNull(),
    onboardingTaskId: uuid('onboarding_task_id').references(() => onboardingTasks.id).notNull(),
    status: taskStatusEnum('status').default('pending'),
    assignedDate: timestamp('assigned_date').defaultNow(),
    completedDate: timestamp('completed_date'),
    notes: text('notes'),
  });