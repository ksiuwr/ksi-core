import { createId } from '@paralleldrive/cuid2';
import { pgTable, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';

const dates = {
	createdAt: timestamp()
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
		.notNull()
};

export const user = pgTable('user', {
	id: text().primaryKey().$defaultFn(createId),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	...dates
});

export const session = pgTable('session', {
	id: text().primaryKey().$defaultFn(createId),
	expiresAt: timestamp().notNull(),
	token: text().notNull().unique(),
	ipAddress: text(),
	userAgent: text(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	...dates
});

export const account = pgTable('account', {
	id: text().primaryKey().$defaultFn(createId),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp(),
	refreshTokenExpiresAt: timestamp(),
	scope: text(),
	password: text(),
	...dates
});

export const verification = pgTable('verification', {
	id: text().primaryKey().$defaultFn(createId),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp().notNull(),
	...dates
});

export const alertStyleEnum = pgEnum('alert_color', ['neutral', 'info', 'warning', 'danger']);

export const alert = pgTable('alert', {
	id: text().primaryKey().$defaultFn(createId),
	priority: integer(),
	title: text().notNull(),
	description: text().notNull(),
	link: text(),
	color: alertStyleEnum().notNull(),
	startDate: timestamp().notNull(),
	endDate: timestamp().notNull(),
	createdBy: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'set null' }),
	...dates
});
