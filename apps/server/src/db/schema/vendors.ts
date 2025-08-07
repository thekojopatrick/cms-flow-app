import { pgTable } from "drizzle-orm/pg-core";

export const entityStatusEnum = pgEnum('entity_status', ['active', 'inactive', 'pending', 'prospect']);

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  vendorName: varchar('vendor_name', { length: 255 }).notNull(),
  businessType: varchar('business_type', { length: 100 }),
  primaryService: text('primary_service'),
  website: varchar('website', { length: 255 }),
  status: entityStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const vendorContacts = pgTable('vendor_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 100 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});