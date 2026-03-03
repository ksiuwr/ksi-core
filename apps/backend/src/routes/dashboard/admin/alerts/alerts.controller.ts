import { alert } from '@ksi-core/backend/db';
import { createElysia } from '@ksi-core/backend/lib/createElysia';
import { AlertBodyType } from '@ksi-core/backend/routes/dashboard/admin/alerts/alerts.type';
import { _cuid2 } from 'better-auth';
import { count, desc, eq } from 'drizzle-orm';
import { status, t } from 'elysia';

export default createElysia({
	prefix: '/alerts',
	protectedRoute: true
})
	.get(
		'/',
		async ({ db, query }) => {
			const results = await db.query.alert.findMany({
				offset: query.page * 20,
				limit: 20,
				orderBy: desc(alert.startDate)
			});
			const count = await db.$count(alert);

			return {
				results,
				pages: Math.ceil(count / 20)
			};
		},
		{
			query: t.Object({
				page: t.Numeric()
			})
		}
	)
	.post(
		'/',
		async ({ db, body, user }) => {
			await db.insert(alert).values({
				...body,
				createdBy: user.id
			});

			return status(200, { code: 'CREATED_ALERT' });
		},
		{
			...AlertBodyType
		}
	)
	.put(
		'/:id',
		async ({ db, params, body }) => {
			const total = await db.$count(alert, eq(alert.id, params.id));
			if (total === 0) return status(404, `Alert ${params.id} was not found!`);
			await db
				.update(alert)
				.set({
					...body
				})
				.where(eq(alert.id, params.id));

			return status(200, {
				code: 'UPDATED_ALERT',
				code_values: {
					id: params.id
				}
			});
		},
		{
			...AlertBodyType,
			params: t.Object({
				id: t.String()
			})
		}
	)
	.delete(
		'/:id',
		async ({ db, params }) => {
			const total = await db.$count(alert, eq(alert.id, params.id));
			if (total === 0) return status(404, `Alert ${params.id} was not found!`);
			await db.delete(alert).where(eq(alert.id, params.id));

			return status(200, {
				code: 'DELETED_ALERT',
				code_values: {
					id: params.id
				}
			});
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);
