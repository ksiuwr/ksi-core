import { createElysia } from '@ksi-core/backend/lib/createElysia';
import dashboardRouter from '@ksi-core/backend/routes/dashboard';
import { status } from 'elysia';

export default createElysia()
	.get('/alerts/current', async ({ db }) => {
		const _alert = await db.query.alert.findFirst({
			where: (alert, { and, lt, gt }) =>
				and(lt(alert.startDate, new Date()), gt(alert.endDate, new Date())),
			orderBy: (alert, { desc }) => desc(alert.priority)
		});

		if (!_alert) throw status(404, 'Alert not found!');
		return _alert;
	})
	.use(dashboardRouter);
