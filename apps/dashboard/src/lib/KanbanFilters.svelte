<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    CalendarClock,
    ListFilter,
    Search,
    SlidersHorizontal,
    Tag,
    Users,
    X
  } from '@lucide/svelte';
  import {
    Badge,
    Button,
    HStack,
    MultiSelector,
    Section,
    Selector,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import type { AssignmentMember } from './Assignees.svelte';
  import {
    activeFilterCount,
    emptyTaskFilters,
    type DeadlineFilter,
    type TaskFilters,
    type TaskScope
  } from './task-filters';

  type FilterLabel = { name: string; color?: string; description?: string };

  let {
    filters,
    members,
    labels,
    userId = '',
    visibleCount,
    totalCount,
    onchange,
    onquery,
    labelManagement,
    labelActions
  }: {
    filters: TaskFilters;
    members: AssignmentMember[];
    labels: FilterLabel[];
    userId?: string;
    visibleCount: number;
    totalCount: number;
    /** Apply a filter change immediately. */
    onchange: (filters: TaskFilters) => void;
    /** The search text changed while typing. */
    onquery: (query: string) => void;
    /** Replaces the label checklist while labels are being managed. */
    labelManagement?: Snippet<[close: () => void]>;
    labelActions?: Snippet<[close: () => void]>;
  } = $props();

  const uid = $props.id();
  let expanded = $state(false);

  const active = $derived(activeFilterCount(filters) > 0);
  // The search box stays visible on small screens; the toggle counts the collapsed facets.
  const facetCount = $derived(activeFilterCount({ ...filters, query: '' }));
  const assigneeActive = $derived(filters.assignees.length > 0 || filters.unassigned);
  const labelActive = $derived(filters.labels.length > 0 || filters.unlabeled);

  const fullName = (person: AssignmentMember) =>
    [person.firstName, person.lastName].filter(Boolean).join(' ') || person.nickname || person.id;
  // The current user first, then everyone else by name.
  const people = $derived(
    [...members].sort(
      (a, b) =>
        Number(b.id === userId) - Number(a.id === userId) || fullName(a).localeCompare(fullName(b))
    )
  );
  const assigneeOptions = $derived([
    { value: '__unassigned__', label: 'Bez przypisania' },
    ...people.map((person) => ({ value: person.id, label: fullName(person) }))
  ]);
  const assigneeValue = $derived([
    ...(filters.unassigned ? ['__unassigned__'] : []),
    ...filters.assignees
  ]);
  const labelOptions = $derived([
    { value: '__unlabeled__', label: 'Bez etykiety' },
    // Keep selected labels that no longer exist on the board so they can be unchecked.
    ...[
      ...labels,
      ...filters.labels
        .filter((name) => !labels.some((label) => label.name === name))
        .map((name) => ({ name }) as FilterLabel)
    ].map((label) => ({ value: label.name, label: label.name, description: label.description }))
  ]);
  const labelValue = $derived([...(filters.unlabeled ? ['__unlabeled__'] : []), ...filters.labels]);

  function changeAssignees(next: string[]) {
    onchange({
      ...filters,
      unassigned: next.includes('__unassigned__'),
      assignees: next.filter((value) => value !== '__unassigned__')
    });
  }
  function changeLabels(next: string[]) {
    onchange({
      ...filters,
      unlabeled: next.includes('__unlabeled__'),
      labels: next.filter((value) => value !== '__unlabeled__')
    });
  }
</script>

{#snippet SearchIcon()}<Search size={15} aria-hidden="true" />{/snippet}

<VStack as="search" gap={3} class="kanban-filters" aria-label="Filtruj zadania">
  <HStack gap={2} vAlign="center" wrap="wrap">
    <VStack gap={0} class="filter-search">
      <TextInput
        label="Szukaj zadań"
        isLabelHidden
        type="text"
        bind:value={() => filters.query, onquery}
        placeholder="Szukaj zadań…"
        hasClear
      >
        {#snippet startIcon()}<SearchIcon />{/snippet}
      </TextInput>
    </VStack>

    <Button
      variant="secondary"
      label="Filtry"
      class="filters-toggle"
      aria-expanded={expanded}
      aria-controls={`${uid}-facets`}
      onclick={() => (expanded = !expanded)}
    >
      {#snippet icon()}<SlidersHorizontal size={15} aria-hidden="true" />{/snippet}
      {#snippet endContent()}
        {#if facetCount}<Badge label={String(facetCount)} variant="neutral" />{/if}
      {/snippet}
    </Button>

    <HStack
      gap={2}
      wrap="wrap"
      id={`${uid}-facets`}
      class={`filter-facets${expanded ? ' expanded' : ''}`}
    >
      <HStack gap={2} wrap="wrap">
        <VStack gap={0} class={`filter-field${filters.scope ? ' active' : ''}`}>
          <Selector
            label="Pokaż zadania"
            isLabelHidden
            value={filters.scope ?? ''}
            options={[
              { value: '', label: 'Wszystkie zadania' },
              {
                value: 'assigned',
                label: 'Przypisane do Ciebie',
                description: 'Jesteś wśród przypisanych osób'
              },
              {
                value: 'authored',
                label: 'Utworzone przez Ciebie',
                description: 'Zadanie utworzone przez Ciebie'
              },
              {
                value: 'involves',
                label: 'Z Twoim udziałem',
                description:
                  'Przypisane do Ciebie lub utworzone przez Ciebie, z Twoim komentarzem, wzmianką o Tobie lub obserwowane przez Ciebie'
              },
              {
                value: 'relevant',
                label: 'Istotne',
                description: 'Z Twoim udziałem lub otwarte i wciąż bez przypisanej osoby'
              }
            ]}
            onChange={(value: string) =>
              onchange({ ...filters, scope: (value || null) as TaskScope | null })}
          >
            {#snippet startIcon()}<ListFilter size={15} aria-hidden="true" />{/snippet}
          </Selector>
        </VStack>

        <VStack gap={0} class={`filter-field${assigneeActive ? ' active' : ''}`}>
          <MultiSelector
            label="Osoba przypisana"
            isLabelHidden
            placeholder="Osoba przypisana"
            options={assigneeOptions}
            value={assigneeValue}
            onChange={changeAssignees}
            triggerDisplay="labels"
            hasSearch
            searchPlaceholder="Szukaj osób…"
            hasClear
          >
            {#snippet startIcon()}<Users size={15} aria-hidden="true" />{/snippet}
          </MultiSelector>
        </VStack>

        <VStack gap={0} class={`filter-field${labelActive ? ' active' : ''}`}>
          <MultiSelector
            label="Etykieta"
            isLabelHidden
            placeholder="Etykieta"
            options={labelOptions}
            value={labelValue}
            onChange={changeLabels}
            triggerDisplay="labels"
            hasSearch
            searchPlaceholder="Szukaj etykiet…"
            hasClear
          >
            {#snippet startIcon()}<Tag size={15} aria-hidden="true" />{/snippet}
          </MultiSelector>
        </VStack>

        <VStack gap={0} class={`filter-field${filters.deadline ? ' active' : ''}`}>
          <Selector
            label="Termin zadania"
            isLabelHidden
            value={filters.deadline ?? ''}
            options={[
              { value: '', label: 'Dowolny termin' },
              {
                value: 'overdue',
                label: 'Po terminie',
                description: 'Termin minął, a zadanie nie jest ukończone'
              },
              { value: 'today', label: 'Termin dzisiaj' },
              { value: 'week', label: 'Termin w ciągu 7 dni' },
              { value: 'month', label: 'Termin w ciągu 30 dni' },
              { value: 'dated', label: 'Z terminem' },
              { value: 'undated', label: 'Bez terminu' }
            ]}
            onChange={(value: string) =>
              onchange({ ...filters, deadline: (value || null) as DeadlineFilter | null })}
          >
            {#snippet startIcon()}<CalendarClock size={15} aria-hidden="true" />{/snippet}
          </Selector>
        </VStack>
      </HStack>
    </HStack>

    {#if active}
      <HStack gap={2} vAlign="center" class="filter-summary">
        <Text type="supporting" color="secondary" role="status">
          {#if visibleCount === 0}
            Żadne zadanie nie pasuje do tych filtrów.
          {:else}
            Wyświetlane: {visibleCount} z {totalCount}
          {/if}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          label="Wyczyść filtry"
          onclick={() => onchange({ ...emptyTaskFilters })}
        >
          {#snippet icon()}<X size={14} aria-hidden="true" />{/snippet}
        </Button>
      </HStack>
    {/if}
  </HStack>

  {#if labelManagement}
    <Section variant="muted" padding={3}>
      {@render labelManagement(() => {})}
    </Section>
  {/if}
  {#if labelActions}
    <HStack gap={2} wrap="wrap">
      {@render labelActions(() => {})}
    </HStack>
  {/if}
</VStack>

<style>
  :global(.kanban-filters) {
    margin-bottom: var(--spacing-4);
    min-width: 0;
  }
  :global(.filter-search) {
    flex: 1 1 200px;
    max-width: 300px;
    min-width: 0;
  }
  :global(.filter-facets) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
    min-width: 0;
  }
  :global(.filter-field) {
    flex: 1 1 150px;
    min-width: 0;
    max-width: 220px;
  }
  :global(.filter-field.active) {
    --field-active: 1;
  }
  :global(.filter-summary) {
    margin-left: auto;
  }
  :global(.filters-toggle) {
    display: none !important;
  }
  @media (max-width: 760px) {
    :global(.filter-search) {
      flex: 1 1 0;
      max-width: none;
    }
    :global(.filters-toggle) {
      display: inline-flex !important;
    }
    :global(.filter-facets) {
      display: none !important;
      flex-basis: 100%;
    }
    :global(.filter-facets.expanded) {
      display: flex !important;
    }
    :global(.filter-field) {
      max-width: none;
    }
    :global(.filter-summary) {
      flex-basis: 100%;
      margin-left: 0;
      justify-content: space-between;
    }
  }
</style>
