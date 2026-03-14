import { createElysia } from '@ksi-core/backend/lib/createElysia';
import alertsController from '@ksi-core/backend/routes/dashboard/admin/alerts/alerts.controller';
import s3cacheController from './s3cache/s3cache.controller';

export default createElysia({
	prefix: '/admin',
	protectedRoute: true
})
	.use(alertsController)
	.use(s3cacheController);
