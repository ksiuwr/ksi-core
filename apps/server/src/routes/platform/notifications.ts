import { and, eq, isNull } from 'drizzle-orm';
import { status, t } from 'elysia';
import { createElysia } from '../../lib/createElysia';
import { active } from './content';
import { notifications, notificationPreferences, subscriptions } from '../../db';
import {
  listNotifications,
  requireNotificationTarget,
  subscribe,
  type SubscriptionType
} from '../../services/notifications';
const params = t.Object({
  type: t.Union([t.Literal('item'), t.Literal('thread')]),
  id: t.String()
});
export const notificationRoutes = createElysia({ prefix: '/notifications' })
  .get('/', ({ db, user }) => listNotifications(db, active(user)))
  .post('/read-all', async ({ db, user }) => {
    const actor = active(user);
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
    return { read: true };
  })
  .post('/:id/read', async ({ db, user, params }) => {
    const actor = active(user);
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, params.id), eq(notifications.userId, actor.id)))
      .returning();
    if (!updated) throw status(404, { code: 'NOTIFICATION_NOT_FOUND' });
    return updated;
  })
  .get('/preferences', async ({ db, user }) => {
    const actor = active(user);
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, actor.id));
    return preferences ?? { emailEnabled: false, emailDelayMinutes: 60 };
  })
  .put(
    '/preferences',
    async ({ db, user, body }) => {
      const actor = active(user);
      const [preferences] = await db
        .insert(notificationPreferences)
        .values({ userId: actor.id, ...body })
        .onConflictDoUpdate({ target: notificationPreferences.userId, set: body })
        .returning();
      return preferences;
    },
    {
      body: t.Object({
        emailEnabled: t.Boolean(),
        emailDelayMinutes: t.Integer({ minimum: 1, maximum: 10080 })
      })
    }
  )
  .get(
    '/subscriptions/:type/:id',
    async ({ db, user, params }) => {
      const actor = active(user);
      await requireNotificationTarget(db, params.type, params.id, actor);
      const [row] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, actor.id),
            eq(subscriptions.ownerType, params.type),
            eq(subscriptions.ownerId, params.id)
          )
        );
      return { watching: !!row };
    },
    { params }
  )
  .put(
    '/subscriptions/:type/:id',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      await requireNotificationTarget(db, params.type, params.id, actor);
      if (body.watching) await subscribe(db, params.type as SubscriptionType, params.id, actor.id);
      else
        await db
          .delete(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, actor.id),
              eq(subscriptions.ownerType, params.type),
              eq(subscriptions.ownerId, params.id)
            )
          );
      return { watching: body.watching };
    },
    { params, body: t.Object({ watching: t.Boolean() }) }
  );
