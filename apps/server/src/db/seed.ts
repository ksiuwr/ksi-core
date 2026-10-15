import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { getUrls } from 'shared';
import {
  db,
  users,
  projects,
  projectMembers,
  articles,
  articleRevisions,
  articleContributors,
  boards
} from './index';
import { auth } from '../lib/auth';
import { sectionTypes } from '../domain/projects';
export async function seed() {
  if (getUrls().environment === 'production') throw new Error('PRODUCTION_SEED_FORBIDDEN');
  const password = Bun.env.KSI_SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('KSI_SEED_PASSWORD_MIN_12');
  const samples = [
    {
      email: 'anna@example.test',
      name: 'Anna Kowalska',
      firstName: 'Anna',
      lastName: 'Kowalska',
      role: 'administrator' as const
    },
    {
      email: 'jan@example.test',
      name: 'Jan Nowak',
      firstName: 'Jan',
      lastName: 'Nowak',
      role: 'board' as const
    },
    {
      email: 'ewa@example.test',
      name: 'Ewa Wiśniewska',
      firstName: 'Ewa',
      lastName: 'Wiśniewska',
      role: 'member' as const
    }
  ];
  const identities: string[] = [];
  for (const sample of samples) {
    let [user] = await db.select().from(users).where(eq(users.email, sample.email));
    if (!user) {
      const result = await auth.api.signUpEmail({
        body: { email: sample.email, name: sample.name, password }
      });
      [user] = await db
        .update(users)
        .set({ ...sample, membershipStatus: 'active', emailVerified: true })
        .where(eq(users.id, result.user.id))
        .returning();
    }
    identities.push(user!.id);
  }
  const catalog = [
    {
      slug: 'krasnal',
      name: 'Krasnal',
      fields: ['research', 'engineering'],
      description: 'A Transformer-based chess engine exploring how neural networks learn to play.',
      translations: {
        pl: {
          description:
            'Badamy, jak sieci neuronowe uczą się grać, tworząc silnik szachowy oparty na Transformerach.'
        }
      }
    },
    {
      slug: 'zosia',
      name: 'ZOSIA',
      fields: ['community'],
      description: 'The Winter Computer Science Student Camp: talks and time together.',
      translations: {
        pl: {
          description: 'Zimowy Obóz Studentów Informatyki. Wykłady i czas spędzony razem.'
        }
      }
    },
    {
      slug: 'hoc',
      name: 'Hour of Code',
      fields: ['community', 'engineering'],
      description: 'Introducing children to the world of programming.',
      translations: { pl: { description: 'Wprowadzamy dzieci w świat programowania.' } }
    },
    {
      slug: 'ket',
      name: 'KET',
      fields: ['research'],
      description: 'From qubits to algorithms on real quantum computers.',
      translations: {
        pl: { description: 'Od kubitów do algorytmów na prawdziwych komputerach kwantowych.' }
      }
    },
    {
      slug: 'physarum',
      name: 'Physarum',
      fields: ['research'],
      description: 'Biological inspirations for neural networks.',
      translations: { pl: { description: 'Inspiracje biologiczne dla sieci neuronowych.' } }
    }
  ];
  for (const sample of catalog) {
    await db.transaction(async (tx) => {
      let [project] = await tx.select().from(projects).where(eq(projects.slug, sample.slug));
      if (!project) {
        [project] = await tx
          .insert(projects)
          .values({ ...sample, layout: sectionTypes.map((type) => ({ type, hidden: false })) })
          .returning();
      }
      for (const [index, userId] of identities.entries())
        await tx
          .insert(projectMembers)
          .values({ projectId: project!.id, userId, leader: index === 0 })
          .onConflictDoNothing();
      await tx
        .insert(boards)
        .values({
          projectId: project!.id,
          scopeKey: project!.id,
          tags: ['research', 'engineering']
        })
        .onConflictDoNothing();
      const articleSlug = `${sample.slug}-introduction`;
      const [existing] = await tx.select().from(articles).where(eq(articles.slug, articleSlug));
      if (!existing) {
        const id = createId();
        const markdown = `# ${sample.name}\n\n${sample.description}\n\n## Join us\n\nWe create, learn and explore together.`;
        const translations = {
          pl: {
            markdown: `# ${sample.name}\n\n${sample.translations.pl.description}\n\n## Dołącz do nas\n\nRazem tworzymy, uczymy się i odkrywamy.`
          }
        };
        await tx.insert(articles).values({
          id,
          projectId: project!.id,
          slug: articleSlug,
          title: sample.name,
          markdown,
          language: 'en',
          translations,
          state: 'published',
          publishedAt: new Date(),
          mainArticle: true,
          projectFeed: true,
          websiteFeed: true,
          createdBy: identities[0]!
        });
        await tx.insert(articleRevisions).values({
          articleId: id,
          version: 1,
          title: sample.name,
          markdown,
          translations,
          actorId: identities[0]!
        });
        await tx
          .insert(articleContributors)
          .values({ articleId: id, userId: identities[0]!, publicCredit: true });
      }
    });
  }
  await db
    .insert(boards)
    .values({ scopeKey: 'association', tags: ['community', 'engineering', 'research'] })
    .onConflictDoNothing();
  console.log('Synthetic seed complete; existing records preserved.');
}
if (import.meta.main) await seed();
