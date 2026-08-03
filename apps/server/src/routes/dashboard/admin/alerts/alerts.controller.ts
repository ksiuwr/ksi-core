import { alerts } from '@ksi-core/server/db';
import { createElysia } from '@ksi-core/server/lib/createElysia';
import { AlertBodyType } from '@ksi-core/server/routes/dashboard/admin/alerts/alerts.type';
import { eq } from 'drizzle-orm';
import { status, t } from 'elysia';

export default createElysia({
  prefix: '/alerts',
  protectedRoute: true
})
  .get(
    '/',
    async ({ db, query }) => {
      const results = await db.query.alerts.findMany({
        offset: query.page * 20,
        limit: 20,
        orderBy: {
          startDate: 'desc'
        }
      });

      const count = await db.$count(alerts);

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
      await db.insert(alerts).values({
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
      const total = await db.$count(alerts, eq(alerts.id, params.id));
      if (total === 0) return status(404, `Alert ${params.id} was not found!`);
      await db
        .update(alerts)
        .set({
          ...body
        })
        .where(eq(alerts.id, params.id));

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
      const total = await db.$count(alerts, eq(alerts.id, params.id));
      if (total === 0) return status(404, `Alert ${params.id} was not found!`);
      await db.delete(alerts).where(eq(alerts.id, params.id));

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
