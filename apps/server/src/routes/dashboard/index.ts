import { createElysia } from '@ksi-core/server/lib/createElysia';
import { rankRequired } from '@ksi-core/server/middlewares/rankRequired';
import admin from '@ksi-core/server/routes/dashboard/admin';

export default createElysia({
  prefix: '/dashboard',
  protectedRoute: true
})
  .use(rankRequired())
  .get('/user', ({ user, discordRank }) => ({ ...user, discordRank }))
  .use(admin);
