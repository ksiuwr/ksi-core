<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import { locale } from '$lib/locale.svelte';
  import { ArrowLeft, ArrowUpRight, LayoutDashboard, Plus, Shield } from '@lucide/svelte';
  import {
    Banner,
    Button,
    Card,
    Grid,
    HStack,
    Heading,
    Icon,
    Token,
    VStack
  } from '@astryx-sv/core';
  import FieldTag from '../../../components/ui/FieldTag.svelte';
  import ProjectCover from '../../../components/ui/ProjectCover.svelte';

  let { data, form } = $props<{
    data: import('./$types').PageData;
    form: import('./$types').ActionData;
  }>();
  let project = $derived(data.project);
  let user = $derived(data.user);
  const language = $derived(locale.current);
</script>

<svelte:head><title>{project.name} · KSI UWr</title></svelte:head>

{#snippet backIcon()}
  <Icon icon={ArrowLeft} size="sm" />
{/snippet}

{#snippet shieldIcon()}
  <Icon icon={Shield} size="sm" />
{/snippet}

{#snippet plusIcon()}
  <Icon icon={Plus} size="sm" />
{/snippet}

{#snippet dashboardIcon()}
  <Icon icon={LayoutDashboard} size="sm" />
{/snippet}

{#snippet externalIcon()}
  <Icon icon={ArrowUpRight} size="sm" />
{/snippet}

<VStack as="main" gap={0} paddingBlockStart={6} class="page-container w-full flex-1 pb-20">
  <HStack>
    <Button href="/projects" variant="ghost" size="sm" label="Wszystkie projekty" icon={backIcon} />
  </HStack>

  <Card padding={0} elevation="low" class="mt-4 overflow-hidden">
    <ProjectCover
      slug={project.slug}
      fields={project.fields}
      width={1200}
      height={280}
      class="border-line h-40 border-b sm:h-52 md:h-60"
    />
    <HStack gap={6} vAlign="end" justify="between" wrap="wrap" padding={6} class="md:p-8">
      <VStack gap={3} class="min-w-0 flex-1">
        {#if project.fields?.length}
          <HStack gap={1.5} wrap="wrap">
            {#each project.fields as field (field)}<FieldTag {field} />{/each}
          </HStack>
        {/if}
        <Heading level={1} type="display-1" textWrap="balance">{project.name}</Heading>
        {#if project.tags?.length > 0}
          <HStack gap={1.5} wrap="wrap">
            {#each project.tags as tag (tag)}
              <Token label={`#${tag}`} />
            {/each}
          </HStack>
        {/if}
      </VStack>

      {#if user?.membershipStatus === 'active'}
        <HStack gap={2} wrap="wrap" class="shrink-0">
          {#if data.access.canEdit || data.access.canManageMembers}
            <Button
              href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}/settings`}
              variant="secondary"
              label="Ustawienia projektu"
              icon={shieldIcon}
            />
          {/if}
          {#if !data.access.isMember && !form?.joined}
            <form method="POST" action="?/join">
              <Button type="submit" variant="primary" label="Dołącz do projektu" icon={plusIcon} />
            </form>
          {:else if data.access.isMember}
            <Button
              href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}`}
              variant="primary"
              label="Otwórz przestrzeń projektu"
              icon={dashboardIcon}
            />
          {/if}
        </HStack>
      {/if}
    </HStack>
  </Card>

  {#if form?.joined}
    <Banner
      status="success"
      title={form.requested ? 'Prośba o dołączenie została wysłana.' : 'Dołączono do projektu.'}
      collapsible={false}
      class="mt-4"
    />
  {/if}
  {#if form && 'message' in form}
    <Banner status="error" title={form.message} collapsible={false} role="alert" class="mt-4" />
  {/if}

  <VStack gap={0} maxWidth={896} class="mx-auto w-full">
    {#if project.description}
      <VStack gap={0} class="project-description mt-10">
        <Markdown blocks={data.descriptionBlocks} {language} />
      </VStack>
    {/if}

    {#each project.sections as section (section)}
      <VStack as="section" gap={6} class="border-line mt-12 border-t pt-10">
        {#if section === 'main-article' && project.mainArticle}
          <Heading level={2}>{project.mainArticle.title}</Heading>
          <VStack gap={0} class="project-description">
            <Markdown blocks={data.mainArticleBlocks} {language} />
          </VStack>
        {:else if section === 'articles'}
          <Heading level={2}>Artykuły</Heading>
          <ArticleList articles={project.articles} />
        {:else if section === 'leaders' || section === 'members'}
          <Heading level={2}>
            {#if section === 'leaders'}Liderzy projektu{:else}Członkowie{/if}
          </Heading>
          <Grid columns={{ minWidth: 240, max: 3 }} gap={3}>
            {#each section === 'leaders' ? project.leaders : project.members as member (member.id)}
              <Card padding={3}>
                <MemberPreview {member} href={`/members/${encodeURIComponent(member.id)}`} />
              </Card>
            {/each}
          </Grid>
        {:else if section === 'links'}
          <Heading level={2}>Linki</Heading>
          <HStack gap={2} wrap="wrap">
            {#each project.links as link (link.id)}
              <Button
                href={link.url}
                variant="secondary"
                label={link.label}
                target="_blank"
                rel="noopener noreferrer"
                endContent={externalIcon}
              />
            {/each}
          </HStack>
        {/if}
      </VStack>
    {/each}
  </VStack>
</VStack>

<style>
  :global(.project-description) {
    font-size: 1.0625rem;
    line-height: 1.75;
    color: color-mix(in oklch, var(--ink) 85%, var(--muted));
  }
</style>
