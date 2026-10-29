import { createElysia } from '@ksi-core/server/lib/createElysia';
import dashboardRouter from '@ksi-core/server/routes/dashboard';
import galleryRouter from '@ksi-core/server/routes/gallery';
import { status, t } from 'elysia';
import { localizeContent } from 'shared/content-locales';
import { alerts } from '@ksi-core/server/db';
import { and, lte, gt, desc, sql } from 'drizzle-orm';

export default createElysia()
  .get(
    '/alerts/current',
    async ({ db, query }) => {
      const now = new Date();

      const [alert] = await db
        .select()
        .from(alerts)
        .where(and(lte(alerts.startDate, now), gt(alerts.endDate, now)))
        .orderBy(
          desc(sql`coalesce(${alerts.priority}, 0)`),
          desc(alerts.startDate),
          desc(alerts.createdAt),
          alerts.id
        )
        .limit(1);

      if (!alert) throw status(404, 'Alert not found!');
      return localizeContent(alert, query.locale);
    },
    { query: t.Object({ locale: t.Optional(t.String({ maxLength: 35 })) }) }
  )
  .use(galleryRouter)
  .use(dashboardRouter);
