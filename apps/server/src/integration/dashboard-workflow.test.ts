import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getUrls } from 'shared';
import { digest } from '../domain/sso';
import {
  db,
  users,
  sessions,
  frontendSessions,
  boards,
  kanbanItems,
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
        { title: 'Bad gallery', markdown: gallery, column: 'todo', position: 0, tags: [] }
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
          tags: [],
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
      (await request('member', `/platform/items/${itemId}`, 'DELETE', { version: current.version }))
        .status
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
          tags: [],
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
});
