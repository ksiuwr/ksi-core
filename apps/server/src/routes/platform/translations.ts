import { contentChanges } from 'shared/activity';
import { status, t } from 'elysia';
import { eq, sql } from 'drizzle-orm';
import { users, projects, articles, articleRevisions, alerts } from '../../db';
import { createElysia, requirePermission } from '../../lib/createElysia';
import { recordEvent } from '../../lib/audit';
import { safeAlertLink } from '../../domain/content-policy';
import { active, scopeFor, requireLeader } from './content';
import { syncFileReferences } from './files';
import {
  articleFileContent,
  hasPrimarySources,
  translationLocales,
  type ContentTranslations,
  type TranslationLocale
} from 'shared/content-locales';

function setTranslation(
  current: ContentTranslations,
  locale: TranslationLocale,
  fields: Record<string, string | string[]>
) {
  const translations = { ...current };
  if (Object.keys(fields).length) translations[locale] = fields;
  else delete translations[locale];
  return translations;
}

export const translationRoutes = createElysia({
  prefix: '/platform/translations',
  protectedRoute: true,
  normalize: false
}).put(
  '/:kind/:id/:locale',
  async ({ db, user, params, body }) => {
    const actor = active(user);
    // Polish lives in the ordinary, required content fields. Optional translations never replace it.
    if (!(translationLocales as readonly string[]).includes(params.locale))
      throw status(422, { code: 'UNSUPPORTED_TRANSLATION_LOCALE' });
    const allowed =
      params.kind === 'profile'
        ? ['firstName', 'lastName', 'nickname', 'bio']
        : params.kind === 'project'
          ? ['name', 'description', 'tags']
          : params.kind === 'alert'
            ? ['title', 'description', 'link']
            : ['title', 'markdown'];
    if (Object.keys(body.fields).some((key) => !allowed.includes(key)))
      throw status(422, { code: 'INVALID_TRANSLATION_FIELDS' });
    const translatedFields = body.fields as Record<string, string | string[]>;
    const limits: Record<string, number> = {
      firstName: 100,
      lastName: 100,
      nickname: 100,
      bio: 5000,
      name: 200,
      description: 10000,
      title: 200,
      link: 2000,
      markdown: 500000
    };
    if (
      Object.entries(translatedFields).some(([key, value]) =>
        key === 'tags'
          ? !Array.isArray(value) || value.some((tag) => !tag.trim() || tag.length > 50)
          : typeof value !== 'string' || value.length > limits[key]!
      )
    )
      throw status(422, { code: 'INVALID_TRANSLATION_FIELDS' });
    if (params.kind === 'alert') {
      requirePermission(actor, 'association.alerts.manage');
      if (
        (typeof translatedFields.description === 'string' &&
          translatedFields.description.length > 2000) ||
        (typeof translatedFields.link === 'string' &&
          translatedFields.link.trim() &&
          !safeAlertLink(translatedFields.link))
      )
        throw status(422, { code: 'INVALID_TRANSLATION_FIELDS' });
    }
    return db.transaction(async (tx) => {
      const [currentActor] = await tx
        .select()
        .from(users)
        .where(eq(users.id, actor.id))
        .for('share');
      active(currentActor ?? null);
      const principal = currentActor!;
      const locale = params.locale as TranslationLocale;
      if (params.kind === 'alert') {
        requirePermission(principal, 'association.alerts.manage');
        const [alert] = await tx
          .select()
          .from(alerts)
          .where(eq(alerts.id, params.id))
          .for('update');
        if (!alert) throw status(404, { code: 'ALERT_NOT_FOUND' });
        if (body.version !== alert.version) throw status(409, { code: 'REVISION_CONFLICT' });
        if (!alert.title.trim() || !hasPrimarySources(alert, translatedFields))
          throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
        const translations = setTranslation(alert.translations, locale, translatedFields);
        const [updated] = await tx
          .update(alerts)
          .set({ translations, version: sql`${alerts.version} + 1` })
          .where(eq(alerts.id, alert.id))
          .returning();
        await recordEvent(tx, {
          actorId: principal.id,
          targetId: alert.id,
          action: 'alerts.translation.updated',
          metadata: {
            locale,
            version: updated!.version,
            changes: contentChanges(alert.translations[locale] ?? {}, translatedFields, allowed)
          }
        });
        return updated;
      }
      if (params.kind === 'profile') {
        const own = params.id === principal.id;
        if (!own) {
          requirePermission(principal, 'users.members.manage-profile');
          if (principal.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
        } else
          for (const field of Object.keys(body.fields))
            requirePermission(
              principal,
              field === 'firstName'
                ? 'users.profile.edit-first-name'
                : field === 'lastName'
                  ? 'users.profile.edit-last-name'
                  : field === 'nickname'
                    ? 'users.profile.edit-nickname'
                    : 'users.profile.edit-bio'
            );
        const [profile] = await tx
          .select()
          .from(users)
          .where(eq(users.id, params.id))
          .for('update');
        if (!profile) throw status(404, { code: 'USER_NOT_FOUND' });
        if (profile.membershipStatus === 'deleted') throw status(409, { code: 'ACCOUNT_DELETED' });
        if (!profile.firstName.trim() && !profile.name.trim())
          throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
        if (!hasPrimarySources(profile, translatedFields))
          throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
        const translations = setTranslation(profile.translations, locale, translatedFields);
        await tx.update(users).set({ translations }).where(eq(users.id, params.id));
        await recordEvent(tx, {
          actorId: principal.id,
          targetId: params.id,
          action: 'users.translation.updated',
          metadata: {
            locale,
            changes: contentChanges(profile.translations[locale] ?? {}, body.fields, allowed)
          }
        });
        return { translations };
      }
      if (params.kind === 'project') {
        // Lock project before scope checks, matching project membership mutations.
        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, params.id))
          .for('update');
        if (!project) throw status(404, { code: 'PROJECT_NOT_FOUND' });
        requireLeader(principal, await scopeFor(tx, project.id), 'projects.catalog.edit');
        if (body.version !== project.version) throw status(409, { code: 'REVISION_CONFLICT' });
        if (!project.name.trim()) throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
        if (
          Array.isArray(translatedFields.tags) &&
          translatedFields.tags.length &&
          translatedFields.tags.length !== project.tags.length
        )
          throw status(422, { code: 'TRANSLATED_TAG_COUNT' });
        if (!hasPrimarySources(project, translatedFields))
          throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
        const translations = setTranslation(project.translations, locale, translatedFields);
        const [updated] = await tx
          .update(projects)
          .set({ translations, version: sql`${projects.version} + 1` })
          .where(eq(projects.id, project.id))
          .returning();
        await recordEvent(tx, {
          actorId: principal.id,
          projectId: project.id,
          targetId: project.id,
          action: 'projects.translation.updated',
          metadata: {
            locale,
            version: updated!.version,
            changes: contentChanges(project.translations[locale] ?? {}, body.fields, allowed)
          }
        });
        return updated;
      }
      const [article] = await tx
        .select()
        .from(articles)
        .where(eq(articles.id, params.id))
        .for('update');
      if (!article) throw status(404, { code: 'ARTICLE_NOT_FOUND' });
      requireLeader(principal, await scopeFor(tx, article.projectId), 'articles.content.publish');
      if (body.version !== article.version) throw status(409, { code: 'REVISION_CONFLICT' });
      if (!article.title.trim() || !article.markdown.trim())
        throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
      if (!hasPrimarySources(article, translatedFields))
        throw status(422, { code: 'PRIMARY_CONTENT_REQUIRED' });
      const translations = setTranslation(article.translations, locale, translatedFields);
      const [updated] = await tx
        .update(articles)
        .set({ translations, version: sql`${articles.version} + 1`, updatedAt: new Date() })
        .where(eq(articles.id, article.id))
        .returning();
      const [revision] = await tx
        .insert(articleRevisions)
        .values({
          articleId: article.id,
          version: updated!.version,
          title: article.title,
          markdown: article.markdown,
          thumbnailFileId: article.thumbnailFileId,
          translations,
          actorId: principal.id
        })
        .returning();
      await syncFileReferences(tx, 'article', article.id, articleFileContent(updated!), principal);
      await syncFileReferences(
        tx,
        'revision',
        revision!.id,
        articleFileContent(updated!),
        principal
      );
      await recordEvent(tx, {
        actorId: principal.id,
        projectId: article.projectId,
        targetId: article.id,
        action: 'articles.translation.updated',
        metadata: {
          locale,
          version: updated!.version,
          changes: contentChanges(article.translations[locale] ?? {}, body.fields, allowed)
        }
      });
      return updated;
    });
  },
  {
    params: t.Object({
      kind: t.Union([
        t.Literal('profile'),
        t.Literal('project'),
        t.Literal('article'),
        t.Literal('alert')
      ]),
      id: t.String(),
      locale: t.String()
    }),
    body: t.Object(
      {
        version: t.Optional(t.Integer({ minimum: 1 })),
        fields: t.Record(
          t.String({ maxLength: 100 }),
          t.Union([
            t.String({ maxLength: 500000 }),
            t.Array(t.String({ minLength: 1, maxLength: 50 }), { maxItems: 30 })
          ]),
          { maxProperties: 10 }
        )
      },
      { additionalProperties: false }
    )
  }
);
