import { sqliteTable, text, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { companies } from './profile'; // Assuming 'companies' schema exists and is imported.

// vendors.ts
export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(), // Storing UUIDs as text
  companyId: text('company_id').references(() => companies.id).notNull(),
  vendorName: text('vendor_name', { length: 255 }).notNull(),
  businessType: text('business_type', { length: 100 }),
  primaryService: text('primary_service'),
  website: text('website', { length: 255 }),
  status: text('status', { enum: ['active', 'inactive', 'pending', 'prospect'] }).default('active'), // Using text with enum constraint
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // Storing timestamps as text
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const vendorContacts = sqliteTable('vendor_contacts', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').references(() => vendors.id).notNull(),
  firstName: text('first_name', { length: 100 }).notNull(),
  lastName: text('last_name', { length: 100 }).notNull(),
  email: text('email', { length: 255 }),
  phone: text('phone', { length: 20 }),
  role: text('role', { length: 100 }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false), // Using integer for boolean
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});