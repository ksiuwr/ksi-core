import { createProtectedElysia } from '@ksi-core/server/lib/createElysia';
import admin from './admin';
import { effectivePermissions } from '../../domain/permissions';
export default createProtectedElysia({ prefix: '/dashboard' })
  .get('/access', ({ user }) => ({
    canManageAlerts: effectivePermissions(user!).has('association.alerts.manage')
  }))
  .get('/user', ({ user }) => user)
  .use(admin);
