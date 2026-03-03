import { createElysia } from '@ksi-core/backend/lib/createElysia';
import alertsController from '@ksi-core/backend/routes/dashboard/admin/alerts/alerts.controller';

export default createElysia({
	prefix: '/admin',
	protectedRoute: true
}).use(alertsController);
