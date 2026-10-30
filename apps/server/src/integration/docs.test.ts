import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createId } from '@paralleldrive/cuid2';
import { eq, inArray } from 'drizzle-orm';
import { getUrls } from 'shared';
import { app } from '../app';
import {
  auditEvents,
  db,
  docFolders,
  docPages,
  docProposals,
  docRevisions,
  frontendSessions,
  outbox,
  projectMembers,
  projects,
  sessions,
  users
} from '../db';
import { digest } from '../domain/sso';

const safe =
  process.env.KSI_ENVIRONMENT === 'integration' &&
  new URL(process.env.DATABASE_URL ?? 'postgres://none@localhost/none').pathname ===
    '/ksi_integration';
const leader = createId();
const member = createId();
const projectId = createId();
const foreignFolderId = createId();
const tokens = { [leader]: createId(), [member]: createId() };

async function request(actor: string | null, path: string, method = 'GET', body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-ksi-proxy-key': process.env.PROXY_SECRET!,
        'x-ksi-origin': getUrls().frontend.dashboard,
        ...(actor ? { 'x-ksi-session': tokens[actor]! } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  );
  return { status: response.status, body: (await response.json()) as any };
}

describe.skipIf(!safe)('documentation folders and translations', () => {
  beforeAll(async () => {
    for (const id of [leader, member]) {
      await db.insert(users).values({
        id,
        name: 'Docs contributor',
        email: `${id}@example.test`,
        membershipStatus: 'active'
      });
      const sessionId = createId();
      const expiresAt = new Date(Date.now() + 3600000);
      await db.insert(sessions).values({
        id: sessionId,
        userId: id,
        token: createId(),
        updatedAt: new Date(),
        expiresAt
      });
      await db.insert(frontendSessions).values({
        id: digest(tokens[id]!),
        sessionId,
        origin: getUrls().frontend.dashboard,
        environment: 'integration',
        expiresAt
      });
    }
    await db.insert(docFolders).values({ id: foreignFolderId, name: 'Other workspace folder' });
    await db.insert(projects).values({ id: projectId, slug: projectId, name: 'Docs project' });
    await db.insert(projectMembers).values({ projectId, userId: leader, leader: true });
  });

  afterAll(async () => {
    await db.delete(docProposals).where(eq(docProposals.projectId, projectId));
    const pages = await db
      .select({ id: docPages.id })
      .from(docPages)
      .where(eq(docPages.projectId, projectId));
    if (pages.length)
      await db.delete(docRevisions).where(
        inArray(
          docRevisions.pageId,
          pages.map((page) => page.id)
        )
      );
    await db.delete(docPages).where(eq(docPages.projectId, projectId));
    await db.delete(docFolders).where(eq(docFolders.projectId, projectId));
    await db.delete(docFolders).where(eq(docFolders.id, foreignFolderId));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, [leader, member]));
    if (events.length)
      await db.delete(outbox).where(
        inArray(
          outbox.eventId,
          events.map((event) => event.id)
        )
      );
    await db.delete(auditEvents).where(inArray(auditEvents.actorId, [leader, member]));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(users).where(inArray(users.id, [leader, member]));
  });

  test('translation suggestions preserve folders, pass review, and keep their full history', async () => {
    const camp = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Camp',
      parentId: null,
      translations: { pl: { name: 'Obóz' } }
    });
    expect(camp.status).toBe(200);
    const schedule = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Schedule',
      parentId: camp.body.id,
      translations: { pl: { name: 'Plan dnia' } }
    });
    expect(schedule.status).toBe(200);
    const source = {
      title: 'Day plan',
      markdown: '## Morning\n\nBreakfast.',
      folderId: schedule.body.id,
      public: true,
      reason: 'First version'
    };
    const created = await request(leader, '/platform/docs', 'POST', {
      ...source,
      projectId,
      slug: 'day-plan'
    });
    expect(created.status).toBe(200);
    const pageId = created.body.id;
    expect(created.body.folder).toBe('Camp/Schedule');
    expect(
      (await request(member, `/platform/docs/${pageId}`, 'PUT', { ...source, version: 1 })).status
    ).toBe(403);

    const translations = { pl: { title: 'Plan dnia', markdown: '## Rano\n\nŚniadanie.' } };
    const proposed = await request(member, '/platform/docs/proposals', 'POST', {
      ...source,
      translations,
      pageId,
      baseVersion: 1,
      reason: 'Add Polish for our members'
    });
    expect(proposed.status).toBe(200);
    expect(
      (
        await request(leader, `/platform/docs/proposals/${proposed.body.id}/resolve`, 'POST', {
          accept: true
        })
      ).status
    ).toBe(200);
    const detail = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=day-plan&locale=pl`
    );
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      folder: 'Obóz/Plan dnia',
      folderId: schedule.body.id,
      title: 'Day plan',
      displayTitle: 'Plan dnia',
      locale: 'pl',
      locales: ['en', 'pl'],
      outdatedLocales: [],
      version: 2
    });
    expect(detail.body.headings[0].id).toBe('rano');
    const revision = await request(member, `/platform/docs/${pageId}/revisions/2`);
    expect(revision.body).toMatchObject({
      folder: 'Camp/Schedule',
      translations,
      previous: { folder: 'Camp/Schedule', translations: {} }
    });
    const credits = detail.body.contributors.find((row: any) => row.user.id === member);
    expect(credits.additions).toBeGreaterThan(0);

    const search = await request(
      member,
      `/platform/docs/search?scope=${projectId}&q=Plan&locale=pl`
    );
    expect(search.status).toBe(200);
    expect(search.body).toContainEqual(
      expect.objectContaining({ reference: 'day-plan', title: 'Plan dnia' })
    );
    const links = await request(member, '/platform/docs/links', 'POST', {
      scope: projectId,
      targets: ['Plan dnia#morning'],
      locale: 'pl'
    });
    expect(links.body['Plan dnia#morning'].href).toBe(
      `/projects/${projectId}/docs/day-plan?lang=pl#rano`
    );
    const sections = await request(
      member,
      `/platform/docs/search?scope=${projectId}&q=day-plan%23&locale=pl`
    );
    expect(sections.body).toContainEqual(
      expect.objectContaining({ reference: 'day-plan#rano', title: 'Rano' })
    );

    const publicPage = await request(null, `/platform/public/docs/${projectId}/day-plan?locale=pl`);
    expect(publicPage.body).toMatchObject({
      title: 'Plan dnia',
      folder: 'Obóz/Plan dnia',
      locale: 'pl',
      locales: ['en', 'pl']
    });
    expect(publicPage.body).not.toHaveProperty('translations');
    const publicIndex = await request(null, '/platform/public/docs?locale=pl');
    const publicSummary = publicIndex.body.find(
      (page: any) => page.projectSlug === projectId && page.slug === 'day-plan'
    );
    expect(publicSummary.folderTrail).toEqual([
      { id: camp.body.id, name: 'Obóz' },
      { id: schedule.body.id, name: 'Plan dnia' }
    ]);
    expect(publicSummary).not.toHaveProperty('markdown');
    expect(publicSummary).not.toHaveProperty('translations');
    expect(
      (
        await request(leader, `/platform/docs/${pageId}`, 'PUT', {
          title: source.title,
          public: source.public,
          reason: 'Add coffee to the schedule',
          version: 2,
          markdown: `${source.markdown}\n\nBring coffee.`
        })
      ).status
    ).toBe(200);
    const outdated = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=day-plan&locale=pl`
    );
    expect(outdated.body.outdatedLocales).toEqual(['pl']);
    expect(outdated.body).toMatchObject({
      folder: 'Obóz/Plan dnia',
      folderId: schedule.body.id,
      translations
    });
  });

  test('title-only translations select their language while the body falls back to English', async () => {
    expect(
      (
        await request(leader, '/platform/docs', 'POST', {
          projectId,
          slug: 'fallback',
          title: 'Guide',
          markdown: 'English body.',
          translations: { pl: { title: 'Poradnik' } },
          public: false,
          reason: ''
        })
      ).status
    ).toBe(200);
    const page = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=fallback&locale=pl`
    );
    expect(page.body).toMatchObject({
      displayTitle: 'Poradnik',
      locale: 'pl',
      locales: ['en', 'pl']
    });
    expect(JSON.stringify(page.body.blocks)).toContain('English body.');
    expect(
      (await request(null, `/platform/public/docs/${projectId}/fallback?locale=pl`)).status
    ).toBe(404);
    const index = await request(null, '/platform/public/docs?locale=pl');
    expect(
      index.body.some((page: any) => page.projectSlug === projectId && page.slug === 'fallback')
    ).toBe(false);
  });
  test('folder tree supports empty bilingual folders, nesting and moves without changing page content', async () => {
    const folder = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Operations',
      parentId: null,
      translations: { pl: { name: 'Organizacja' } }
    });
    expect(folder.status).toBe(200);
    expect(
      (
        await request(member, '/platform/docs/folders', 'POST', {
          projectId,
          name: 'Denied',
          parentId: null
        })
      ).status
    ).toBe(403);
    expect(
      (
        await request(leader, '/platform/docs/folders', 'POST', {
          projectId,
          name: 'operations',
          parentId: null
        })
      ).status
    ).toBe(409);
    const child = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Equipment',
      parentId: folder.body.id
    });
    expect(child.status).toBe(200);
    expect(
      (
        await request(leader, `/platform/docs/folders/${folder.body.id}`, 'PUT', {
          name: 'Operations',
          parentId: child.body.id
        })
      ).body.code
    ).toBe('FOLDER_CYCLE');
    expect(
      (
        await request(leader, `/platform/docs/folders/${child.body.id}`, 'PUT', {
          name: 'Equipment',
          parentId: child.body.id
        })
      ).body.code
    ).toBe('FOLDER_CYCLE');
    const index = await request(member, `/platform/docs?projectId=${projectId}&locale=pl`);
    expect(index.body.folders).toContainEqual(
      expect.objectContaining({ id: child.body.id, parentId: folder.body.id })
    );
    const source = {
      projectId,
      slug: 'movable',
      title: 'Move me',
      markdown: 'The exact text.',
      translations: { pl: { title: 'Przenieś mnie', markdown: 'Dokładna treść.' } },
      public: true,
      reason: ''
    };
    const created = await request(leader, '/platform/docs', 'POST', source);
    expect(created.status).toBe(200);
    const pageId = created.body.id;
    expect(
      (
        await request(member, `/platform/docs/${pageId}/move`, 'POST', {
          folderId: child.body.id,
          version: 1
        })
      ).status
    ).toBe(403);
    expect(
      (
        await request(leader, `/platform/docs/${pageId}/move`, 'POST', {
          folderId: child.body.id,
          version: 99
        })
      ).status
    ).toBe(409);
    expect(
      (
        await request(leader, `/platform/docs/${pageId}/move`, 'POST', {
          folderId: 'missing',
          version: 1
        })
      ).status
    ).toBe(422);
    expect(
      (
        await request(leader, `/platform/docs/${pageId}/move`, 'POST', {
          folderId: foreignFolderId,
          version: 1
        })
      ).body.code
    ).toBe('FOLDER_NOT_FOUND');
    expect(
      (
        await request(leader, '/platform/docs/folders', 'POST', {
          projectId,
          parentId: foreignFolderId,
          name: 'Invalid parent'
        })
      ).body.code
    ).toBe('FOLDER_NOT_FOUND');
    expect(
      (
        await request(leader, `/platform/docs/folders/${foreignFolderId}`, 'PUT', {
          parentId: null,
          name: 'Not permitted'
        })
      ).status
    ).toBe(403);
    const moved = await request(leader, `/platform/docs/${pageId}/move`, 'POST', {
      folderId: child.body.id,
      version: 1
    });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({
      folderId: child.body.id,
      version: 2,
      markdown: source.markdown,
      translations: source.translations,
      public: true
    });
    const revision = await request(member, `/platform/docs/${pageId}/revisions/2`);
    expect(revision.body).toMatchObject({
      folder: 'Operations/Equipment',
      previous: { folder: '' }
    });
    // Renaming and nesting the folder changes current breadcrumbs, preserving identity and historical paths.
    expect(
      (
        await request(leader, `/platform/docs/folders/${child.body.id}`, 'PUT', {
          name: 'Kit',
          translations: { pl: { name: 'Sprzęt' } },
          parentId: null
        })
      ).status
    ).toBe(200);
    const detail = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=movable&locale=pl`
    );
    expect(detail.body).toMatchObject({ folderId: child.body.id, folder: 'Sprzęt', version: 2 });
    expect(
      (await request(null, `/platform/public/docs/${projectId}/movable?locale=pl`)).body.folder
    ).toBe('Sprzęt');
    expect(
      (
        await request(leader, `/platform/docs/${pageId}/move`, 'POST', {
          folderId: null,
          version: 2
        })
      ).body
    ).toMatchObject({ folderId: null, folder: '', version: 3 });
    expect(
      (
        await request(leader, '/platform/docs', 'POST', {
          ...source,
          slug: 'implicit-folder',
          folder: 'New/Implicit'
        })
      ).body.code
    ).toBe('FOLDER_NOT_FOUND');
    expect(
      (
        await request(leader, '/platform/docs/folders', 'POST', {
          projectId,
          parentId: null,
          name: 'New/Implicit'
        })
      ).body.code
    ).toBe('FOLDER_NAME_INVALID');
  });
  test('only reviewers can delete empty folders, with pending destinations and history protected', async () => {
    const parent = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      parentId: null,
      name: 'Deletion parent'
    });
    const child = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      parentId: parent.body.id,
      name: 'Archive'
    });
    const path = `/platform/docs/folders/${child.body.id}`;
    expect((await request(null, path, 'DELETE')).status).toBe(401);
    expect((await request(member, path, 'DELETE')).status).toBe(403);
    expect(
      (await request(leader, `/platform/docs/folders/${foreignFolderId}`, 'DELETE')).status
    ).toBe(403);
    expect(
      (await request(leader, `/platform/docs/folders/${parent.body.id}`, 'DELETE')).body.code
    ).toBe('FOLDER_NOT_EMPTY');
    const source = {
      projectId,
      slug: 'deletion-history',
      folderId: child.body.id,
      title: 'Preserve this page',
      markdown: 'Original English text.',
      translations: { pl: { markdown: 'Oryginalna treść.' } },
      public: false,
      reason: 'Keep history'
    };
    const proposal = await request(member, '/platform/docs/proposals', 'POST', source);
    expect(proposal.status).toBe(200);
    expect((await request(leader, path, 'DELETE')).body.code).toBe('FOLDER_IN_USE');
    expect(
      (
        await request(leader, `/platform/docs/proposals/${proposal.body.id}/resolve`, 'POST', {
          accept: false
        })
      ).status
    ).toBe(200);
    const page = await request(leader, '/platform/docs', 'POST', source);
    expect(page.status).toBe(200);
    expect((await request(leader, path, 'DELETE')).body.code).toBe('FOLDER_NOT_EMPTY');
    expect(
      (
        await request(leader, `/platform/docs/${page.body.id}/move`, 'POST', {
          folderId: null,
          version: 1
        })
      ).status
    ).toBe(200);
    expect((await request(leader, path, 'DELETE')).body).toEqual({ deleted: true });
    expect((await request(leader, path, 'DELETE')).status).toBe(404);
    const index = await request(member, `/platform/docs?projectId=${projectId}`);
    expect(index.body.folders.some((folder: any) => folder.id === child.body.id)).toBe(false);
    const revision = await request(member, `/platform/docs/${page.body.id}/revisions/1`);
    expect(revision.body).toMatchObject({
      folder: 'Deletion parent/Archive',
      markdown: source.markdown,
      translations: source.translations
    });
    const [storedRevision] = await db
      .select()
      .from(docRevisions)
      .where(eq(docRevisions.pageId, page.body.id))
      .orderBy(docRevisions.version);
    expect(storedRevision!.folderId).toBeNull();
    const [storedProposal] = await db
      .select()
      .from(docProposals)
      .where(eq(docProposals.id, proposal.body.id));
    expect(storedProposal).toMatchObject({
      folderId: null,
      folder: 'Deletion parent/Archive',
      state: 'rejected'
    });
    expect(
      (await request(leader, `/platform/docs/folders/${parent.body.id}`, 'DELETE')).status
    ).toBe(200);
    expect(
      (await request(member, `/platform/docs/page?projectId=${projectId}&slug=deletion-history`))
        .body
    ).toMatchObject({ markdown: source.markdown, folderId: null, version: 2 });
  });
});
