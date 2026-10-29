import { alerts } from '@ksi-core/server/db';
import { createElysia, requirePermission } from '@ksi-core/server/lib/createElysia';
import { recordEvent } from '@ksi-core/server/lib/audit';
import { contentChanges } from 'shared/activity';
import { AlertBodyType } from '@ksi-core/server/routes/dashboard/admin/alerts/alerts.type';
import { safeAlertLink } from '@ksi-core/server/domain/content-policy';
import { eq, sql } from 'drizzle-orm';
import { status, t } from 'elysia';
const alertFields = [
  'title',
  'description',
  'link',
  'color',
  'priority',
  'startDate',
  'endDate'
] as const;
export default createElysia({ prefix: '/alerts', protectedRoute: true })
  .onBeforeHandle(({ user }) => {
    requirePermission(user, 'association.alerts.manage');
  })
  .get(
    '/',
    async ({ db, query }) => {
      const results = await db.query.alerts.findMany({
        offset: query.page * 20,
        limit: 20,
        orderBy: { startDate: 'desc', id: 'asc' }
      });
      const count = await db.$count(alerts);
      return { results, pages: Math.ceil(count / 20) };
    },
    { query: t.Object({ page: t.Numeric({ minimum: 0, multipleOf: 1 }) }) }
  )
  .post(
    '/',
    async ({ db, body, user }) => {
      if (body.endDate <= body.startDate) return status(400, { code: 'INVALID_ALERT_INTERVAL' });
      if (body.link && !safeAlertLink(body.link))
        return status(400, 'Alert link must be a relative, http(s) or mailto link');
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(alerts)
          .values({ ...body, version: 1, createdBy: user!.id })
          .returning();
        await recordEvent(tx, {
          actorId: user!.id,
          action: 'alerts.created',
          targetId: created!.id,
          metadata: { changes: contentChanges({}, created!, alertFields) }
        });
      });
      return status(200, { code: 'CREATED_ALERT' });
    },
    { ...AlertBodyType }
  )
  .put(
    '/:id',
    async ({ db, params, body, user }) => {
      if (body.endDate <= body.startDate) return status(400, { code: 'INVALID_ALERT_INTERVAL' });
      if (body.link && !safeAlertLink(body.link))
        return status(400, 'Alert link must be a relative, http(s) or mailto link');
      return db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(alerts)
          .where(eq(alerts.id, params.id))
          .for('update');
        if (!before) return status(404, `Alert ${params.id} was not found!`);
        if (body.version !== undefined && body.version !== before.version)
          return status(409, { code: 'REVISION_CONFLICT' });
        const [updated] = await tx
          .update(alerts)
          .set({ ...body, version: sql`${alerts.version} + 1` })
          .where(eq(alerts.id, params.id))
          .returning();
        await recordEvent(tx, {
          actorId: user!.id,
          action: 'alerts.updated',
          targetId: params.id,
          metadata: { changes: contentChanges(before, updated!, alertFields) }
        });
        return status(200, { code: 'UPDATED_ALERT', code_values: { id: params.id } });
      });
    },
    { ...AlertBodyType, params: t.Object({ id: t.String() }) }
  )
  .delete(
    '/:id',
    async ({ db, params, user }) =>
      db.transaction(async (tx) => {
        const [removed] = await tx.delete(alerts).where(eq(alerts.id, params.id)).returning();
        if (!removed) return status(404, `Alert ${params.id} was not found!`);
        await recordEvent(tx, {
          actorId: user!.id,
          action: 'alerts.removed',
          targetId: params.id,
          metadata: { changes: contentChanges(removed, {}, alertFields) }
        });
        return status(200, { code: 'DELETED_ALERT', code_values: { id: params.id } });
      }),
    { params: t.Object({ id: t.String() }) }
  );
