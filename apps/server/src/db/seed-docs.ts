import { and, eq, isNull } from 'drizzle-orm';
import { workspaceFolders } from '../services/doc-folders';
import { docLineChanges, type DocTranslations } from 'shared/docs';
import { db, docFolders, docPages, docProposals, docRevisions } from './index';

// Synthetic documentation showing cross-workspace links, deep outlines, history and review.
const dashboardGuide = `The KSI dashboard is where members plan work, discuss ideas and keep what the association knows. This guide walks through each area. Membership rules live in the [statute] and quick answers are collected in the [faq].

## Getting started

### Signing in

Sign in with your university e-mail or a linked account. New accounts stay **pending** until a board member activates them. See [statute#membership] for who can join.

### Choosing a workspace

Use the workspace picker in the sidebar to switch between the association and individual projects. Every project has the same set of tools.

#### Joining a project

Open projects can be joined with one click. Locked projects send a join request to their leaders.

#### Project roles

Project leaders manage members, settings and reviews. Board members act as leaders in every workspace.

## Kanban

Each workspace has one board. Tasks move between statuses as work progresses.

### Statuses and labels

Leaders can rename statuses, add new ones and define colored labels. Archived tasks keep their history and can be restored.

### Deadlines

Set a deadline on a task to remind its assignees before it is due.

#### Reminder schedule

Assignees and watchers are notified seven days before, one day before and on the day of the deadline.

## Forum

### Thread visibility

Threads can be visible to the whole association, to project members or to leaders only.

### Referencing tasks

Type \`#12\` to link task or thread 12 in the current workspace, \`#zosia/4\` for another project and \`##7\` for the association.

## Documentation

Documentation keeps knowledge that should outlive a single year of the board.

### Linking pages

Write a page name in brackets, such as \`[faq]\`. Add a workspace to link elsewhere: \`[zosia/day-plan]\` becomes [zosia/day-plan]. Add \`#section\` to jump straight to a heading, like [zosia/bus-packing#technical-team].

### Suggesting changes

Every member can suggest an edit. Explain the reason so reviewers understand the context; leaders and reviewers accept or decline it after comparing both versions.

#### What makes a good reason

Say what was wrong or missing and where the new information comes from, for example "Updated after ZOSIA 2026, we ran out of extension cords".

### Public pages

Pages are internal by default. A leader can publish a page on the KSI website, like the [faq].

## Getting help

Ask in the association forum or write to the board.`;

const statute = `A working summary of the statute of Koło Studentów Informatyki (KSI) at the University of Wrocław. The signed document is kept by the board; when in doubt, it prevails.

## General provisions

### Name and seat

The association is called Koło Studentów Informatyki Uniwersytetu Wrocławskiego and operates at the Institute of Computer Science.

### Goals

KSI develops the interests of its members in computer science, supports student projects and integrates the student community.

#### Activities

- organizing lectures, workshops and the winter camp described in [zosia/day-plan],
- running research and engineering projects,
- cooperating with companies and other student organizations.

## Membership

Any student or doctoral candidate of the University of Wrocław may become a member.

### Rights of members

Members may take part in all activities, vote at general meetings and stand for election to the board.

### Duties of members

Members follow this statute and the resolutions of the general meeting.

### Losing membership

Membership ends by resignation, graduation or a resolution of the board.

## The board

### Elections

The general meeting elects the board for one academic year.

### Responsibilities

The board represents KSI, manages its resources and activates new member accounts on the dashboard ([dashboard-guide#signing-in]).

## Amendments

Changes to the statute require a two-thirds majority of the general meeting.`;

const faq = `Answers to the questions we hear most often. Something missing? Suggest a change to this page.

## Membership

### How do I join KSI?

Create an account on the dashboard and ask a board member to activate it. The rules are in the [statute#membership].

### Do I have to study computer science?

No. Every student of the University of Wrocław is welcome.

## Projects

### How do I start a new project?

Describe your idea on the association forum. The board creates the project and assigns its first leaders.

### Can I join more than one project?

Yes, as many as you like.

## Events

### What is ZOSIA?

The winter camp of computer science students, with lectures, workshops and a lot of time together. See [zosia/day-plan] for how a day at the camp looks.`;

const faqPolish = `Odpowiedzi na pytania, które słyszymy najczęściej. Czegoś brakuje? Zaproponuj zmianę tej strony.

## Członkostwo

### Jak dołączyć do KSI?

Załóż konto w panelu i poproś członka zarządu o jego aktywację. Zasady opisuje [statute#membership].

### Czy muszę studiować informatykę?

Nie. Zapraszamy wszystkich studentów Uniwersytetu Wrocławskiego.

## Projekty

### Jak założyć nowy projekt?

Opisz pomysł na forum koła. Zarząd utworzy projekt i wyznaczy jego pierwszych liderów.

### Czy mogę należeć do kilku projektów?

Tak, do dowolnie wielu.

## Wydarzenia

### Czym jest ZOSIA?

Zimowy Obóz Studentów Informatyki: wykłady, warsztaty i mnóstwo czasu spędzonego razem. Zobacz [zosia/day-plan], jak wygląda dzień na obozie.`;

// The English translation predates the clicker batteries, so it shows as outdated.
const dayPlanPolish = (
  version: number
) => `Jak wygląda typowy dzień obozu, żeby kolejni organizatorzy nie musieli odtwarzać planu z pamięci. Wszystko, co z nami jedzie, jest na liście [bus-packing], a ogólne pytania opisuje [association/faq].

## Rano

### 7:30 Śniadanie

Śniadanie trwa do 9:00. Dyżurny organizator sprawdza salę jadalną do 7:15.

### 9:00 Wykłady

Dwa bloki wykładów z przerwą na kawę.

#### Przygotowanie sali

- [ ] Projektor i przejściówki HDMI/USB-C sprawdzone
- [ ] Mikrofony naładowane
- [ ] Laptop do transmisji zalogowany
${version > 1 ? '- [ ] Zapasowe baterie do pilota\n' : ''}

## Po południu

### 13:00 Obiad

### 14:30 Warsztaty i sport

## Wieczór

### 19:00 Kolacja

### 20:30 Wydarzenia wieczorne

### 23:00 Cisza nocna`;

const dayPlan = (
  version: number
) => `How a typical camp day runs, so next year's organizers do not have to rebuild the schedule from memory. Everything that travels with us is listed in the [bus-packing]; general questions are answered in the [association/faq].

## Morning

### 7:30 Breakfast

Breakfast is served until 9:00. The organizer on duty checks the dining room is ready by 7:15.

### 9:00 Lectures

Two lecture blocks with a coffee break in between.

#### Lecture room setup

- [ ] Projector and HDMI/USB-C adapters tested
- [ ] Microphones charged
- [ ] Livestream laptop signed in
${version > 1 ? '- [ ] Spare clicker batteries\n' : ''}
#### Speaker care

Meet speakers at the entrance, show them the room and give them the Wi-Fi password from the [bus-packing#network] kit.

## Afternoon

### 13:00 Lunch

### 14:30 Workshops and sports

Workshops run in parallel with the ski trip. Sign-up sheets are posted after breakfast.

### 17:00 Free time

## Evening

### 19:00 Dinner

### 20:30 Evening events

#### Board games night

#### Quiz

Teams of up to five people. Prizes come from the merchandise box (see [bus-packing#merchandise]).

### 23:00 Quiet hours

## Duty roster

| Role | People | Notes |
| --- | --- | --- |
| Morning duty | 2 | Opens the lecture room |
| Tech | 2 | Owns the AV kit |
| Evening host | 1 | Runs the evening event |

## When something goes wrong

### Power or network outage

Switch the livestream to the mobile hotspot and tell the speaker to continue without slides if needed.

### Medical emergencies

Call 112 first, then the camp coordinator. The first aid kit is listed in [bus-packing#first-aid].`;

const busPacking = (
  version: number
) => `Everything that travels to ZOSIA on the equipment bus. Check items off on a printed copy and update this page when something was missing. The day-by-day schedule is in the [day-plan].

## Before departure

- [ ] Bus booked and driver confirmed
- [ ] Equipment insurance renewed
- [ ] Loading crew of four people confirmed

## Technical team

${
  version > 2
    ? `### Network

- [ ] 2 × Wi-Fi access points
- [ ] 50 m Ethernet cable
- [ ] Router with the camp configuration

### Audio and video

- [ ] 2 × projectors
- [ ] HDMI and USB-C adapters
- [ ] 4 × wireless microphones${version > 1 ? '\n- [ ] 6 × extension cords (5 m)' : ''}`
    : `- [ ] 2 × Wi-Fi access points
- [ ] 50 m Ethernet cable
- [ ] 2 × projectors
- [ ] HDMI and USB-C adapters
- [ ] 4 × wireless microphones${version > 1 ? '\n- [ ] 6 × extension cords (5 m)' : ''}`
}

## Merchandise

### T-shirts

- [ ] Sizes S–XXL, counted against the registration form

### Stickers and badges

- [ ] 300 stickers
- [ ] Name badges and lanyards

## Kitchen and coffee corner

- [ ] Coffee machine
- [ ] Kettle and 200 cups

## First aid

- [ ] First aid kit checked and restocked
- [ ] List of participants with allergies

## After the camp

- [ ] Inventory returned to the storage room
- [ ] Missing items written down on this page`;

type Version = {
  markdown: string;
  translations?: DocTranslations;
  authorId: string;
  reviewerId?: string;
  reason: string;
};

const folderEnglishNames: Record<string, string> = {
  Obóz: 'Camp',
  'Plan dnia': 'Schedule',
  Logistyka: 'Logistics',
  Prelegenci: 'Speakers',
  Poradniki: 'Guides',
  'O KSI': 'About KSI'
};
async function seedFolderPath(projectId: string | null, path: string): Promise<string | null> {
  const folders = await workspaceFolders(db, projectId);
  let parentId: string | null = null;
  for (const name of path.split('/').filter(Boolean)) {
    let folder: typeof docFolders.$inferSelect | undefined = folders.find(
      (item) => item.parentId === parentId && item.name === name
    );
    if (!folder) {
      const [created]: (typeof docFolders.$inferSelect)[] = await db
        .insert(docFolders)
        .values({
          projectId,
          parentId,
          name,
          translations: folderEnglishNames[name] ? { en: { name: folderEnglishNames[name] } } : {}
        })
        .returning();
      folder = created!;
      folders.push(folder);
    }
    parentId = folder.id;
  }
  return parentId;
}

async function seedPage(page: {
  projectId: string | null;
  slug: string;
  title: string;
  folder: string;
  versions: Version[];
  public?: boolean;
}) {
  const { projectId, slug, title, folder, versions } = page;
  const folderId = await seedFolderPath(projectId, folder);
  const isPublic = page.public ?? false;
  const [existing] = await db
    .select({ id: docPages.id })
    .from(docPages)
    .where(
      and(
        projectId ? eq(docPages.projectId, projectId) : isNull(docPages.projectId),
        eq(docPages.slug, slug)
      )
    );
  if (existing) return existing.id;
  return db.transaction(async (tx) => {
    const latest = versions.at(-1)!;
    const day = 24 * 60 * 60 * 1000;
    const createdAt = new Date(Date.now() - versions.length * 9 * day);
    const [created] = await tx
      .insert(docPages)
      .values({
        projectId,
        slug,
        folder,
        folderId,
        title,
        markdown: latest.markdown,
        translations: latest.translations ?? {},
        public: isPublic,
        version: versions.length,
        createdBy: versions[0]!.authorId,
        createdAt,
        updatedAt: new Date(Date.now() - 2 * day)
      })
      .returning();
    for (const [index, version] of versions.entries())
      await tx.insert(docRevisions).values({
        pageId: created!.id,
        version: index + 1,
        folder,
        folderId,
        title,
        markdown: version.markdown,
        translations: version.translations ?? {},
        public: isPublic && index === versions.length - 1,
        authorId: version.authorId,
        reviewerId: version.reviewerId ?? null,
        reason: version.reason,
        createdAt: new Date(createdAt.getTime() + index * 8 * day),
        ...docLineChanges(versions[index - 1] ?? null, version)
      });
    return created!.id;
  });
}

async function seedProposal(values: typeof docProposals.$inferInsert) {
  const [existing] = await db
    .select({ id: docProposals.id })
    .from(docProposals)
    .where(and(eq(docProposals.authorId, values.authorId), eq(docProposals.reason, values.reason)));
  if (!existing)
    await db.insert(docProposals).values({
      ...values,
      folderId: await seedFolderPath(values.projectId ?? null, values.folder ?? '')
    });
}

export async function seedDocs([anna, jan, ewa]: string[], projectIds: Record<string, string>) {
  await seedPage({
    projectId: null,
    slug: 'dashboard-guide',
    title: 'Dashboard guide',
    folder: 'Poradniki',
    versions: [{ markdown: dashboardGuide, authorId: jan!, reason: 'First version of the guide.' }]
  });
  await seedPage({
    projectId: null,
    slug: 'statute',
    title: 'Statut',
    folder: 'O KSI',
    versions: [
      {
        markdown: statute,
        translations: { en: { title: 'Statute' } },
        authorId: anna!,
        reason: 'Summary of the statute adopted in 2025.'
      }
    ]
  });
  await seedPage({
    projectId: null,
    slug: 'faq',
    title: 'Najczęściej zadawane pytania',
    folder: 'O KSI',
    public: true,
    versions: [
      {
        markdown: faqPolish,
        authorId: ewa!,
        reviewerId: jan,
        reason: 'Collected at the open meeting.'
      },
      {
        markdown: faqPolish,
        translations: { en: { title: 'Frequently asked questions', markdown: faq } },
        authorId: ewa!,
        reviewerId: jan,
        reason: 'English version for exchange students.'
      }
    ]
  });
  const zosia = projectIds.zosia!;
  const dayPlanId = await seedPage({
    projectId: zosia,
    slug: 'day-plan',
    title: 'Dzień na ZOSI',
    folder: 'Obóz/Plan dnia',
    versions: [
      {
        markdown: dayPlanPolish(1),
        translations: { en: { title: 'A day at ZOSIA', markdown: dayPlan(1) } },
        authorId: jan!,
        reason: 'Schedule from ZOSIA 2025, also in English.'
      },
      {
        markdown: dayPlanPolish(2),
        translations: { en: { title: 'A day at ZOSIA', markdown: dayPlan(1) } },
        authorId: anna!,
        reason: 'Clickers ran out of batteries on the second day.'
      }
    ]
  });
  await seedPage({
    projectId: zosia,
    slug: 'bus-packing',
    title: 'Bus packing checklist',
    folder: 'Obóz/Logistyka',
    versions: [
      { markdown: busPacking(1), authorId: anna!, reason: 'Checklist used for ZOSIA 2025.' },
      {
        markdown: busPacking(2),
        authorId: ewa!,
        reviewerId: anna,
        reason: 'We were missing extension cords in the lecture room last year.'
      },
      {
        markdown: busPacking(3),
        authorId: jan!,
        reason: 'Split the technical team list into network and AV for the two crews.'
      }
    ]
  });
  await seedProposal({
    projectId: zosia,
    pageId: dayPlanId,
    baseVersion: 2,
    folder: 'Obóz/Plan dnia',
    translations: {
      en: {
        title: 'A day at ZOSIA',
        markdown: dayPlan(2)
          .replace(
            '### 9:00 Lectures',
            '### 8:40 Morning stretch\n\nTen minutes of stretching in the lecture room, led by a volunteer.\n\n### 9:00 Lectures'
          )
          .replace('### 17:00 Free time', '### 17:00 Free time\n\nThe sauna is open until 19:00.')
      }
    },
    title: 'Dzień na ZOSI',
    markdown: dayPlanPolish(2).replace(
      '### 9:00 Wykłady',
      '### 8:40 Poranne rozciąganie\n\nDziesięć minut rozciągania w sali wykładowej, prowadzi je wolontariusz.\n\n### 9:00 Wykłady'
    ),
    public: true,
    reason:
      'Many people asked for a short warm-up before lectures. Also asking to publish this page so participants can check the schedule.',
    authorId: ewa!
  });
  await seedProposal({
    projectId: zosia,
    slug: 'speaker-invitation',
    folder: 'Obóz/Prelegenci',
    title: 'Speaker invitation template',
    markdown:
      'A template for inviting speakers. Send it at least two months before the camp and add the speaker to the [day-plan].\n\n## E-mail\n\n> Dear …,\n>\n> We would like to invite you to give a talk at ZOSIA, the winter camp of computer science students.\n\n## Follow-up\n\n- [ ] Confirm the talk title\n- [ ] Ask about AV needs\n- [ ] Book accommodation',
    public: false,
    reason: 'We write this e-mail from scratch every year.',
    authorId: ewa!
  });
  await seedProposal({
    projectId: null,
    pageId: (
      await db
        .select({ id: docPages.id })
        .from(docPages)
        .where(and(isNull(docPages.projectId), eq(docPages.slug, 'faq')))
    )[0]!.id,
    baseVersion: 2,
    folder: 'O KSI',
    translations: {
      en: {
        title: 'Frequently asked questions',
        markdown: faq.replace(
          '## Projects',
          '### Is there a membership fee?\n\nNo, membership in KSI is free.\n\n## Projects'
        )
      }
    },
    title: 'Najczęściej zadawane pytania',
    markdown: faqPolish.replace(
      '## Projekty',
      '### Czy jest składka członkowska?\n\nNie, członkostwo w KSI jest bezpłatne.\n\n## Projekty'
    ),
    public: true,
    reason: 'Asked twice at the last open meeting.',
    authorId: ewa!
  });
}
