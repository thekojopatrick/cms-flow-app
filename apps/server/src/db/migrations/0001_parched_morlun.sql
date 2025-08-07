CREATE TABLE `client_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`first_name` text(100) NOT NULL,
	`last_name` text(100) NOT NULL,
	`email` text(255),
	`phone` text(20),
	`role` text(100),
	`is_primary` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`client_name` text(255) NOT NULL,
	`industry` text(100),
	`company_size` text,
	`website` text(255),
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`subscription_plan` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`role` text NOT NULL,
	`company_id` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`last_login` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `employee_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text,
	`start_date` text,
	`department` text,
	`position` text,
	`manager_id` text,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_task_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_profile_id` text NOT NULL,
	`onboarding_task_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`assigned_date` integer DEFAULT (unixepoch()),
	`completed_date` integer,
	`notes` text,
	FOREIGN KEY (`employee_profile_id`) REFERENCES `employee_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`onboarding_task_id`) REFERENCES `onboarding_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `onboarding_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`task_type` text NOT NULL,
	`required` integer DEFAULT true,
	`order_sequence` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vendor_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`first_name` text(100) NOT NULL,
	`last_name` text(100) NOT NULL,
	`email` text(255),
	`phone` text(20),
	`role` text(100),
	`is_primary` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`vendor_name` text(255) NOT NULL,
	`business_type` text(100),
	`primary_service` text,
	`website` text(255),
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
