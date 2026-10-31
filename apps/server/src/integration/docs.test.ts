import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createId } from '@paralleldrive/cuid2';
import { eq, inArray } from 'drizzle-orm';
import { getUrls } from 'shared';
import type { PublicDocSummary } from 'shared/public-docs';
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
const pending = createId();
const projectId = createId();
const foreignFolderId = createId();
const tokens = { [leader]: createId(), [member]: createId(), [pending]: createId() };

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
    for (const id of [leader, member, pending]) {
      await db.insert(users).values({
        id,
        name: 'Docs contributor',
        email: `${id}@example.test`,
        membershipStatus: id === pending ? 'pending' : 'active'
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
    await db.delete(users).where(inArray(users.id, [leader, member, pending]));
  });

  test('translation suggestions preserve folders, pass review, and keep their full history', async () => {
    const camp = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Obóz',
      parentId: null,
      translations: { en: { name: 'Camp' } }
    });
    expect(camp.status).toBe(200);
    const schedule = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Plan dnia',
      parentId: camp.body.id,
      translations: { en: { name: 'Schedule' } }
    });
    expect(schedule.status).toBe(200);
    const source = {
      title: 'Plan dnia',
      markdown: '## Rano\n\nŚniadanie.',
      folderId: schedule.body.id,
      public: true,
      reason: 'Pierwsza wersja'
    };
    const created = await request(leader, '/platform/docs', 'POST', {
      ...source,
      projectId,
      slug: 'day-plan'
    });
    expect(created.status).toBe(200);
    const pageId = created.body.id;
    expect(created.body.folder).toBe('Obóz/Plan dnia');
    expect(
      (await request(member, `/platform/docs/${pageId}`, 'PUT', { ...source, version: 1 })).status
    ).toBe(403);

    const translations = { en: { title: 'Day plan', markdown: '## Morning\n\nBreakfast.' } };
    const proposed = await request(member, '/platform/docs/proposals', 'POST', {
      ...source,
      translations,
      pageId,
      baseVersion: 1,
      reason: 'Dodaj angielski dla gości'
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
      `/platform/docs/page?projectId=${projectId}&slug=day-plan&locale=en`
    );
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      folder: 'Camp/Schedule',
      folderId: schedule.body.id,
      title: 'Plan dnia',
      displayTitle: 'Day plan',
      locale: 'en',
      locales: ['pl', 'en'],
      outdatedLocales: [],
      version: 2
    });
    expect(detail.body.headings[0].id).toBe('morning');
    for (const query of ['&locale=pl', '&locale=de', ''])
      expect(
        (await request(member, `/platform/docs/page?projectId=${projectId}&slug=day-plan${query}`))
          .body
      ).toMatchObject({
        folder: 'Obóz/Plan dnia',
        displayTitle: 'Plan dnia',
        locale: 'pl',
        locales: ['pl', 'en']
      });
    const revision = await request(member, `/platform/docs/${pageId}/revisions/2`);
    expect(revision.body).toMatchObject({
      folder: 'Obóz/Plan dnia',
      translations,
      previous: { folder: 'Obóz/Plan dnia', translations: {} }
    });
    const credits = detail.body.contributors.find((row: any) => row.user.id === member);
    expect(credits.additions).toBeGreaterThan(0);

    const search = await request(
      member,
      `/platform/docs/search?scope=${projectId}&q=Day&locale=en`
    );
    expect(search.status).toBe(200);
    expect(search.body).toContainEqual(
      expect.objectContaining({ reference: 'day-plan', title: 'Day plan' })
    );
    // References to the Polish outline resolve within the translated outline.
    const links = await request(member, '/platform/docs/links', 'POST', {
      scope: projectId,
      targets: ['Day plan#rano'],
      locale: 'en'
    });
    expect(links.body['Day plan#rano'].href).toBe(
      `/projects/${projectId}/docs/day-plan?lang=en#morning`
    );
    const sections = await request(
      member,
      `/platform/docs/search?scope=${projectId}&q=day-plan%23&locale=en`
    );
    expect(sections.body).toContainEqual(
      expect.objectContaining({ reference: 'day-plan#morning', title: 'Morning' })
    );

    const publicPage = await request(null, `/platform/public/docs/${projectId}/day-plan?locale=en`);
    expect(publicPage.body).toMatchObject({
      title: 'Day plan',
      folder: 'Camp/Schedule',
      locale: 'en',
      locales: ['pl', 'en']
    });
    expect(publicPage.body).not.toHaveProperty('translations');
    expect(
      (await request(null, `/platform/public/docs/${projectId}/day-plan?locale=pl`)).body
    ).toMatchObject({ title: 'Plan dnia', folder: 'Obóz/Plan dnia', locale: 'pl' });
    const publicIndex = await request(null, '/platform/public/docs?locale=en');
    const publicSummary = publicIndex.body.find(
      (page: any) => page.projectSlug === projectId && page.slug === 'day-plan'
    );
    expect(publicSummary.folderTrail).toEqual([
      { id: camp.body.id, name: 'Camp' },
      { id: schedule.body.id, name: 'Schedule' }
    ]);
    expect(publicSummary).not.toHaveProperty('markdown');
    expect(publicSummary).not.toHaveProperty('translations');
    expect(
      (
        await request(leader, `/platform/docs/${pageId}`, 'PUT', {
          title: source.title,
          public: source.public,
          reason: 'Dodaj kawę do planu',
          version: 2,
          markdown: `${source.markdown}\n\nZabierz kawę.`
        })
      ).status
    ).toBe(200);
    const outdated = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=day-plan&locale=en`
    );
    expect(outdated.body.outdatedLocales).toEqual(['en']);
    expect(outdated.body).toMatchObject({
      folder: 'Camp/Schedule',
      folderId: schedule.body.id,
      translations
    });
  });

  test('title-only translations select their language while the body falls back to Polish', async () => {
    const untranslatable = await request(leader, '/platform/docs', 'POST', {
      projectId,
      slug: 'fallback',
      title: 'Poradnik',
      markdown: ' ',
      translations: { en: { title: 'Guide', markdown: 'English body.' } },
      public: false,
      reason: ''
    });
    expect(untranslatable.status).toBe(422);
    expect(untranslatable.body.code).toBe('PRIMARY_SOURCE_REQUIRED');
    expect(
      (
        await request(leader, '/platform/docs', 'POST', {
          projectId,
          slug: 'fallback',
          title: 'Poradnik',
          markdown: 'Polska treść.',
          translations: { en: { title: 'Guide' } },
          public: false,
          reason: ''
        })
      ).status
    ).toBe(200);
    const page = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=fallback&locale=en-us`
    );
    expect(page.body).toMatchObject({
      displayTitle: 'Guide',
      locale: 'en',
      locales: ['pl', 'en']
    });
    expect(JSON.stringify(page.body.blocks)).toContain('Polska treść.');
    expect(
      (await request(null, `/platform/public/docs/${projectId}/fallback?locale=en`)).status
    ).toBe(404);
    const index = await request(null, '/platform/public/docs?locale=en');
    expect(
      index.body.some((page: any) => page.projectSlug === projectId && page.slug === 'fallback')
    ).toBe(false);
  });
  test('the website shows members-only pages and editing rights to active members alone', async () => {
    for (const page of [
      {
        slug: 'handbook',
        title: 'Podręcznik',
        markdown: 'Przeczytaj [internal-notes].',
        public: true
      },
      { slug: 'internal-notes', title: 'Notatki wewnętrzne', markdown: 'Klucze.', public: false }
    ])
      expect(
        (await request(leader, '/platform/docs', 'POST', { ...page, projectId, reason: '' })).status
      ).toBe(200);
    const internal = `/platform/public/docs/${projectId}/internal-notes?locale=pl`;
    const handbook = `/platform/public/docs/${projectId}/handbook?locale=pl`;
    const listed = async (actor: string | null) =>
      ((await request(actor, '/platform/public/docs?locale=pl')).body as PublicDocSummary[])
        .filter((page) => page.projectSlug === projectId)
        .map((page) => [page.slug, page.public]);
    const linked = async (actor: string | null) =>
      JSON.stringify((await request(actor, handbook)).body.blocks).includes(
        `/docs/${projectId}/internal-notes?lang=pl`
      );

    for (const actor of [null, pending]) {
      expect((await request(actor, internal)).status).toBe(404);
      expect(await listed(actor)).toContainEqual(['handbook', true]);
      expect(await listed(actor)).not.toContainEqual(['internal-notes', false]);
      expect(await linked(actor)).toBe(false);
      expect((await request(actor, handbook)).body.access).toBeNull();
    }
    expect((await request(member, internal)).body).toMatchObject({
      title: 'Notatki wewnętrzne',
      public: false
    });
    expect(await listed(member)).toContainEqual(['internal-notes', false]);
    expect(await linked(member)).toBe(true);
    expect((await request(member, handbook)).body.access).toMatchObject({
      canReview: false,
      canPropose: true
    });
    expect((await request(leader, handbook)).body.access).toMatchObject({ canReview: true });
  });
  test('folder tree supports empty bilingual folders, nesting and moves without changing page content', async () => {
    const folder = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Organizacja',
      parentId: null,
      translations: { en: { name: 'Operations' } }
    });
    expect(folder.status).toBe(200);
    expect(
      (
        await request(member, '/platform/docs/folders', 'POST', {
          projectId,
          name: 'Odmowa',
          parentId: null
        })
      ).status
    ).toBe(403);
    expect(
      (
        await request(leader, '/platform/docs/folders', 'POST', {
          projectId,
          name: 'organizacja',
          parentId: null
        })
      ).status
    ).toBe(409);
    const child = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      name: 'Sprzęt',
      parentId: folder.body.id
    });
    expect(child.status).toBe(200);
    expect(
      (
        await request(leader, `/platform/docs/folders/${folder.body.id}`, 'PUT', {
          name: 'Organizacja',
          parentId: child.body.id
        })
      ).body.code
    ).toBe('FOLDER_CYCLE');
    expect(
      (
        await request(leader, `/platform/docs/folders/${child.body.id}`, 'PUT', {
          name: 'Sprzęt',
          parentId: child.body.id
        })
      ).body.code
    ).toBe('FOLDER_CYCLE');
    const index = await request(member, `/platform/docs?projectId=${projectId}&locale=en`);
    expect(index.body.folders).toContainEqual(
      expect.objectContaining({ id: child.body.id, parentId: folder.body.id })
    );
    const source = {
      projectId,
      slug: 'movable',
      title: 'Przenieś mnie',
      markdown: 'Dokładna treść.',
      translations: { en: { title: 'Move me', markdown: 'The exact text.' } },
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
          name: 'Nieprawidłowy rodzic'
        })
      ).body.code
    ).toBe('FOLDER_NOT_FOUND');
    expect(
      (
        await request(leader, `/platform/docs/folders/${foreignFolderId}`, 'PUT', {
          parentId: null,
          name: 'Niedozwolone'
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
      folder: 'Organizacja/Sprzęt',
      previous: { folder: '' }
    });
    // Renaming and nesting the folder changes current breadcrumbs, preserving identity and historical paths.
    expect(
      (
        await request(leader, `/platform/docs/folders/${child.body.id}`, 'PUT', {
          name: 'Wyposażenie',
          translations: { en: { name: 'Kit' } },
          parentId: null
        })
      ).status
    ).toBe(200);
    const detail = await request(
      member,
      `/platform/docs/page?projectId=${projectId}&slug=movable&locale=en`
    );
    expect(detail.body).toMatchObject({ folderId: child.body.id, folder: 'Kit', version: 2 });
    expect(
      (await request(null, `/platform/public/docs/${projectId}/movable?locale=en`)).body.folder
    ).toBe('Kit');
    expect(
      (await request(null, `/platform/public/docs/${projectId}/movable?locale=pl`)).body.folder
    ).toBe('Wyposażenie');
    expect((await request(member, `/platform/docs/${pageId}/revisions/2`)).body.folder).toBe(
      'Organizacja/Sprzęt'
    );
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
          folder: 'Nowy/Ukryty'
        })
      ).body.code
    ).toBe('FOLDER_NOT_FOUND');
    expect(
      (
        await request(leader, '/platform/docs/folders', 'POST', {
          projectId,
          parentId: null,
          name: 'Nowy/Ukryty'
        })
      ).body.code
    ).toBe('FOLDER_NAME_INVALID');
  });
  test('only reviewers can delete empty folders, with pending destinations and history protected', async () => {
    const parent = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      parentId: null,
      name: 'Do usunięcia'
    });
    const child = await request(leader, '/platform/docs/folders', 'POST', {
      projectId,
      parentId: parent.body.id,
      name: 'Archiwum'
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
      title: 'Zachowaj tę stronę',
      markdown: 'Oryginalna treść.',
      translations: { en: { markdown: 'Original English text.' } },
      public: false,
      reason: 'Zachowaj historię'
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
      folder: 'Do usunięcia/Archiwum',
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
      folder: 'Do usunięcia/Archiwum',
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
