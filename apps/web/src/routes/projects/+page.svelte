<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Search, SearchX, X } from '@lucide/svelte';
  import {
    Button,
    EmptyState,
    Grid,
    HStack,
    Heading,
    Icon,
    SegmentedControl,
    SegmentedControlItem,
    StatusDot,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import { projectFields } from '$lib/project-cover';
  import ProjectCard from '../../components/ui/ProjectCard.svelte';
  import ContactBanner from '../../components/ui/ContactBanner.svelte';

  type Project = {
    slug: string;
    name: string;
    description: string;
    fields: string[];
    tags: string[];
  };

  let { data } = $props<{ data: import('./$types').PageData }>();

  const projects = $derived(
    ((data.projects ?? []) as Project[]).toSorted((a, b) => a.name.localeCompare(b.name))
  );
  // Filters are keyed by value: translated labels are empty while hydrating in production.
  const filters = ['all', 'community', 'engineering', 'research'] as const;
  const counts = $derived(
    Object.fromEntries(
      filters.map((filter) => [
        filter,
        filter === 'all'
          ? projects.length
          : projects.filter((project) => project.fields.includes(filter)).length
      ])
    )
  );
  function fieldLabel(field: string) {
    if (field === 'research') return 'Badania';
    if (field === 'community') return 'Społeczność';
    return 'Inżynieria';
  }
  let query = $state('');
  const activeFilter = $derived(
    (projectFields as readonly string[]).includes(page.url.searchParams.get('field') ?? '')
      ? page.url.searchParams.get('field')!
      : 'all'
  );
  function setFilter(field: string) {
    const url = new URL(page.url);
    if (field === 'all') url.searchParams.delete('field');
    else url.searchParams.set('field', field);
    return goto(url, { noScroll: true, keepFocus: true });
  }
  const filteredProjects = $derived(
    projects.filter(
      (project) =>
        (activeFilter === 'all' || project.fields.includes(activeFilter)) &&
        [project.name, project.description, ...project.fields, ...project.tags]
          .join(' ')
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
  );
</script>

<svelte:head>
  <title>Projekty · KSI UWr</title>
  <meta
    name="description"
    content="Projekty KSI: konferencje, warsztaty programowania, uczenie maszynowe i obliczenia kwantowe."
  />
</svelte:head>

{#snippet searchIcon()}
  <Icon icon={Search} size="sm" color="secondary" />
{/snippet}

{#snippet clearIcon()}
  <Icon icon={X} size="sm" />
{/snippet}

{#snippet emptyIcon()}
  <Icon icon={SearchX} size="lg" color="secondary" />
{/snippet}

<VStack as="main" gap={0} class="flex-1">
  <VStack as="header" gap={4} class="border-line border-b py-14 md:py-20">
    <VStack gap={4} class="page-container w-full">
      <HStack gap={2} vAlign="center">
        <StatusDot variant="accent" label="Nasze działania" />
        <Text type="code" color="secondary" class="tracking-wider uppercase">Nasze działania</Text>
      </HStack>
      <Heading level={1} type="display-1">Projekty w KSI</Heading>
      <Text type="large" color="secondary" class="max-w-xl">
        Oprogramowanie, badania i wydarzenia tworzone przez członków KSI.
      </Text>
    </VStack>
  </VStack>

  <VStack
    as="section"
    id="project-directory"
    gap={5}
    paddingBlock={10}
    class="page-container w-full scroll-mt-20"
  >
    <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
      <HStack gap={0} class="max-w-full overflow-x-auto">
        <SegmentedControl
          label="Filtruj według obszaru"
          size="sm"
          value={activeFilter}
          onChange={(value) => void setFilter(value)}
        >
          {#each filters as filter (filter)}
            <SegmentedControlItem
              value={filter}
              label={`${filter === 'all' ? 'Wszystkie projekty' : fieldLabel(filter)} · ${counts[filter]}`}
            />
          {/each}
        </SegmentedControl>
      </HStack>

      <TextInput
        label="Szukaj projektów..."
        isLabelHidden
        type="text"
        placeholder="Szukaj projektów..."
        bind:value={query}
        startIcon={searchIcon}
        hasClear
        width="100%"
        containerClassName="w-full md:max-w-xs"
      />
    </HStack>

    <Text type="code" color="secondary" aria-live="polite">
      Wyświetlono {filteredProjects.length} z {projects.length} projektów
    </Text>

    {#if filteredProjects.length}
      <Grid columns={{ minWidth: 240, max: 3 }} gap={5}>
        {#each filteredProjects as project (project.slug)}
          <ProjectCard {project} />
        {/each}
      </Grid>
    {:else}
      <EmptyState
        title="Brak pasujących projektów."
        description="Spróbuj innego hasła lub wybierz inną dziedzinę."
        icon={emptyIcon}
      >
        {#snippet actions()}
          <Button
            variant="secondary"
            label="Wyczyść filtry"
            icon={clearIcon}
            onclick={() => {
              query = '';
              void setFilter('all');
            }}
          />
        {/snippet}
      </EmptyState>
    {/if}
  </VStack>

  <VStack gap={0} class="page-container w-full pb-20">
    <ContactBanner />
  </VStack>
</VStack>
