import { queueDeadlineReminders } from '../services/deadlines';
import { queueNotificationMailBatch } from '../services/notifications';
import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getUrls } from 'shared';
import { digest } from '../domain/sso';
import {
  db,
  alerts,
  users,
  sessions,
  frontendSessions,
  boards,
  kanbanItems,
  notifications,
  threads,
  comments,
  files,
  fileReferences,
  avatarRequests,
  auditEvents,
  outbox,
  projects,
  projectMembers,
  mailJobs,
  verifications
} from '../db';
import { app } from '../app';
import { canReadFile, referenceAccess } from '../routes/platform/files';
const safe =
  process.env.KSI_ENVIRONMENT === 'integration' &&
  new URL(process.env.DATABASE_URL ?? 'postgres://none@localhost/none').pathname ===
    '/ksi_integration';
const names = ['admin', 'member', 'outsider', 'pending'] as const;
type Actor = (typeof names)[number];
const ids = Object.fromEntries(names.map((name) => [name, createId()])) as Record<Actor, string>;
const tokens = Object.fromEntries(names.map((name) => [name, createId()])) as Record<Actor, string>;
const projectId = createId(),
  boardId = createId(),
  imageId = createId(),
  replacementId = createId(),
  pdfId = createId(),
  itemId = createId();
let signupId: string | undefined;
const signupEmail = `signup-${createId()}@example.test`;
async function request(actor: Actor, path: string, method = 'GET', body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost:3000${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-ksi-proxy-key': process.env.PROXY_SECRET!,
        'x-ksi-origin': getUrls().frontend.dashboard,
        'x-ksi-session': tokens[actor]
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  );
  return { status: response.status, body: (await response.json()) as any };
}
describe.skipIf(!safe)('persistent dashboard workflows', () => {
  beforeAll(async () => {
    const expiry = new Date(Date.now() + 3600000);
    await db.insert(users).values(
      names.map((name) => ({
        id: ids[name],
        name: `${name} Workflow`,
        firstName: name,
        email: `${ids[name]}@example.test`,
        membershipStatus: name === 'pending' ? ('pending' as const) : ('active' as const),
        role: name === 'admin' ? ('administrator' as const) : ('member' as const),
        image: name === 'member' ? 'https://example.invalid/old.webp' : null
      }))
    );
    for (const name of names) {
      const id = createId();
      await db.insert(sessions).values({
        id,
        userId: ids[name],
        token: createId(),
        expiresAt: expiry,
        updatedAt: new Date()
      });
      await db.insert(frontendSessions).values({
        id: digest(tokens[name]),
        sessionId: id,
        origin: getUrls().frontend.dashboard,
        environment: 'integration',
        expiresAt: expiry
      });
    }
    await db.insert(projects).values({ id: projectId, name: 'Workflow project', slug: projectId });
    await db.insert(projectMembers).values({ projectId, userId: ids.member, leader: true });
    await db.insert(boards).values({ id: boardId, projectId, scopeKey: `project:${projectId}` });
    for (const id of [imageId, replacementId, pdfId])
      await db.insert(files).values({
        id,
        uploaderId: ids.member,
        hash: id,
        objectKey: `integration/${id}`,
        environment: 'integration',
        filename: 'test',
        mime: id === pdfId ? 'application/pdf' : 'image/png',
        size: 100,
        state: 'private'
      });
  });
  afterAll(async () => {
    const allIds = [...Object.values(ids), ...(signupId ? [signupId] : [])];
    await db
      .delete(fileReferences)
      .where(inArray(fileReferences.fileId, [imageId, replacementId, pdfId]));
    await db.delete(avatarRequests).where(inArray(avatarRequests.userId, allIds));
    await db.delete(files).where(inArray(files.id, [imageId, replacementId, pdfId]));
    await db.delete(comments).where(eq(comments.itemId, itemId));
    await db.delete(kanbanItems).where(eq(kanbanItems.boardId, boardId));
    await db.delete(boards).where(eq(boards.id, boardId));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, allIds));
    if (events.length)
      await db.delete(outbox).where(
        inArray(
          outbox.eventId,
          events.map((e) => e.id)
        )
      );
    await db.delete(auditEvents).where(inArray(auditEvents.actorId, allIds));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(mailJobs).where(eq(mailJobs.to, signupEmail));
    await db.delete(verifications).where(eq(verifications.identifier, signupEmail));
    await db.delete(users).where(inArray(users.id, allIds));
  });
  test('member directory filters and dedicated profile management are authorized', async () => {
    const directory = await request('admin', '/users?search=workflow&status=active&role=member');
    expect(directory.status).toBe(200);
    expect(
      directory.body.users.every((u: any) => u.role === 'member' && u.membershipStatus === 'active')
    ).toBe(true);
    expect((await request('member', `/users/${ids.outsider}`)).status).toBe(403);
    expect(
      (await request('member', `/users/${ids.outsider}/profile`, 'PATCH', { nickname: 'No' }))
        .status
    ).toBe(403);
    expect(
      (
        await request('admin', `/users/${ids.outsider}/profile`, 'PATCH', {
          nickname: 'Directory test'
        })
      ).status
    ).toBe(200);
    expect((await request('admin', `/users/${ids.outsider}`)).body.nickname).toBe('Directory test');
    expect(
      (await request('admin', '/users?search=Directory%20test')).body.users.some(
        (u: any) => u.id === ids.outsider
      )
    ).toBe(true);
  });
  test('profile, translation and access changes persist allowlisted before/after values and notifications', async () => {
    const before = (await request('member', '/users/me')).body.user;
    const nickname = 'Audit nickname',
      bio = 'Audit line one\nAudit line two';
    try {
      expect((await request('member', '/users/me', 'PATCH', { nickname, bio })).status).toBe(200);
      const ownEvents = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.targetId, ids.member));
      const profileEvent = ownEvents.find(
        (event) =>
          event.action === 'users.profile.updated' &&
          JSON.stringify(event.metadata.changes).includes(nickname)
      );
      expect(profileEvent?.metadata.changes).toEqual([
        { field: 'nickname', before: before.nickname, after: nickname },
        { field: 'bio', before: before.bio, after: bio }
      ]);
      expect(JSON.stringify(profileEvent?.metadata)).not.toContain(before.email);
      expect(
        await db.select().from(outbox).where(eq(outbox.eventId, profileEvent!.id))
      ).toHaveLength(1);
      expect(
        (
          await request('admin', `/users/${ids.member}/profile`, 'PATCH', {
            firstName: 'Audit member'
          })
        ).status
      ).toBe(200);
      const adminEvents = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.targetId, ids.member));
      const adminEvent = adminEvents.find(
        (event) => event.actorId === ids.admin && event.action === 'users.profile.updated'
      );
      expect(adminEvent?.metadata.changes).toEqual([
        { field: 'firstName', before: before.firstName, after: 'Audit member' }
      ]);
      expect(
        (
          await request('member', `/platform/translations/profile/${ids.member}/pl`, 'PUT', {
            fields: { bio: 'Zmieniona biografia' }
          })
        ).status
      ).toBe(200);
      const translated = (
        await db.select().from(auditEvents).where(eq(auditEvents.targetId, ids.member))
      ).find((event) => event.action === 'users.translation.updated');
      expect(translated?.metadata.changes).toEqual([
        { field: 'bio', before: null, after: 'Zmieniona biografia' }
      ]);
      expect(translated?.metadata.locale).toBe('pl');
      expect(
        (
          await request('admin', `/users/${ids.outsider}/access`, 'PATCH', {
            role: 'board',
            flags: ['+audit.events.read']
          })
        ).status
      ).toBe(200);
      const access = (
        await db.select().from(auditEvents).where(eq(auditEvents.targetId, ids.outsider))
      ).find((event) => event.action === 'users.membership.changed');
      expect(access?.metadata.changes).toEqual([
        { field: 'role', before: 'member', after: 'board' },
        { field: 'flags', before: [], after: ['+audit.events.read'] }
      ]);
      expect((await request('member', '/platform/events')).status).toBe(403);
      const activity = await request('admin', '/platform/events');
      expect(activity.status).toBe(200);
      expect(
        activity.body.some(
          (row: any) => row.event.id === profileEvent!.id && row.event.metadata.changes.length === 2
        )
      ).toBe(true);
    } finally {
      await db
        .update(users)
        .set({
          nickname: before.nickname,
          bio: before.bio,
          firstName: before.firstName,
          name: before.name,
          translations: before.translations
        })
        .where(eq(users.id, ids.member));
      await db.update(users).set({ role: 'member', flags: [] }).where(eq(users.id, ids.outsider));
    }
  });
  test('saving an otherwise empty profile logs only the field the user actually changed', async () => {
    const [before] = await db.select().from(users).where(eq(users.id, ids.member));
    await db.update(users).set({ nickname: null, bio: null }).where(eq(users.id, ids.member));
    try {
      const lastName = `Changed-${ids.member}`;
      expect(
        (await request('member', '/users/me', 'PATCH', { lastName, nickname: '', bio: '' })).status
      ).toBe(200);
      const events = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.targetId, ids.member));
      const event = events.find(
        (event) =>
          event.action === 'users.profile.updated' &&
          JSON.stringify(event.metadata.changes).includes(lastName)
      );
      expect(event?.metadata.changes).toEqual([
        { field: 'lastName', before: before!.lastName, after: lastName }
      ]);
    } finally {
      await db
        .update(users)
        .set({
          lastName: before!.lastName,
          name: before!.name,
          nickname: before!.nickname,
          bio: before!.bio
        })
        .where(eq(users.id, ids.member));
    }
  });
  test('deleted users appear only with the explicit deleted status filter', async () => {
    await db.update(users).set({ membershipStatus: 'deleted' }).where(eq(users.id, ids.outsider));
    try {
      for (const suffix of ['', '&role=member']) {
        const result = await request('admin', `/users?search=${ids.outsider}${suffix}`);
        expect(result.status).toBe(200);
        expect(result.body.users.some((u: any) => u.id === ids.outsider)).toBe(false);
        expect(result.body.total).toBe(result.body.users.length);
      }
      const deleted = await request('admin', `/users?search=${ids.outsider}&status=deleted`);
      expect(deleted.body.users.map((u: any) => u.id)).toEqual([ids.outsider]);
      expect(deleted.body.total).toBe(1);
    } finally {
      await db.update(users).set({ membershipStatus: 'active' }).where(eq(users.id, ids.outsider));
    }
  });
  test('pending users require an explicit filter and approvals remain discoverable', async () => {
    const unfiltered = await request('admin', `/users?search=${ids.pending}`);
    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.users).toEqual([]);
    expect(unfiltered.body.total).toBe(0);
    expect(unfiltered.body.pendingCount).toBeGreaterThan(0);

    const filtered = await request('admin', `/users?search=${ids.pending}&status=pending`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.users.map((u: any) => u.id)).toEqual([ids.pending]);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.pendingCount).toBe(unfiltered.body.pendingCount);

    // The indicator must ignore search, role, status and pagination filters.
    const elsewhere = await request(
      'admin',
      '/users?search=no-match&role=board&status=active&page=1'
    );
    expect(elsewhere.body.pendingCount).toBe(unfiltered.body.pendingCount);

    await db.update(users).set({ role: 'board' }).where(eq(users.id, ids.outsider));
    try {
      const board = await request('outsider', '/users');
      expect(board.status).toBe(200);
      expect(board.body.pendingCount).toBeGreaterThan(0);

      await db.update(users).set({ role: 'board' }).where(eq(users.id, ids.pending));
      const restricted = await request('outsider', '/users');
      expect(restricted.body.pendingCount).toBe(board.body.pendingCount - 1);

      await db
        .update(users)
        .set({ role: 'member', flags: ['+users.membership.activate'] })
        .where(eq(users.id, ids.outsider));
      const delegated = await request('outsider', '/users');
      expect(delegated.status).toBe(200);
      expect(delegated.body.pendingCount).toBe(0);
    } finally {
      await db.update(users).set({ role: 'member', flags: [] }).where(eq(users.id, ids.outsider));
      await db.update(users).set({ role: 'member' }).where(eq(users.id, ids.pending));
    }
  });
  test('task ordering is atomic, versioned, and rejects stale or foreign lists', async () => {
    const created = [];
    for (const title of ['First', 'Second', 'Third']) {
      const result = await request('member', `/platform/boards/${boardId}/items`, 'POST', {
        title,
        markdown: '',
        column: 'todo',
        labels: [],
        position: created.length
      });
      expect(result.status).toBe(200);
      created.push(result.body);
    }
    const all = (await request('member', `/platform/boards/${boardId}/items`)).body;
    const order = [...all].reverse().map(({ id, version }: any) => ({ id, version }));
    const result = await request('member', `/platform/boards/${boardId}/order`, 'PUT', {
      column: 'todo',
      items: order
    });
    expect(result.status).toBe(200);
    expect(result.body.map((item: any) => item.id)).toEqual(order.map((item: any) => item.id));
    expect(result.body.map((item: any) => item.position)).toEqual(
      order.map((_: any, i: number) => i)
    );
    expect(
      (
        await request('member', `/platform/boards/${boardId}/order`, 'PUT', {
          column: 'todo',
          items: order
        })
      ).status
    ).toBe(409);
    const current = result.body.map(({ id, version }: any) => ({ id, version }));
    expect(
      (
        await request('member', `/platform/boards/${boardId}/order`, 'PUT', {
          column: 'todo',
          items: current.slice(1)
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request('pending', `/platform/boards/${boardId}/order`, 'PUT', {
          column: 'todo',
          items: current
        })
      ).status
    ).toBe(403);
    await db.delete(kanbanItems).where(
      inArray(
        kanbanItems.id,
        created.map((item) => item.id)
      )
    );
  });
  test('cross-column ordering preserves exact insertion positions and rejects stale or invalid moves atomically', async () => {
    const localBoardId = createId();
    const foreignBoardId = createId();
    await db.insert(boards).values([
      { id: localBoardId, projectId, scopeKey: `cross-order:${localBoardId}` },
      { id: foreignBoardId, projectId, scopeKey: `cross-order:${foreignBoardId}` }
    ]);
    const sourceId = createId(),
      firstId = createId(),
      secondId = createId(),
      foreignId = createId();
    try {
      await db.insert(kanbanItems).values([
        {
          id: sourceId,
          boardId: localBoardId,
          authorId: ids.member,
          title: 'Moving',
          column: 'todo',
          position: 0
        },
        {
          id: firstId,
          boardId: localBoardId,
          authorId: ids.member,
          title: 'First',
          column: 'progress',
          position: 0
        },
        {
          id: secondId,
          boardId: localBoardId,
          authorId: ids.member,
          title: 'Second',
          column: 'progress',
          position: 1
        },
        {
          id: foreignId,
          boardId: foreignBoardId,
          authorId: ids.member,
          title: 'Foreign',
          column: 'todo',
          position: 0
        }
      ]);
      const path = `/platform/boards/${localBoardId}/order`;
      const input = {
        column: 'progress',
        move: { id: sourceId, fromColumn: 'todo' },
        items: [
          { id: firstId, version: 1 },
          { id: sourceId, version: 1 },
          { id: secondId, version: 1 }
        ]
      };
      const snapshot = async () =>
        (await db.select().from(kanbanItems).where(eq(kanbanItems.boardId, localBoardId))).sort(
          (a, b) => a.id.localeCompare(b.id)
        );
      const before = await snapshot();
      expect((await request('outsider', path, 'PUT', input)).status).toBe(403);
      expect(
        (
          await request('member', path, 'PUT', {
            ...input,
            move: { id: sourceId, fromColumn: 'done' }
          })
        ).status
      ).toBe(409);
      expect(
        (await request('member', path, 'PUT', { ...input, items: input.items.slice(1) })).status
      ).toBe(409);
      expect(
        (
          await request('member', path, 'PUT', {
            ...input,
            items: input.items.map((item) =>
              item.id === sourceId ? { ...item, version: 2 } : item
            )
          })
        ).status
      ).toBe(409);
      expect(
        (
          await request('member', path, 'PUT', {
            ...input,
            items: input.items.map((item) => (item.id === firstId ? { ...item, version: 2 } : item))
          })
        ).status
      ).toBe(409);
      expect(
        (
          await request('member', path, 'PUT', {
            ...input,
            move: { id: foreignId, fromColumn: 'todo' },
            items: input.items.map((item) =>
              item.id === sourceId ? { ...item, id: foreignId } : item
            )
          })
        ).status
      ).toBe(409);
      expect((await request('member', path, 'PUT', { column: 'missing', items: [] })).status).toBe(
        422
      );
      expect(await snapshot()).toEqual(before);
      const moved = await request('member', path, 'PUT', input);
      expect(moved.status).toBe(200);
      expect(
        moved.body.map((item: any) => [item.id, item.column, item.position, item.version])
      ).toEqual([
        [firstId, 'progress', 0, 2],
        [sourceId, 'progress', 1, 2],
        [secondId, 'progress', 2, 2]
      ]);
      const persisted = (await request('member', `/platform/boards/${localBoardId}/items`)).body;
      expect(persisted.map((item: any) => item.id)).toEqual([firstId, sourceId, secondId]);
      expect((await request('member', path, 'PUT', input)).status).toBe(409);
      const empty = await request('member', path, 'PUT', {
        column: 'done',
        move: { id: sourceId, fromColumn: 'progress' },
        items: [{ id: sourceId, version: 2 }]
      });
      expect(empty.status).toBe(200);
      expect(empty.body[0]).toMatchObject({
        id: sourceId,
        column: 'done',
        position: 0,
        version: 3
      });
      await db
        .update(kanbanItems)
        .set({ deletedAt: new Date() })
        .where(eq(kanbanItems.id, sourceId));
      expect(
        (
          await request('member', path, 'PUT', {
            column: 'todo',
            move: { id: sourceId, fromColumn: 'done' },
            items: [{ id: sourceId, version: 3 }]
          })
        ).status
      ).toBe(409);
    } finally {
      // Audit events are cleaned up by the suite's actor cleanup.
      await db
        .delete(kanbanItems)
        .where(inArray(kanbanItems.boardId, [localBoardId, foreignBoardId]));
      await db.delete(boards).where(inArray(boards.id, [localBoardId, foreignBoardId]));
    }
  });
  test('task audit metadata retains before and after values', async () => {
    await db
      .update(boards)
      .set({ labels: [{ name: 'urgent', color: '#6b7280' }] })
      .where(eq(boards.id, boardId));
    const created = await request('member', `/platform/boards/${boardId}/items`, 'POST', {
      title: 'Old title',
      markdown: 'Old description',
      column: 'todo',
      labels: [],
      position: 0
    });
    expect(created.status).toBe(200);
    const updated = await request('member', `/platform/items/${created.body.id}`, 'PATCH', {
      version: 1,
      title: 'New title',
      markdown: 'New description',
      labels: ['urgent']
    });
    expect(updated.status).toBe(200);
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.targetId, created.body.id));
    const event = events.find((event) => event.action === 'kanban.updated');
    expect(event?.metadata.changes).toEqual([
      { field: 'title', before: 'Old title', after: 'New title' },
      { field: 'markdown', before: 'Old description', after: 'New description' },
      { field: 'labels', before: [], after: ['urgent'] }
    ]);
    await db.update(boards).set({ labels: [] }).where(eq(boards.id, boardId));
    const timeline = await request('member', `/platform/items/${created.body.id}/activity`);
    expect(timeline.status).toBe(200);
    expect(
      timeline.body.find((entry: any) => entry.action === 'kanban.updated').metadata.changes
    ).toEqual(event?.metadata.changes);
    expect((await request('pending', `/platform/items/${created.body.id}/activity`)).status).toBe(
      403
    );
    await db.delete(kanbanItems).where(eq(kanbanItems.id, created.body.id));
  });
  test('alert creation, edits and deletion retain their editable values', async () => {
    const title = `Audit alert ${createId()}`;
    const body = {
      title,
      description: 'Original notice',
      color: 'info',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2027-01-01T00:00:00.000Z',
      priority: 1
    };
    const path = '/dashboard/admin/alerts';
    expect((await request('member', path, 'POST', body)).status).toBe(403);
    expect((await request('admin', path, 'POST', body)).status).toBe(200);
    const [alert] = await db.select().from(alerts).where(eq(alerts.title, title));
    expect(alert).toBeDefined();
    try {
      expect(
        (
          await request('admin', `${path}/${alert!.id}`, 'PUT', {
            ...body,
            description: 'Updated notice',
            priority: 0
          })
        ).status
      ).toBe(200);
      let events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, alert!.id));
      expect(
        events.find((event) => event.action === 'alerts.created')?.metadata.changes
      ).toContainEqual({ field: 'description', before: null, after: 'Original notice' });
      expect(events.find((event) => event.action === 'alerts.updated')?.metadata.changes).toEqual([
        { field: 'description', before: 'Original notice', after: 'Updated notice' },
        { field: 'priority', before: 1, after: 0 }
      ]);
      expect((await request('admin', `${path}/${alert!.id}`, 'DELETE')).status).toBe(200);
      events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, alert!.id));
      expect(
        events.find((event) => event.action === 'alerts.removed')?.metadata.changes
      ).toContainEqual({ field: 'description', before: 'Updated notice', after: null });
    } finally {
      await db.delete(alerts).where(eq(alerts.id, alert!.id));
    }
  });
  test('assignments accept active project members and reject outsiders and stale writes', async () => {
    const create = (assigneeIds: string[]) =>
      request('member', `/platform/boards/${boardId}/items`, 'POST', {
        title: 'Assigned task',
        markdown: '',
        column: 'todo',
        labels: [],
        position: 0,
        assigneeIds
      });
    expect((await create([ids.outsider])).status).toBe(422);
    expect((await create([ids.pending])).status).toBe(422);
    const task = await create([ids.member]);
    expect(task.status).toBe(200);
    expect(task.body.assigneeIds).toEqual([ids.member]);
    const cleared = await request('member', `/platform/items/${task.body.id}`, 'PATCH', {
      version: 1,
      assigneeIds: []
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body.assigneeIds).toEqual([]);
    expect(
      (
        await request('member', `/platform/items/${task.body.id}`, 'PATCH', {
          version: 1,
          assigneeIds: [ids.member]
        })
      ).status
    ).toBe(409);
    const thread = await request('member', '/platform/threads', 'POST', {
      projectId,
      title: 'Assigned thread',
      markdown: 'Post',
      visibility: 'members',
      invitedIds: [],
      assigneeIds: [ids.member]
    });
    expect(thread.status).toBe(200);
    expect(thread.body.assigneeIds).toEqual([ids.member]);
    const retitled = await request('member', `/platform/threads/${thread.body.id}`, 'PATCH', {
      version: 1,
      title: 'Renamed thread'
    });
    expect(retitled.status).toBe(200);
    expect(retitled.body.title).toBe('Renamed thread');
    expect(
      (
        await request('member', `/platform/threads/${thread.body.id}`, 'PATCH', {
          version: 1,
          title: 'Stale rename'
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request('member', `/platform/threads/${thread.body.id}/assignees`, 'PATCH', {
          version: 2,
          assigneeIds: [ids.outsider]
        })
      ).status
    ).toBe(422);
    const updated = await request(
      'member',
      `/platform/threads/${thread.body.id}/assignees`,
      'PATCH',
      { version: 2, assigneeIds: [] }
    );
    expect(updated.status).toBe(200);
    expect(updated.body.assigneeIds).toEqual([]);
    await db.delete(comments).where(eq(comments.threadId, thread.body.id));
    await db.delete(threads).where(eq(threads.id, thread.body.id));
    await db.delete(kanbanItems).where(eq(kanbanItems.id, task.body.id));
  });
  test('notifications persist mentions, assignments, watches, read state and delayed email without restricted-thread leaks', async () => {
    const task = await request('admin', `/platform/boards/${boardId}/items`, 'POST', {
      title: 'Notification task',
      markdown: `Hello [@outsider](/members/${ids.outsider})`,
      column: 'todo',
      labels: [],
      position: 0,
      assigneeIds: [ids.member]
    });
    expect(task.status).toBe(200);
    const memberInbox = await request('member', '/notifications');
    expect(memberInbox.body.find((n: any) => n.ownerId === task.body.id).reason).toBe('assignment');
    const mention = (await request('outsider', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id
    );
    expect(mention.reason).toBe('mention');
    expect(mention.actorName).toBe('admin Workflow');
    expect(mention.action).toBe('kanban.created');
    expect(mention.projectName).toBe('Workflow project');
    expect(mention.href).toBe(`/projects/${projectId}/tasks/${task.body.id}`);
    expect(
      (await request('admin', '/notifications')).body.some((n: any) => n.ownerId === task.body.id)
    ).toBe(false);
    expect((await request('member', `/notifications/${mention.id}/read`, 'POST')).status).toBe(404);
    expect((await request('outsider', `/notifications/${mention.id}/read`, 'POST')).status).toBe(
      200
    );
    expect(
      (await request('outsider', '/notifications')).body.find((n: any) => n.id === mention.id)
        .readAt
    ).not.toBeNull();
    await request('outsider', `/notifications/subscriptions/item/${task.body.id}`, 'PUT', {
      watching: true
    });
    await request('admin', `/platform/items/${task.body.id}`, 'PATCH', {
      version: 1,
      title: 'Notification task updated'
    });
    const unread = (await request('outsider', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id && !n.readAt
    );
    expect(unread.reason).toBe('update');
    expect(unread.action).toBe('kanban.updated');
    expect(unread.changedFields).toEqual(['title']);
    expect(
      (
        await request('outsider', '/notifications/preferences', 'PUT', {
          emailEnabled: true,
          emailDelayMinutes: 60
        })
      ).status
    ).toBe(200);
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, ids.outsider));
    expect(await queueNotificationMailBatch()).toBe(0);
    await db
      .update(notifications)
      .set({ createdAt: new Date(Date.now() - 7200000) })
      .where(eq(notifications.id, unread.id));
    expect(await queueNotificationMailBatch()).toBe(1);
    expect(await queueNotificationMailBatch()).toBe(0);
    const mail = await db
      .select()
      .from(mailJobs)
      .where(eq(mailJobs.to, `${ids.outsider}@example.test`));
    expect(mail.some((job) => job.subject === 'KSI: Notification task updated')).toBe(true);
    await request('outsider', '/notifications/read-all', 'POST');
    expect((await request('outsider', '/notifications')).body.every((n: any) => !!n.readAt)).toBe(
      true
    );
    await request('outsider', `/notifications/subscriptions/item/${task.body.id}`, 'PUT', {
      watching: false
    });
    expect(
      (await request('outsider', `/notifications/subscriptions/item/${task.body.id}`)).body.watching
    ).toBe(false);
    const comment = await request('admin', `/platform/items/${task.body.id}/comments`, 'POST', {
      markdown: `A comment for [@outsider](/members/${ids.outsider})`
    });
    expect(comment.status).toBe(200);
    const commentNotification = (await request('outsider', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id && n.action === 'kanban.comment.created'
    );
    expect(commentNotification).toMatchObject({
      actorName: 'admin Workflow',
      projectName: 'Workflow project',
      reason: 'mention',
      title: 'Notification task updated'
    });
    expect(commentNotification.metadata).toBeUndefined();
    const organizationThread = await request('admin', '/platform/threads', 'POST', {
      title: 'Organization context',
      markdown: `Hello [@outsider](/members/${ids.outsider})`,
      visibility: 'association',
      invitedIds: []
    });
    expect(organizationThread.status).toBe(200);
    const organizationNotification = (await request('outsider', '/notifications')).body.find(
      (n: any) => n.ownerId === organizationThread.body.id
    );
    expect(organizationNotification).toMatchObject({
      projectName: null,
      actorName: 'admin Workflow',
      action: 'threads.created'
    });
    await db.delete(comments).where(eq(comments.threadId, organizationThread.body.id));
    await db.delete(threads).where(eq(threads.id, organizationThread.body.id));
    const thread = await request('admin', '/platform/threads', 'POST', {
      title: 'Restricted notification',
      markdown: `Hello [@outsider](/members/${ids.outsider})`,
      visibility: 'leaders',
      invitedIds: []
    });
    expect(thread.status).toBe(200);
    expect(
      (await request('outsider', '/notifications')).body.some(
        (n: any) => n.ownerId === thread.body.id
      )
    ).toBe(false);
    expect(
      (await request('outsider', `/notifications/subscriptions/thread/${thread.body.id}`)).status
    ).toBe(404);
    expect((await request('pending', '/notifications')).status).toBe(403);
    await db.delete(comments).where(eq(comments.threadId, thread.body.id));
    await db.delete(threads).where(eq(threads.id, thread.body.id));
    await db.delete(comments).where(eq(comments.itemId, task.body.id));
    await db.delete(kanbanItems).where(eq(kanbanItems.id, task.body.id));
    await db.delete(mailJobs).where(eq(mailJobs.to, `${ids.outsider}@example.test`));
  });
  test('assignment notifications name changes and automatically watch new assignees', async () => {
    await db
      .insert(projectMembers)
      .values({ projectId, userId: ids.outsider, leader: false })
      .onConflictDoNothing();
    let task = await request('admin', `/platform/boards/${boardId}/items`, 'POST', {
      title: 'Automatic assignment watch',
      markdown: '',
      column: 'todo',
      labels: [],
      position: 0,
      assigneeIds: [ids.member]
    });
    expect(task.status).toBe(200);
    const watching = async (actor: Actor) =>
      (await request(actor, `/notifications/subscriptions/item/${task.body.id}`)).body.watching;
    const change = async (actor: Actor, values: Record<string, unknown>) => {
      task = await request(actor, `/platform/items/${task.body.id}`, 'PATCH', {
        version: task.body.version,
        ...values
      });
      expect(task.status).toBe(200);
    };
    expect(await watching('member')).toBe(true);
    const created = (await request('member', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id
    );
    expect(created.assignedNames).toEqual(['member Workflow']);
    expect(created.unassignedNames).toEqual([]);
    await change('admin', { title: 'Watched update' });
    expect(
      (await request('member', '/notifications')).body.some(
        (n: any) =>
          n.ownerId === task.body.id && n.action === 'kanban.updated' && n.reason === 'update'
      )
    ).toBe(true);
    await request('member', `/notifications/subscriptions/item/${task.body.id}`, 'PUT', {
      watching: false
    });
    await change('admin', { title: 'Keep manual unwatch' });
    expect(await watching('member')).toBe(false);
    await change('member', { assigneeIds: [] });
    const removal = (await request('admin', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id && n.unassignedNames?.includes('member Workflow')
    );
    expect(removal.assignedNames).toEqual([]);
    expect(removal.unassignedNames).toEqual(['member Workflow']);
    await change('member', { assigneeIds: [ids.member, ids.outsider] });
    expect(await watching('member')).toBe(true);
    expect(await watching('outsider')).toBe(true);
    const assignment = (await request('outsider', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id
    );
    expect(assignment.assignedNames).toEqual(['member Workflow', 'outsider Workflow']);
    expect(assignment.reason).toBe('assignment');
    expect(
      (await request('member', '/notifications')).body.some(
        (n: any) => n.ownerId === task.body.id && n.eventId === assignment.eventId
      )
    ).toBe(false);
    await change('admin', { assigneeIds: [ids.outsider] });
    const unassigned = (await request('member', '/notifications')).body.find(
      (n: any) => n.ownerId === task.body.id && n.unassignedNames?.includes('member Workflow')
    );
    expect(unassigned.assignedNames).toEqual([]);
    expect(unassigned.unassignedNames).toEqual(['member Workflow']);
    expect(await watching('member')).toBe(true);
    // Historical assignment details come from each event, even after later assignments change.
    expect(
      (await request('outsider', '/notifications')).body.find((n: any) => n.id === assignment.id)
        .assignedNames
    ).toEqual(['member Workflow', 'outsider Workflow']);
    const thread = await request('admin', '/platform/threads', 'POST', {
      title: 'Assigned discussion',
      markdown: 'Discussion with an assignee',
      projectId,
      visibility: 'association',
      invitedIds: [],
      assigneeIds: [ids.outsider]
    });
    expect(thread.status).toBe(200);
    expect(
      (await request('outsider', `/notifications/subscriptions/thread/${thread.body.id}`)).body
        .watching
    ).toBe(true);
    await db.delete(comments).where(eq(comments.threadId, thread.body.id));
    await db.delete(threads).where(eq(threads.id, thread.body.id));
    await db.delete(kanbanItems).where(eq(kanbanItems.id, task.body.id));
    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, ids.outsider)));
  });
  test('board involvement lists only the caller’s watched, commented and mentioned live tasks', async () => {
    const created = new Set<string>();
    const create = async (title: string, markdown = '') => {
      const task = await request('admin', `/platform/boards/${boardId}/items`, 'POST', {
        title,
        markdown,
        column: 'todo',
        labels: [],
        position: 0
      });
      expect(task.status).toBe(200);
      created.add(task.body.id);
      return task.body as { id: string; version: number };
    };
    const comment = async (actor: Actor, id: string, markdown: string) =>
      expect(
        (await request(actor, `/platform/items/${id}/comments`, 'POST', { markdown })).status
      ).toBe(200);
    const described = await create('Mentioned in description', `[@m](/members/${ids.member})`);
    const discussed = await create('Discussed task');
    // A bare path is not a mention; the comment below is.
    const quiet = await create('Mentioned in a comment', `See /members/${ids.member} later`);
    const archived = await create('Archived mention', `[@m](/members/${ids.member})`);
    await comment('member', discussed.id, 'I can take this');
    await comment('admin', quiet.id, `Thoughts, [@m](/members/${ids.member})?`);
    expect(
      (
        await request('admin', `/platform/items/${archived.id}/archive`, 'POST', {
          version: archived.version
        })
      ).status
    ).toBe(200);
    const involvement = async (actor: Actor) => {
      const response = await request(actor, `/platform/boards/${boardId}/involvement`);
      expect(response.status).toBe(200);
      const mine = (values: string[]) => values.filter((id) => created.has(id)).sort();
      return {
        watching: mine(response.body.watching),
        commented: mine(response.body.commented),
        mentioned: mine(response.body.mentioned)
      };
    };
    expect(await involvement('member')).toEqual({
      watching: [discussed.id],
      commented: [discussed.id],
      mentioned: [described.id, quiet.id].sort()
    });
    expect(await involvement('admin')).toEqual({
      watching: [described.id, discussed.id, quiet.id].sort(),
      commented: [quiet.id],
      mentioned: []
    });
    expect((await request('pending', `/platform/boards/${boardId}/involvement`)).status).toBe(403);
    expect((await request('member', '/platform/boards/missing/involvement')).status).toBe(404);
    await db.delete(comments).where(inArray(comments.itemId, [...created]));
    await db.delete(kanbanItems).where(inArray(kanbanItems.id, [...created]));
  });
  test('deadlines persist UTC dates, issue each reminder once, and stop for completed tasks', async () => {
    const now = new Date('2030-01-01T12:00:00Z');
    const dueAt = new Date(now.getTime() + 6 * 86400000).toISOString();
    const task = await request('admin', `/platform/boards/${boardId}/items`, 'POST', {
      title: 'Deadline task',
      markdown: '',
      column: 'todo',
      labels: [],
      position: 0,
      assigneeIds: [ids.member],
      dueAt
    });
    expect(task.status).toBe(200);
    expect(new Date(task.body.dueAt).toISOString()).toBe(dueAt);
    const first = await Promise.all([queueDeadlineReminders(now), queueDeadlineReminders(now)]);
    expect(first.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(await queueDeadlineReminders(now)).toBe(0);
    for (const days of [4, 5.5, 7])
      expect(await queueDeadlineReminders(new Date(now.getTime() + days * 86400000))).toBe(1);
    const reminders = (await request('member', '/notifications')).body.filter(
      (n: any) => n.ownerId === task.body.id && n.reason === 'deadline'
    );
    expect(reminders).toHaveLength(4);
    const rescheduled = await request('admin', `/platform/items/${task.body.id}`, 'PATCH', {
      version: 1,
      dueAt: new Date(now.getTime() + 13 * 86400000).toISOString()
    });
    expect(rescheduled.status).toBe(200);
    expect(await queueDeadlineReminders(new Date(now.getTime() + 7 * 86400000))).toBe(1);
    expect(
      (
        await request('admin', `/platform/items/${task.body.id}`, 'PATCH', {
          version: 2,
          column: 'done'
        })
      ).status
    ).toBe(200);
    expect(await queueDeadlineReminders(new Date(now.getTime() + 20 * 86400000))).toBe(0);
    const cleared = await request('admin', `/platform/items/${task.body.id}`, 'PATCH', {
      version: 3,
      dueAt: null
    });
    expect(cleared.body.dueAt).toBeNull();
    expect(
      (
        await request('admin', `/platform/items/${task.body.id}`, 'PATCH', {
          version: 4,
          dueAt: 'not-a-date'
        })
      ).status
    ).toBe(422);
    await db.delete(kanbanItems).where(eq(kanbanItems.id, task.body.id));
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.targetId, task.body.id));
    const eventIds = events.map((event) => event.id);
    await db.delete(outbox).where(inArray(outbox.eventId, eventIds));
    await db.delete(auditEvents).where(inArray(auditEvents.id, eventIds));
  });
  test('numeric references share a workspace sequence, resist concurrent allocation, and enforce thread visibility', async () => {
    const [task, thread] = await Promise.all([
      request('member', `/platform/boards/${boardId}/items`, 'POST', {
        title: 'Numbered task',
        markdown: '',
        column: 'todo',
        labels: [],
        position: 0
      }),
      request('member', '/platform/threads', 'POST', {
        projectId,
        title: 'Numbered thread',
        markdown: 'Post',
        visibility: 'members',
        invitedIds: []
      })
    ]);
    expect(task.status).toBe(200);
    expect(thread.status).toBe(200);
    expect(Math.abs(task.body.referenceNumber - thread.body.referenceNumber)).toBe(1);
    const taskLink = await request(
      'member',
      `/platform/references/${projectId}/${task.body.referenceNumber}`
    );
    expect(taskLink.body.href).toBe(`/projects/${projectId}/tasks/${task.body.id}`);
    const threadLink = await request(
      'member',
      `/platform/references/${projectId}/${thread.body.referenceNumber}`
    );
    expect(threadLink.body.href).toBe(`/projects/${projectId}/forum/${thread.body.id}`);
    expect(
      (
        await request(
          'outsider',
          `/platform/references/${projectId}/${thread.body.referenceNumber}`
        )
      ).status
    ).toBe(404);
    const restricted = await request('admin', '/platform/threads', 'POST', {
      title: 'Numbered restricted thread',
      markdown: 'Post',
      visibility: 'leaders',
      invitedIds: []
    });
    expect(
      (
        await request(
          'member',
          `/platform/references/~association/${restricted.body.referenceNumber}`
        )
      ).status
    ).toBe(404);
    expect(
      (
        await request(
          'admin',
          `/platform/references/~association/${restricted.body.referenceNumber}`
        )
      ).status
    ).toBe(200);
    const oldNumber = task.body.referenceNumber;
    await db.delete(kanbanItems).where(eq(kanbanItems.id, task.body.id));
    const next = await request('member', `/platform/boards/${boardId}/items`, 'POST', {
      title: 'Next task',
      markdown: '',
      column: 'todo',
      labels: [],
      position: 0
    });
    expect(next.body.referenceNumber).toBeGreaterThan(oldNumber);
    expect((await request('member', `/platform/references/${projectId}/${oldNumber}`)).status).toBe(
      404
    );
    expect(
      (await request('pending', `/platform/references/${projectId}/${next.body.referenceNumber}`))
        .status
    ).toBe(403);
    for (const record of [thread, restricted]) {
      await db.delete(comments).where(eq(comments.threadId, record.body.id));
      await db.delete(threads).where(eq(threads.id, record.body.id));
    }
    await db.delete(kanbanItems).where(eq(kanbanItems.id, next.body.id));
  });
  test('administrator email changes revoke access and require verification; recovery stays private', async () => {
    const id = createId(),
      email = `${id}@example.test`,
      nextEmail = `next-${id}@example.test`;
    await db.insert(users).values({
      id,
      name: 'Recovery test',
      email,
      emailVerified: true,
      membershipStatus: 'active'
    });
    const sessionId = createId();
    await db.insert(sessions).values({
      id: sessionId,
      token: createId(),
      userId: id,
      expiresAt: new Date(Date.now() + 3600000),
      updatedAt: new Date()
    });
    await db.insert(verifications).values({
      identifier: `reset-password:old-${id}`,
      value: id,
      expiresAt: new Date(Date.now() + 3600000)
    });
    try {
      expect(
        (await request('member', `/users/${id}/email`, 'PATCH', { email: nextEmail })).status
      ).toBe(403);
      expect((await request('member', `/users/${id}/password-reset`, 'POST')).status).toBe(403);
      expect(
        (
          await request('admin', `/users/${id}/email`, 'PATCH', {
            email: `${ids.admin}@example.test`
          })
        ).status
      ).toBe(409);
      const changed = await request('admin', `/users/${id}/email`, 'PATCH', {
        email: nextEmail.toUpperCase()
      });
      expect(changed.status).toBe(200);
      expect(changed.body.email).toBe(nextEmail);
      expect(changed.body.emailVerified).toBe(false);
      expect(await db.select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0);
      expect(await db.select().from(verifications).where(eq(verifications.value, id))).toHaveLength(
        0
      );
      const recovery = await request('admin', `/users/${id}/password-reset`, 'POST');
      expect(recovery.status).toBe(200);
      expect(recovery.body).toEqual({ queued: true });
      expect(await db.select().from(mailJobs).where(eq(mailJobs.to, nextEmail))).toHaveLength(2);
      const [event] = await db.select().from(auditEvents).where(eq(auditEvents.targetId, id));
      expect(JSON.stringify(event!.metadata)).not.toContain(nextEmail);
      await db.update(users).set({ membershipStatus: 'deleted' }).where(eq(users.id, id));
      expect((await request('admin', `/users/${id}/password-reset`, 'POST')).status).toBe(409);
    } finally {
      const events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, id));
      if (events.length)
        await db.delete(outbox).where(
          inArray(
            outbox.eventId,
            events.map((e) => e.id)
          )
        );
      await db.delete(auditEvents).where(eq(auditEvents.targetId, id));
      await db.delete(mailJobs).where(inArray(mailJobs.to, [email, nextEmail]));
      await db.delete(verifications).where(eq(verifications.value, id));
      await db.delete(users).where(eq(users.id, id));
    }
  });
  test('user search lists only active members to active members', async () => {
    expect((await request('pending', '/users/search?q=member%20Workflow')).status).toBe(403);
    expect((await request('member', '/users/search?q=pending%20Workflow')).body).toEqual([]);
    const found = await request('member', '/users/search?q=member%20Workflow');
    expect(found.body.map((user: { id: string }) => user.id)).toContain(ids.member);
  });
  test('workspace rosters protect account data and expose scoped project settings', async () => {
    expect((await request('pending', '/platform/members')).status).toBe(403);
    const roster = await request('member', `/platform/projects/${projectId}/members`);
    expect(roster.status).toBe(200);
    expect(roster.body.find((m: any) => m.id === ids.member).leader).toBe(true);
    for (const path of ['/platform/members', `/platform/members/${ids.member}`]) {
      const result = await request('outsider', path);
      expect(result.status).toBe(200);
      for (const member of Array.isArray(result.body) ? result.body : [result.body]) {
        expect(member.email).toBeUndefined();
        expect(member.flags).toBeUndefined();
      }
    }
    expect((await request('member', `/platform/members/${ids.pending}`)).status).toBe(404);
    const leader = await request('member', `/platform/projects/${projectId}`);
    expect(leader.body.isMember).toBe(true);
    expect(leader.body.canEdit).toBe(true);
    expect(leader.body.canManageMembers).toBe(true);
    expect((await request('admin', `/platform/projects/${projectId}`)).body.canEdit).toBe(true);
    expect((await request('outsider', `/platform/projects/${projectId}`)).body.canEdit).toBe(false);
    expect(
      (
        await request('outsider', `/platform/projects/${projectId}`, 'PATCH', {
          version: leader.body.version,
          name: 'Unauthorized'
        })
      ).status
    ).toBe(403);
    expect(
      (
        await request('member', `/platform/projects/${projectId}`, 'PATCH', {
          version: leader.body.version,
          name: 'Leader-managed project'
        })
      ).status
    ).toBe(200);
    await db
      .update(users)
      .set({ flags: ['-projects.catalog.edit', '-projects.membership.manage'] })
      .where(eq(users.id, ids.member));
    const denied = await request('member', `/platform/projects/${projectId}`);
    expect(denied.body.canEdit).toBe(false);
    expect(denied.body.canManageMembers).toBe(false);
    expect(
      (
        await request('member', `/platform/projects/${projectId}`, 'PATCH', {
          version: denied.body.version,
          name: 'Denied'
        })
      ).status
    ).toBe(403);
    await db.update(users).set({ flags: [] }).where(eq(users.id, ids.member));
  });
  test('internal collaboration rejects article gallery directives', async () => {
    const gallery = ':::gallery preview=1\nfile:abcdefgh\n:::';
    for (const [path, method, body] of [
      [
        `/platform/boards/${boardId}/items`,
        'POST',
        { title: 'Bad gallery', markdown: gallery, column: 'todo', position: 0, labels: [] }
      ],
      [`/platform/items/${itemId}`, 'PATCH', { version: 1, markdown: gallery }],
      [`/platform/items/${itemId}/comments`, 'POST', { markdown: gallery }],
      [
        '/platform/threads',
        'POST',
        {
          title: 'Bad gallery',
          markdown: gallery,
          projectId,
          visibility: 'members',
          invitedIds: []
        }
      ],
      ['/platform/threads/missing/comments', 'POST', { markdown: gallery }]
    ] as const)
      expect((await request('member', path, method, body)).status).toBe(422);
  });
  test('registration notifies administrators and auth profile updates cannot bypass avatar approval', async () => {
    const authHeaders = {
      'content-type': 'application/json',
      'x-ksi-proxy-key': process.env.PROXY_SECRET!,
      'x-ksi-origin': getUrls().frontend.auth,
      origin: getUrls().frontend.auth
    };
    const password = 'DisposableOnly-123456!';
    const signup = await app.handle(
      new Request('http://localhost:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'New workflow member',
          email: signupEmail,
          password,
          image: 'https://example.test/unreviewed.png'
        })
      })
    );
    const [created] = await db.select().from(users).where(eq(users.email, signupEmail));
    signupId = created?.id;
    expect(signup.status).toBe(200);
    expect(created?.membershipStatus).toBe('pending');
    expect(created?.firstName).toBe('New');
    expect(created?.lastName).toBe('workflow member');
    expect(created?.image).toBeNull();
    expect(
      (await request('admin', '/users/inbox')).body.memberships.some(
        (member: any) => member.id === signupId
      )
    ).toBe(true);
    const events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, signupId!));
    expect(events.some((event) => event.action === 'users.membership.requested')).toBe(true);
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, signupId!));
    const signin = await app.handle(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: signupEmail, password })
      })
    );
    expect(signin.status).toBe(200);
    const cookie = signin.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const update = await app.handle(
      new Request('http://localhost:3000/api/auth/update-user', {
        method: 'POST',
        headers: { ...authHeaders, cookie },
        body: JSON.stringify({ image: 'https://example.test/bypass.png', name: 'Board (Zarząd)' })
      })
    );
    expect(update.status).toBe(200);
    const [updated] = await db.select().from(users).where(eq(users.id, signupId!));
    expect(updated?.image).toBeNull();
    expect(updated?.name).not.toBe('Board (Zarząd)');
  });
  test('custom statuses persist and reject foreign statuses and unauthorized changes', async () => {
    const statuses = [
      { id: 'todo', name: 'To do' },
      { id: 'review', name: 'Review', color: '#7766bb' }
    ];
    expect(
      (await request('outsider', `/platform/boards/${boardId}/statuses`, 'PUT', { statuses }))
        .status
    ).toBe(403);
    expect(
      (await request('member', `/platform/boards/${boardId}/statuses`, 'PUT', { statuses })).status
    ).toBe(200);
    expect(
      (await request('member', `/platform/boards?projectId=${projectId}`)).body.statuses
    ).toEqual(statuses);
    expect(
      (
        await request('member', `/platform/boards/${boardId}/items`, 'POST', {
          title: 'Test',
          markdown: '**Description**',
          labels: [],
          column: 'foreign',
          position: 0
        })
      ).status
    ).toBe(422);
    await db
      .insert(kanbanItems)
      .values({ id: itemId, boardId, authorId: ids.member, title: 'Test', column: 'todo' });
    expect(
      (
        await request('member', `/platform/items/${itemId}`, 'PATCH', {
          version: 1,
          column: 'review',
          position: 0
        })
      ).status
    ).toBe(200);
    expect(
      (
        await request('member', `/platform/items/${itemId}`, 'PATCH', {
          version: 1,
          column: 'todo'
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request('member', `/platform/boards/${boardId}/statuses`, 'PUT', {
          statuses: [{ id: 'todo', name: 'To do' }]
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request('member', `/platform/items/${itemId}/comments`, 'POST', {
          markdown: '**Reply**'
        })
      ).status
    ).toBe(200);
    expect(
      (
        await request('outsider', `/platform/items/${itemId}/comments`, 'POST', {
          markdown: 'No access'
        })
      ).status
    ).toBe(403);
    expect((await request('member', `/platform/items/${itemId}/comments`)).body[0].authorName).toBe(
      'member Workflow'
    );
  });
  test('status editing and deletion preserve tombstones and enforce live-task boundaries', async () => {
    const path = `/platform/boards/${boardId}/statuses/review`;
    expect((await request('outsider', path, 'DELETE')).status).toBe(403);
    expect(
      (await request('member', path, 'PATCH', { name: 'Final review', color: '#2244cc' })).status
    ).toBe(200);
    expect((await request('member', path, 'DELETE')).body.code).toBe('STATUS_HAS_LIVE_ITEMS');
    expect((await request('member', path, 'PATCH', { deleted: true })).status).toBe(409);
    const current = (await db.select().from(kanbanItems).where(eq(kanbanItems.id, itemId)))[0]!;
    expect(
      (
        await request('member', `/platform/items/${itemId}/archive`, 'POST', {
          version: current.version
        })
      ).status
    ).toBe(200);
    expect((await request('member', path, 'DELETE')).status).toBe(200);
    const deleted = (
      await request('member', `/platform/boards?projectId=${projectId}`)
    ).body.statuses.find((s: any) => s.id === 'review');
    expect(deleted).toMatchObject({ name: 'Final review', color: '#2244cc', deleted: true });
    expect(
      (
        await request('member', `/platform/boards/${boardId}/items`, 'POST', {
          title: 'No',
          markdown: '',
          column: 'review',
          labels: [],
          position: 0
        })
      ).status
    ).toBe(422);
    expect(
      (
        await request('member', `/platform/items/${itemId}/restore`, 'POST', {
          version: current.version + 1
        })
      ).body.code
    ).toBe('STATUS_DELETED');
    expect((await request('member', path, 'PATCH', { deleted: false })).status).toBe(200);
    expect(
      (
        await request('member', `/platform/items/${itemId}/restore`, 'POST', {
          version: current.version + 1
        })
      ).status
    ).toBe(200);
    expect(
      (await request('member', `/platform/boards/${boardId}/statuses/todo`, 'DELETE')).status
    ).toBe(200);
    expect((await request('member', path, 'DELETE')).status).toBe(422);
  });
  test('attachments of deleted comments and tasks follow their visibility', async () => {
    const [leader] = await db.select().from(users).where(eq(users.id, ids.member));
    const [outsider] = await db.select().from(users).where(eq(users.id, ids.outsider));
    const taskId = createId(),
      commentId = createId();
    await db.insert(kanbanItems).values({
      id: taskId,
      boardId,
      authorId: ids.member,
      title: 'Removed',
      column: 'todo',
      deletedAt: new Date()
    });
    await db.insert(comments).values({
      id: commentId,
      itemId,
      authorId: ids.member,
      markdown: 'x',
      deletedAt: new Date()
    });
    expect((await referenceAccess(db, 'item', taskId, outsider!)).read).toBe(false);
    expect((await referenceAccess(db, 'item', taskId, leader!)).read).toBe(true);
    expect((await referenceAccess(db, 'comment', commentId, leader!)).read).toBe(false);
  });
  test('avatar submissions stay private, preserve current avatar, and reject non-images', async () => {
    expect(
      (await request('pending', '/users/me/avatar-request', 'POST', { fileId: imageId })).status
    ).toBe(403);
    expect(
      (await request('member', '/users/me/avatar-request', 'POST', { fileId: pdfId })).status
    ).toBe(422);
    expect(
      (await request('outsider', '/users/me/avatar-request', 'POST', { fileId: imageId })).status
    ).toBe(422);
    expect(
      (await request('member', '/users/me/avatar-request', 'POST', { fileId: imageId })).status
    ).toBe(200);
    expect((await request('member', '/users/me')).body.user.image).toBe(
      'https://example.invalid/old.webp'
    );
    const [file] = await db.select().from(files).where(eq(files.id, imageId));
    const [admin] = await db.select().from(users).where(eq(users.id, ids.admin));
    const [outsider] = await db.select().from(users).where(eq(users.id, ids.outsider));
    expect(await canReadFile(db, file!, null)).toBe(false);
    expect(await canReadFile(db, file!, admin!)).toBe(true);
    expect(await canReadFile(db, file!, outsider!)).toBe(false);
    expect((await request('member', '/users/inbox')).status).toBe(403);
    expect(
      (await request('admin', '/users/inbox')).body.avatars.some(
        (a: any) => a.userId === ids.member
      )
    ).toBe(true);
  });
  test('avatar replacement invalidates stale approvals; approvals require active admin capability', async () => {
    expect(
      (await request('member', '/users/me/avatar-request', 'POST', { fileId: replacementId }))
        .status
    ).toBe(200);
    const current = (await request('member', '/users/me/avatar-request')).body;
    expect(
      (
        await request('admin', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: true,
          version: 1
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request('member', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: true,
          version: current.version
        })
      ).status
    ).toBe(403);
    await db
      .update(users)
      .set({ flags: ['-users.approvals.*'] })
      .where(eq(users.id, ids.admin));
    expect(
      (
        await request('admin', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: true,
          version: current.version
        })
      ).status
    ).toBe(403);
    await db.update(users).set({ flags: [] }).where(eq(users.id, ids.admin));
    expect(
      (
        await request('admin', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: true,
          version: current.version
        })
      ).status
    ).toBe(200);
    expect((await request('member', '/users/me')).body.user.image).toBe(`/media/${replacementId}`);
    const [file] = await db.select().from(files).where(eq(files.id, replacementId));
    expect(await canReadFile(db, file!, null)).toBe(true);
    expect(
      (
        await request('admin', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: true,
          version: current.version
        })
      ).status
    ).toBe(409);
  });
  test('inbox activation is persistent and prevents duplicate reviews', async () => {
    expect(
      (await request('admin', '/users/inbox')).body.memberships.some(
        (m: any) => m.id === ids.pending
      )
    ).toBe(true);
    expect(
      (await request('admin', `/users/inbox/members/${ids.pending}`, 'POST', { approved: true }))
        .status
    ).toBe(200);
    expect(
      (await request('admin', `/users/inbox/members/${ids.pending}`, 'POST', { approved: false }))
        .status
    ).toBe(409);
  });
  test('profile URL errors describe the expected provider and allow clearing', async () => {
    const response = await request('member', '/users/me', 'PATCH', {
      github: 'https://example.com/member'
    });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_GITHUB_URL');
    expect(response.body.message).toContain('github.com');
    expect(
      (await request('member', '/users/me', 'PATCH', { github: null, linkedin: null })).status
    ).toBe(200);
  });
  test('decline keeps the approved avatar and anonymization removes pending/avatar references while retaining tasks', async () => {
    await request('member', '/users/me/avatar-request', 'POST', { fileId: imageId });
    const pending = (await request('member', '/users/me/avatar-request')).body;
    expect(
      (
        await request('admin', `/users/inbox/avatars/${ids.member}`, 'POST', {
          approved: false,
          version: pending.version
        })
      ).status
    ).toBe(200);
    expect((await request('member', '/users/me')).body.user.image).toBe(`/media/${replacementId}`);
    expect((await request('member', '/users/me/avatar-request')).body.state).toBe('declined');
    await request('member', '/users/me/avatar-request', 'POST', { fileId: imageId });
    expect((await request('member', '/users/me', 'DELETE')).status).toBe(200);
    const [member] = await db.select().from(users).where(eq(users.id, ids.member));
    expect(member?.membershipStatus).toBe('deleted');
    expect(member?.image).toBeNull();
    expect(
      (await db.select().from(kanbanItems).where(eq(kanbanItems.id, itemId)))[0]?.authorId
    ).toBe(ids.member);
    expect(
      (await db.select().from(avatarRequests).where(eq(avatarRequests.userId, ids.member)))[0]
        ?.fileId
    ).toBeNull();
    expect(
      (
        await db
          .select()
          .from(fileReferences)
          .where(inArray(fileReferences.fileId, [imageId, replacementId]))
      ).length
    ).toBe(0);
  });
  test('one account cannot exhaust the realtime ticket pool', async () => {
    const ticket = (actor: Actor) =>
      app.handle(
        new Request('http://localhost:3000/realtime/ticket', {
          method: 'POST',
          headers: {
            'x-ksi-proxy-key': process.env.PROXY_SECRET!,
            'x-ksi-origin': getUrls().frontend.dashboard,
            'x-ksi-session': tokens[actor]
          }
        })
      );
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await ticket('outsider')).status);
    expect(statuses.slice(0, 20)).toEqual(Array(20).fill(200));
    expect(statuses[20]).toBe(429);
    expect((await ticket('admin')).status).toBe(200);
  });
  test('user and approval mutation events include diffs without credential values', async () => {
    const events = await db
      .select()
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, Object.values(ids)));
    for (const event of events) {
      expect(
        Array.isArray(event.metadata.changes),
        `${event.action} has no structured change data`
      ).toBe(true);
      for (const change of event.metadata.changes as any[]) {
        expect([
          'password',
          'token',
          'email',
          'accounts',
          'accessToken',
          'refreshToken',
          'objectKey'
        ]).not.toContain(change.field);
      }
    }
    const accepted = events.find((event) => event.action === 'users.avatar.accepted');
    expect(
      (accepted?.metadata.changes as any[])?.some(
        (change) => change.field === 'image' && change.before !== change.after
      )
    ).toBe(true);
  });
  test('image upload rejects corrupt files before storage', async () => {
    const corrupt = Buffer.alloc(40);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(corrupt);
    corrupt.write('IHDR', 12);
    const form = new FormData();
    form.set('file', new File([corrupt], 'corrupt.png', { type: 'image/png' }));
    const response = await app.handle(
      new Request('http://localhost:3000/files', {
        method: 'POST',
        headers: {
          'x-ksi-proxy-key': process.env.PROXY_SECRET!,
          'x-ksi-origin': getUrls().frontend.dashboard,
          'x-ksi-session': tokens.admin
        },
        body: form
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'IMAGE_CONTENT_INVALID' });
  });
});
