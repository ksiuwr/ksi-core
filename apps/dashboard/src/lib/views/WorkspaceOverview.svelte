<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { invalidateAll } from '$app/navigation';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, threadPath, type Workspace } from '$lib/navigation';
  import { statusColor } from '$lib/status-color';
  import type {
    AssignmentMember,
    BoardData,
    Item,
    Project,
    ProjectAccess,
    Thread
  } from '$lib/types';
  import {
    Banner,
    Button,
    Card,
    EmptyState,
    Heading,
    HStack,
    Icon,
    Link,
    List,
    ListItem,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import {
    ArrowUpRight,
    BookOpen,
    Columns3,
    FileText,
    MessagesSquare,
    Pencil,
    Users
  } from '@lucide/svelte';

  let {
    workspace,
    project,
    access,
    websiteOrigin,
    board,
    items,
    threads,
    threadCount,
    members,
    articleCount,
    docCount
  }: {
    workspace: Workspace;
    project: Project | null;
    access: ProjectAccess;
    websiteOrigin: string;
    board: BoardData | null;
    items: Item[];
    threads: Thread[];
    threadCount: number;
    members: AssignmentMember[];
    articleCount: number;
    docCount: number;
  } = $props();
  const language = $derived(preferences.language);

  const MEMBER_AVATARS = 14;
  const LATEST_TASKS = 6;

  let busy = $state(false);
  let error = $state('');

  const name = $derived(workspace === 'project' ? (project?.name ?? 'Projekt') : 'Całe koło');
  const projectSlug = $derived(project?.slug ?? '');
  const statuses = $derived(board?.statuses ?? []);
  const statusFor = (column: string) => statuses.find((status) => status.id === column);
  const latestTasks = $derived(
    [...items]
      .sort((a, b) => (b.referenceNumber ?? 0) - (a.referenceNumber ?? 0))
      .slice(0, LATEST_TASKS)
  );
  const path = (tab: string) => dashboardPath(workspace, projectSlug, tab);

  async function join() {
    if (!project || busy) return;
    busy = true;
    error = '';
    try {
      await api(`/platform/projects/${project.id}/join`, 'POST');
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={6}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <VStack gap={2}>
      <Heading level={1}>{name}</Heading>
      {#if project?.fields?.length}
        <HStack gap={1.5} wrap="wrap">
          {#each project.fields as field (field)}
            <Token color="green" label={field} />
          {/each}
        </HStack>
      {/if}
    </VStack>
    <HStack gap={2} vAlign="center" wrap="wrap">
      {#if project}
        <Button
          href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          label="Zobacz publiczny projekt"
        >
          {#snippet icon()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
        </Button>
      {/if}
      {#if project && (access.canEdit || access.canManageMembers)}
        <Button href={path('settings')} variant="secondary" label="Ustawienia projektu">
          {#snippet icon()}<Pencil size={15} aria-hidden="true" />{/snippet}
        </Button>
      {/if}
      {#if project && !access.isMember}
        <Button label="Dołącz do projektu" variant="primary" isDisabled={busy} onclick={join} />
      {/if}
    </HStack>
  </HStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <HStack vAlign="start" gap={8} wrap="wrap">
    <VStack gap={6} class="overview-main">
      {#if project?.description}
        <Card padding={5}>
          <MarkdownContent value={project.description} />
        </Card>
      {/if}

      <VStack gap={2}>
        <HStack hAlign="between" vAlign="start" gap={2} wrap="wrap">
          <Heading level={2}>Najnowsze zadania</Heading>
          <Link href={path('board')} type="supporting" color="secondary">Zobacz tablicę</Link>
        </HStack>
        {#if latestTasks.length}
          <List hasDividers edge="outset">
            {#each latestTasks as item (item.id)}
              {@const status = statusFor(item.column)}
              <ListItem
                href={taskPath(workspace, projectSlug, item.referenceNumber ?? item.id)}
                label={item.title}
              >
                {#snippet startContent()}
                  <span class="status-dot" style:--dot={statusColor(status)} aria-hidden="true"
                  ></span>
                {/snippet}
                {#snippet endContent()}
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    {#if item.referenceNumber}
                      <Text type="code">#{item.referenceNumber}</Text>
                    {/if}
                    {#if status}
                      <Text type="supporting">{status.name}</Text>
                    {/if}
                  </HStack>
                {/snippet}
              </ListItem>
            {/each}
          </List>
        {:else}
          <EmptyState isCompact title="Brak zadań" />
        {/if}
      </VStack>

      <VStack gap={2}>
        <HStack hAlign="between" vAlign="start" gap={2} wrap="wrap">
          <Heading level={2}>Ostatnie dyskusje</Heading>
          <Link href={path('forum')} type="supporting" color="secondary">Wszystkie wątki</Link>
        </HStack>
        {#if threads.length}
          <List hasDividers edge="outset">
            {#each threads as thread (thread.id)}
              <ListItem
                href={threadPath(workspace, projectSlug, thread.referenceNumber ?? thread.id)}
                label={thread.title}
              >
                {#snippet startContent()}
                  <Icon icon={MessagesSquare} size="sm" color="secondary" />
                {/snippet}
                {#snippet endContent()}
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    {#if thread.referenceNumber}
                      <Text type="code">#{thread.referenceNumber}</Text>
                    {/if}
                    {#if thread.createdAt}
                      <Text type="supporting">
                        <time datetime={thread.createdAt}
                          >{formatDate(thread.createdAt, language)}</time
                        >
                      </Text>
                    {/if}
                  </HStack>
                {/snippet}
              </ListItem>
            {/each}
          </List>
        {:else}
          <EmptyState isCompact title="Brak wątków" />
        {/if}
      </VStack>
    </VStack>

    <VStack as="aside" gap={6} class="overview-aside">
      <VStack gap={2}>
        <Heading level={2}>Przeglądaj</Heading>
        <List density="compact">
          <ListItem href={path('board')} label="Kanban">
            {#snippet startContent()}<Icon icon={Columns3} size="sm" color="secondary" />{/snippet}
            {#snippet endContent()}<Text type="supporting">{items.length}</Text>{/snippet}
          </ListItem>
          <ListItem href={path('forum')} label="Forum">
            {#snippet startContent()}
              <Icon icon={MessagesSquare} size="sm" color="secondary" />
            {/snippet}
            {#snippet endContent()}<Text type="supporting">{threadCount}</Text>{/snippet}
          </ListItem>
          <ListItem href={path('articles')} label="Artykuły">
            {#snippet startContent()}<Icon icon={FileText} size="sm" color="secondary" />{/snippet}
            {#snippet endContent()}<Text type="supporting">{articleCount}</Text>{/snippet}
          </ListItem>
          <ListItem href={path('docs')} label="Dokumentacja">
            {#snippet startContent()}<Icon icon={BookOpen} size="sm" color="secondary" />{/snippet}
            {#snippet endContent()}<Text type="supporting">{docCount}</Text>{/snippet}
          </ListItem>
          <ListItem href={path('roster')} label="Członkowie">
            {#snippet startContent()}<Icon icon={Users} size="sm" color="secondary" />{/snippet}
            {#snippet endContent()}<Text type="supporting">{members.length}</Text>{/snippet}
          </ListItem>
        </List>
      </VStack>

      {#if members.length}
        <VStack gap={2}>
          <Heading level={2}>Członkowie</Heading>
          <HStack gap={1.5} wrap="wrap">
            {#each members.slice(0, MEMBER_AVATARS) as member (member.id)}
              <MemberPreview
                {member}
                href={`/members/${encodeURIComponent(member.id)}`}
                avatarOnly
                size={30}
              />
            {/each}
          </HStack>
          {#if members.length > MEMBER_AVATARS}
            <Link href={path('roster')} type="supporting" color="secondary">
              Pokaż więcej (+{members.length - MEMBER_AVATARS})
            </Link>
          {/if}
        </VStack>
      {/if}

      {#if workspace === 'project' && access.canEdit}
        <VStack gap={2}>
          <Heading level={2}>Strona publiczna</Heading>
          <Text as="p" type="supporting">
            Aby wybrać artykuł wyświetlany na publicznej stronie projektu, otwórz artykuł, zaznacz
            „Główny artykuł projektu” i opublikuj go.
          </Text>
          <HStack>
            <Button
              href={path('articles')}
              variant="secondary"
              size="sm"
              label="Zarządzaj artykułami"
            />
          </HStack>
        </VStack>
      {/if}
    </VStack>
  </HStack>
</VStack>

<style>
  :global(.overview-main) {
    flex: 1 1 34rem;
    min-width: 0;
  }
  :global(.overview-aside) {
    flex: 0 1 18rem;
    min-width: 0;
    position: sticky;
    top: 5.625rem;
  }
  @media (max-width: 61.25rem) {
    :global(.overview-aside) {
      flex-basis: 100%;
      position: static;
    }
  }
</style>
