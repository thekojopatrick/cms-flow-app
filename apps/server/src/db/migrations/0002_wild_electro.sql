CREATE TABLE `employee_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_profile_id` text NOT NULL,
	`invitation_token` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`is_used` integer DEFAULT false,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`employee_profile_id`) REFERENCES `employee_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_invitations_invitation_token_unique` ON `employee_invitations` (`invitation_token`);--> statement-breakpoint
CREATE TABLE `role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`role` text NOT NULL,
	`scope` text,
	`assigned_by` text NOT NULL,
	`is_active` integer DEFAULT true,
	`assigned_at` integer DEFAULT (unixepoch()),
	`expires_at` integer,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employee_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`personal_email` text NOT NULL,
	`work_email` text NOT NULL,
	`phone_number` text,
	`date_of_birth` text,
	`address` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`company_id` text NOT NULL,
	`employee_id` text,
	`start_date` text NOT NULL,
	`department` text NOT NULL,
	`position` text NOT NULL,
	`employment_type` text DEFAULT 'full_time',
	`salary` real,
	`currency` text DEFAULT 'USD',
	`pay_frequency` text DEFAULT 'monthly',
	`manager_id` text,
	`user_id` text,
	`access_level` text DEFAULT 'general',
	`is_active` integer DEFAULT true,
	`onboarding_status` text DEFAULT 'not_started',
	`invitation_sent_at` integer,
	`first_login_at` integer,
	`onboarding_completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`created_by` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_employee_profiles`("id", "first_name", "last_name", "personal_email", "work_email", "phone_number", "date_of_birth", "address", "emergency_contact_name", "emergency_contact_phone", "company_id", "employee_id", "start_date", "department", "position", "employment_type", "salary", "currency", "pay_frequency", "manager_id", "user_id", "access_level", "is_active", "onboarding_status", "invitation_sent_at", "first_login_at", "onboarding_completed_at", "created_at", "updated_at", "created_by") SELECT "id", "first_name", "last_name", "personal_email", "work_email", "phone_number", "date_of_birth", "address", "emergency_contact_name", "emergency_contact_phone", "company_id", "employee_id", "start_date", "department", "position", "employment_type", "salary", "currency", "pay_frequency", "manager_id", "user_id", "access_level", "is_active", "onboarding_status", "invitation_sent_at", "first_login_at", "onboarding_completed_at", "created_at", "updated_at", "created_by" FROM `employee_profiles`;--> statement-breakpoint
DROP TABLE `employee_profiles`;--> statement-breakpoint
ALTER TABLE `__new_employee_profiles` RENAME TO `employee_profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `employee_profiles_personal_email_unique` ON `employee_profiles` (`personal_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `employee_profiles_work_email_unique` ON `employee_profiles` (`work_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `employee_profiles_employee_id_unique` ON `employee_profiles` (`employee_id`);--> statement-breakpoint
DROP INDEX "profiles_user_id_unique";--> statement-breakpoint
DROP INDEX "employee_invitations_invitation_token_unique";--> statement-breakpoint
DROP INDEX "employee_profiles_personal_email_unique";--> statement-breakpoint
DROP INDEX "employee_profiles_work_email_unique";--> statement-breakpoint
DROP INDEX "employee_profiles_employee_id_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `companies` ALTER COLUMN "subscription_plan" TO "subscription_plan" text DEFAULT 'free';--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `companies` ADD `max_employees` integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE `companies` ADD `logo_url` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `website` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `industry` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `company_size` text;--> statement-breakpoint
ALTER TABLE `onboarding_tasks` ALTER COLUMN "order_sequence" TO "order_sequence" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `onboarding_tasks` ADD `estimated_minutes` integer;--> statement-breakpoint
ALTER TABLE `onboarding_tasks` ADD `created_by` text NOT NULL REFERENCES profiles(id);--> statement-breakpoint
ALTER TABLE `profiles` ADD `primary_role` text DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE `profiles` ADD `timezone` text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE `profiles` ADD `locale` text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `profiles` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `email_notifications` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `profiles` DROP COLUMN `role`;--> statement-breakpoint
ALTER TABLE `employee_task_assignments` ADD `priority` text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `employee_task_assignments` ADD `due_date` integer;--> statement-breakpoint
ALTER TABLE `employee_task_assignments` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `employee_task_assignments` ADD `completion_data` text;--> statement-breakpoint
ALTER TABLE `employee_task_assignments` ADD `assigned_by` text NOT NULL REFERENCES profiles(id);