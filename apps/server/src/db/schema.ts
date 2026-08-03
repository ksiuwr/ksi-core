import { createId } from '@paralleldrive/cuid2';
import { pgTable, text, timestamp, boolean, integer, pgEnum, snakeCase } from 'drizzle-orm/pg-core';

export const users = snakeCase.table('users', {
  id: text().primaryKey().$defaultFn(createId),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull()
});

export const sessions = snakeCase.table('sessions', {
  id: text().primaryKey().$defaultFn(createId),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
});

export const accounts = snakeCase.table('accounts', {
  id: text().primaryKey().$defaultFn(createId),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  password: text(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$onUpdate(() => new Date())
    .notNull()
});

export const verifications = snakeCase.table('verifications', {
  id: text().primaryKey().$defaultFn(createId),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull()
});

export const alertStyleEnum = pgEnum('alert_color', ['neutral', 'info', 'warning', 'danger']);

export const alerts = snakeCase.table('alerts', {
  id: text().primaryKey().$defaultFn(createId),
  priority: integer(),
  title: text().notNull(),
  description: text().notNull(),
  link: text(),
  color: alertStyleEnum().notNull(),
  startDate: timestamp().notNull(),
  endDate: timestamp().notNull(),
  createdBy: text()
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull()
});
