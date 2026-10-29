import { queueDeadlineReminders } from './services/deadlines';
import { queueNotificationMailBatch } from './services/notifications';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { db, files, fileReferences, mailJobs, outbox, authHandoffs, frontendSessions } from './db';
import { canDeleteFile } from './domain/projects';
import {
  deleteObject,
  mailFailure,
  mailRetryDelay,
  publishObject,
  storageEnvironment,
  unpublishObject
} from './lib/storage';
import { fileIsPublic } from './routes/platform/files';

export { mailRetryDelay } from './lib/storage';
function mailTransport() {
  const port = Number(Bun.env.SMTP_PORT ?? 1025);
  if (
    !Bun.env.SMTP_HOST ||
    !Bun.env.SMTP_FROM ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw Object.assign(new Error('SMTP_NOT_CONFIGURED'), { code: 'SMTP_NOT_CONFIGURED' });
  return nodemailer.createTransport({
    host: Bun.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: Bun.env.NODE_ENV === 'production' && port !== 465,
    ...(Bun.env.SMTP_USER
      ? { auth: { user: Bun.env.SMTP_USER, pass: Bun.env.SMTP_PASSWORD } }
      : {}),
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
    greetingTimeout: 10_000
  });
}
/** SMTP cannot guarantee exactly-once delivery across a crash; retries are durable and secrets never enter worker logs. */
export async function deliverMailBatch(limit = 20) {
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const found = await db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(mailJobs)
        .where(
          and(
            isNull(mailJobs.sentAt),
            lt(mailJobs.availableAt, new Date()),
            lt(mailJobs.attempts, 12)
          )
        )
        .orderBy(mailJobs.availableAt)
        .limit(1)
        .for('update', { skipLocked: true });
      if (!job) return false;
      try {
        await mailTransport().sendMail({
          from: Bun.env.SMTP_FROM!,
          to: job.to,
          subject: job.subject,
          text: job.body
        });
        await tx
          .update(mailJobs)
          .set({ sentAt: new Date(), body: '', attempts: job.attempts + 1 })
          .where(eq(mailJobs.id, job.id));
        sent++;
      } catch (error) {
        const attempts = job.attempts + 1;
        await tx
          .update(mailJobs)
          .set({ attempts, availableAt: new Date(Date.now() + mailRetryDelay(attempts)) })
          .where(eq(mailJobs.id, job.id));
        console.error(
          JSON.stringify({
            service: 'mail',
            code: attempts >= 12 ? 'MAIL_EXHAUSTED' : 'MAIL_RETRY',
            jobId: job.id,
            attempts,
            ...mailFailure(error)
          })
        );
      }
      return true;
    });
    if (!found) break;
  }
  return sent;
}
export async function deliverOutboxBatch(limit = 100) {
  return db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(outbox)
      .where(isNull(outbox.deliveredAt))
      .orderBy(outbox.createdAt)
      .limit(limit)
      .for('update', { skipLocked: true });
    for (const item of pending) {
      // Postgres sends notifications only when this transaction commits. Payload is an identifier, never sensitive event metadata.
      await tx.execute(
        sql`select pg_notify('ksi_events', ${JSON.stringify({ eventId: item.eventId })})`
      );
      await tx
        .update(outbox)
        .set({ deliveredAt: new Date(), attempts: item.attempts + 1 })
        .where(eq(outbox.id, item.id));
    }
    return pending.length;
  });
}
export async function reconcileFile(fileId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [file] = await tx
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.environment, storageEnvironment())))
      .for('update');
    if (!file) return 'absent';
    const references = await tx
      .select()
      .from(fileReferences)
      .where(eq(fileReferences.fileId, file.id));
    if (references.length && file.orphanedAt)
      await tx.update(files).set({ orphanedAt: null }).where(eq(files.id, file.id));
    if (!references.length && !file.orphanedAt) {
      await tx.update(files).set({ orphanedAt: now }).where(eq(files.id, file.id));
      return 'orphaned';
    }
    if (canDeleteFile(references.length, file.orphanedAt, now)) {
      // All attaching/syncing writers take this same row lock. Reference count is rechecked under it.
      await tx.update(files).set({ state: 'deleting' }).where(eq(files.id, file.id));
      await deleteObject(file.objectKey); // Failure rolls back; next maintenance tick retries safely.
      await tx.delete(files).where(eq(files.id, file.id));
      return 'deleted';
    }
    if (file.state === 'uploading') return 'uploading';
    const isPublic = await fileIsPublic(tx, file.id);
    if (isPublic && file.state !== 'public') {
      await publishObject(file.objectKey);
      await tx.update(files).set({ state: 'public' }).where(eq(files.id, file.id));
      return 'published';
    }
    if (!isPublic && file.state === 'public') {
      await unpublishObject(file.objectKey);
      await tx.update(files).set({ state: 'private' }).where(eq(files.id, file.id));
      return 'private';
    }
    return 'unchanged';
  });
}
let fileCursor: string | null = null;
export async function reconcileFileBatch(limit = 100) {
  const where = fileCursor
    ? and(eq(files.environment, storageEnvironment()), sql`${files.id} > ${fileCursor}`)
    : eq(files.environment, storageEnvironment());
  const batch = await db
    .select({ id: files.id })
    .from(files)
    .where(where)
    .orderBy(files.id)
    .limit(limit);
  for (const file of batch) {
    try {
      await reconcileFile(file.id);
    } catch {
      console.error(JSON.stringify({ service: 'storage', code: 'FILE_RETRY', fileId: file.id }));
    }
  }
  fileCursor = batch.length === limit ? batch[batch.length - 1]!.id : null;
  return batch.length;
}
export async function maintenanceTick() {
  await queueDeadlineReminders();
  await queueNotificationMailBatch();
  await deliverMailBatch();
  await deliverOutboxBatch();
  await reconcileFileBatch();
  await db.delete(authHandoffs).where(lt(authHandoffs.expiresAt, new Date()));
  await db.delete(frontendSessions).where(lt(frontendSessions.expiresAt, new Date()));
}
if (import.meta.main) {
  let stopping = false;
  process.on('SIGTERM', () => {
    stopping = true;
  });
  process.on('SIGINT', () => {
    stopping = true;
  });
  // Confirms the worker is running and sees SMTP settings, without logging their values.
  console.log(
    JSON.stringify({
      service: 'maintenance',
      code: 'WORKER_STARTED',
      smtpConfigured: Boolean(Bun.env.SMTP_HOST && Bun.env.SMTP_FROM)
    })
  );
  while (!stopping) {
    try {
      await maintenanceTick();
    } catch {
      console.error(JSON.stringify({ service: 'maintenance', code: 'TICK_FAILED' }));
    }
    if (!stopping) await Bun.sleep(5_000);
  }
  process.exit(0);
}
