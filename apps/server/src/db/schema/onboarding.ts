import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { profiles, companies } from './profile';

// Enhanced employee profiles with complete employee details
export const employeeProfiles = sqliteTable('employee_profiles', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  
  // Basic Info - Manager creates these when adding employee
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  personalEmail: text('personal_email').notNull().unique(), // Employee's personal email
  workEmail: text('work_email').notNull().unique(), // Employee's work email
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'), // YYYY-MM-DD format
  address: text('address'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  
  // Work Details
  companyId: text('company_id').references(() => companies.id).notNull(),
  employeeId: text('employee_id').unique(), // Company's internal employee ID
  startDate: text('start_date').notNull(), // YYYY-MM-DD format
  department: text('department').notNull(),
  position: text('position').notNull(),
  employmentType: text('employment_type', { 
    enum: ['full_time', 'part_time', 'contract', 'intern'] 
  }).default('full_time'),
  
  // Compensation
  salary: real('salary'), // Annual salary
  currency: text('currency').default('USD'),
  payFrequency: text('pay_frequency', { 
    enum: ['monthly', 'bi_weekly', 'weekly'] 
  }).default('monthly'),
  
  // Reporting Structure
  managerId: text('manager_id').references(() => profiles.id),
  
  // System Fields
  userId: text('user_id').references(() => profiles.id), // Links to auth user after employee activates account
  accessLevel: text('access_level', { 
    enum: ['general', 'senior','top-level','IT','admin'] 
  }).default('general'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  
  // Onboarding Status
  onboardingStatus: text('onboarding_status', { 
    enum: ['not_started', 'invited', 'in_progress', 'completed'] 
  }).default('not_started'),
  invitationSentAt: integer('invitation_sent_at', { mode: 'timestamp' }),
  firstLoginAt: integer('first_login_at', { mode: 'timestamp' }),
  onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' }),
  
  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  createdBy: text('created_by').references(() => profiles.id).notNull(), // Manager who created this profile
});

// Invitation system for new employees
export const employeeInvitations = sqliteTable('employee_invitations', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  employeeProfileId: text('employee_profile_id').references(() => employeeProfiles.id).notNull(),
  invitationToken: text('invitation_token').notNull().unique(),
  email: text('email').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isUsed: integer('is_used', { mode: 'boolean' }).default(false),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Keep existing onboarding tasks table (no changes needed)
export const onboardingTasks = sqliteTable('onboarding_tasks', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  companyId: text('company_id').references(() => companies.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  taskType: text('task_type', { 
    enum: ['form', 'document', 'acknowledgment', 'training', 'meeting'] 
  }).notNull(),
  required: integer('required', { mode: 'boolean' }).default(true),
  orderSequence: integer('order_sequence').default(0),
  estimatedMinutes: integer('estimated_minutes'), // How long task should take
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  createdBy: text('created_by').references(() => profiles.id).notNull(),
});

// Enhanced task assignments
export const employeeTaskAssignments = sqliteTable('employee_task_assignments', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  employeeProfileId: text('employee_profile_id').references(() => employeeProfiles.id).notNull(),
  onboardingTaskId: text('onboarding_task_id').references(() => onboardingTasks.id).notNull(),
  status: text('status', { 
    enum: ['pending', 'in_progress', 'completed', 'skipped', 'overdue'] 
  }).default('pending'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  assignedDate: integer('assigned_date', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedDate: integer('completed_date', { mode: 'timestamp' }),
  notes: text('notes'),
  completionData: text('completion_data'), // JSON field for form responses, etc.
  assignedBy: text('assigned_by').references(() => profiles.id).notNull(),
});

// Role assignments for flexible role management
export const roleAssignments = sqliteTable('role_assignments', {
  id: text('id').primaryKey().$default(() => crypto.randomUUID()),
  profileId: text('profile_id').references(() => profiles.id).notNull(),
  role: text('role', { 
    enum: ['admin', 'hr_manager', 'department_manager', 'team_lead', 'employee'] 
  }).notNull(),
  scope: text('scope'), // Department, team, or company-wide
  assignedBy: text('assigned_by').references(() => profiles.id).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // For temporary roles
});

// Relations
export const employeeProfilesRelations = relations(employeeProfiles, ({ one, many }) => ({
  // Link to authenticated user (only after employee accepts invitation)
  user: one(profiles, {
    fields: [employeeProfiles.userId],
    references: [profiles.id],
  }),
  
  // Company relationship
  company: one(companies, {
    fields: [employeeProfiles.companyId],
    references: [companies.id],
  }),
  
  // Manager relationship
  manager: one(profiles, {
    fields: [employeeProfiles.managerId],
    references: [profiles.id],
    relationName: "manager",
  }),
  
  // Creator relationship (who added this employee)
  creator: one(profiles, {
    fields: [employeeProfiles.createdBy],
    references: [profiles.id],
    relationName: "creator",
  }),
  
  // Task assignments
  taskAssignments: many(employeeTaskAssignments),
  
  // Invitation
  invitation: one(employeeInvitations),
}));

export const employeeInvitationsRelations = relations(employeeInvitations, ({ one }) => ({
  employeeProfile: one(employeeProfiles, {
    fields: [employeeInvitations.employeeProfileId],
    references: [employeeProfiles.id],
  }),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({ one, many }) => ({
  company: one(companies, {
    fields: [onboardingTasks.companyId],
    references: [companies.id],
  }),
  creator: one(profiles, {
    fields: [onboardingTasks.createdBy],
    references: [profiles.id],
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
  assignedByProfile: one(profiles, {
    fields: [employeeTaskAssignments.assignedBy],
    references: [profiles.id],
  }),
}));

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
  profile: one(profiles, {
    fields: [roleAssignments.profileId],
    references: [profiles.id],
  }),
  assignedByProfile: one(profiles, {
    fields: [roleAssignments.assignedBy],
    references: [profiles.id],
    relationName: "roleAssigner",
  }),
}));