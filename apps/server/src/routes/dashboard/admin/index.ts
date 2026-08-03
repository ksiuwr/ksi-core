import { createElysia } from '@ksi-core/server/lib/createElysia';
import alertsController from '@ksi-core/server/routes/dashboard/admin/alerts/alerts.controller';
import s3cacheController from './s3cache/s3cache.controller';

export default createElysia({
  prefix: '/admin',
  protectedRoute: true
})
  .use(alertsController)
  .use(s3cacheController);
