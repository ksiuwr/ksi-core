import { createElysia } from '@ksi-core/server/lib/createElysia';
import dashboardRouter from '@ksi-core/server/routes/dashboard';
import galleryRouter from '@ksi-core/server/routes/gallery';
import { status } from 'elysia';

export default createElysia()
  .get('/alerts/current', async ({ db }) => {
    const now = new Date();

    const alert = await db.query.alerts.findFirst({
      orderBy: {
        priority: 'desc'
      },
      where: {
        startDate: {
          lt: now
        },
        endDate: {
          gt: now
        }
      }
    });

    if (!alert) throw status(404, 'Alert not found!');
    return alert;
  })
  .use(galleryRouter)
  .use(dashboardRouter);
