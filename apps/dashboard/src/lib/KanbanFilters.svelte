<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    CalendarClock,
    ListFilter,
    Search,
    SlidersHorizontal,
    Tag,
    UserRoundX,
    Users,
    X
  } from '@lucide/svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import { labelColorStyle } from 'shared/label-colors';
  import Assignees, { type AssignmentMember } from './Assignees.svelte';
  import {
    activeFilterCount,
    emptyTaskFilters,
    normalizeSearchText,
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
  let searchInput = $state<HTMLInputElement>();
  let expanded = $state(false);
  let assigneeQuery = $state('');
  let labelQuery = $state('');

  const active = $derived(activeFilterCount(filters) > 0);
  // The search box stays visible on small screens; the toggle counts the collapsed facets.
  const facetCount = $derived(activeFilterCount({ ...filters, query: '' }));
  const assigneeActive = $derived(filters.assignees.length > 0 || filters.unassigned);
  const labelActive = $derived(filters.labels.length > 0 || filters.unlabeled);

  const fullName = (person: AssignmentMember) =>
    [person.firstName, person.lastName].filter(Boolean).join(' ') || person.nickname || person.id;
  const matches = (text: string, query: string) =>
    normalizeSearchText(text).includes(normalizeSearchText(query.trim()));

  // The current user first, then everyone else by name.
  const people = $derived(
    [...members].sort(
      (a, b) =>
        Number(b.id === userId) - Number(a.id === userId) || fullName(a).localeCompare(fullName(b))
    )
  );
  const matchingPeople = $derived(
    people.filter((person) =>
      matches(`${fullName(person)} ${person.nickname ?? ''}`, assigneeQuery)
    )
  );
  const matchingLabels = $derived(
    // Keep selected labels that no longer exist on the board so they can be unchecked.
    [
      ...labels,
      ...filters.labels
        .filter((name) => !labels.some((label) => label.name === name))
        .map((name) => ({ name }) as FilterLabel)
    ].filter((label) => matches(`${label.name} ${label.description ?? ''}`, labelQuery))
  );

  const summarize = (names: string[]) =>
    names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? '');
  const assigneeNames = $derived(
    filters.assignees.map((id) => {
      const person = members.find((candidate) => candidate.id === id);
      return person ? fullName(person) : id;
    })
  );

  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
</script>

<div class="kanban-filters" role="search" aria-label={'Filtruj zadania'}>
  <div class="filter-search">
    <Search size={15} aria-hidden="true" />
    <input
      bind:this={searchInput}
      type="search"
      bind:value={() => filters.query, onquery}
      placeholder={'Szukaj zadań…'}
      aria-label={'Szukaj zadań'}
      enterkeyhint="search"
    />
    {#if filters.query}
      <button
        type="button"
        class="filter-icon-button"
        aria-label={'Wyczyść wyszukiwanie'}
        title={'Wyczyść wyszukiwanie'}
        onclick={() => {
          onchange({ ...filters, query: '' });
          searchInput?.focus();
        }}><X size={14} aria-hidden="true" /></button
      >
    {/if}
  </div>
  <button
    type="button"
    class="btn btn-outline filters-toggle"
    class:active={facetCount > 0}
    aria-expanded={expanded}
    aria-controls={`${uid}-facets`}
    onclick={() => (expanded = !expanded)}
    ><SlidersHorizontal size={15} aria-hidden="true" />Filtry{#if facetCount}<span
        class="filter-count">{facetCount}</span
      >{/if}</button
  >
  <div id={`${uid}-facets`} class="filter-facets" class:expanded>
    <div class="filter-field" class:active={!!filters.scope}>
      <Dropdown
        label={'Pokaż zadania'}
        value={filters.scope ?? ''}
        leading={scopeIcon}
        onselect={(value) => onchange({ ...filters, scope: (value || null) as TaskScope | null })}
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
      />
    </div>
    <div class="filter-field" class:active={assigneeActive}>
      <Dropdown
        label={'Osoba przypisana'}
        valueContent={assigneeSummary}
        options={[]}
        leading={assigneeIcon}
        panelContent={assigneePanel}
      />
    </div>
    <div class="filter-field" class:active={labelActive}>
      <Dropdown
        label={'Etykieta'}
        valueContent={labelSummary}
        options={[]}
        leading={labelIcon}
        panelContent={labelManagement ?? labelPanel}
        footer={labelActions}
      />
    </div>
    <div class="filter-field" class:active={!!filters.deadline}>
      <Dropdown
        label={'Termin zadania'}
        value={filters.deadline ?? ''}
        leading={deadlineIcon}
        onselect={(value) =>
          onchange({ ...filters, deadline: (value || null) as DeadlineFilter | null })}
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
      />
    </div>
  </div>
  <div class="filter-summary" class:active>
    <span role="status"
      >{#if active && visibleCount === 0}Żadne zadanie nie pasuje do tych filtrów.{:else if active}Wyświetlane:
        {visibleCount}
        z {totalCount}{/if}</span
    >
    {#if active}
      <button
        type="button"
        class="btn btn-outline btn-sm filter-clear"
        onclick={() => onchange({ ...emptyTaskFilters })}
        ><X size={14} aria-hidden="true" />Wyczyść filtry</button
      >
    {/if}
  </div>
</div>

{#snippet assigneeSummary()}
  {#if filters.unassigned}
    <span>Bez przypisania</span>{#if filters.assignees.length}
      +{filters.assignees.length}{/if}
  {:else if assigneeNames.length}
    {summarize(assigneeNames)}
  {:else}
    Osoba przypisana
  {/if}
{/snippet}

{#snippet labelSummary()}
  {#if filters.unlabeled}
    <span>Bez etykiety</span>{#if filters.labels.length}
      +{filters.labels.length}{/if}
  {:else if filters.labels.length}
    {summarize(filters.labels)}
  {:else}
    Etykieta
  {/if}
{/snippet}

{#snippet scopeIcon()}<ListFilter size={15} aria-hidden="true" />{/snippet}
{#snippet assigneeIcon()}<Users size={15} aria-hidden="true" />{/snippet}
{#snippet labelIcon()}<Tag size={15} aria-hidden="true" />{/snippet}
{#snippet deadlineIcon()}<CalendarClock size={15} aria-hidden="true" />{/snippet}

{#snippet assigneePanel()}
  <div class="facet-panel">
    <label class="facet-search">
      <Search size={14} aria-hidden="true" />
      <input
        type="search"
        bind:value={assigneeQuery}
        placeholder={'Szukaj osób…'}
        aria-label={'Szukaj osób'}
      />
    </label>
    <div class="facet-options" role="group" aria-label={'Osoba przypisana'}>
      {#if !assigneeQuery.trim()}
        <label class="facet-option">
          <input
            type="checkbox"
            checked={filters.unassigned}
            onchange={() => onchange({ ...filters, unassigned: !filters.unassigned })}
          />
          <span class="facet-placeholder-avatar" aria-hidden="true"><UserRoundX size={12} /></span>
          <span class="facet-text">Bez przypisania</span>
        </label>
      {/if}
      {#each matchingPeople as person (person.id)}
        <label class="facet-option">
          <input
            type="checkbox"
            checked={filters.assignees.includes(person.id)}
            onchange={() =>
              onchange({ ...filters, assignees: toggle(filters.assignees, person.id) })}
          />
          <Assignees value={[person.id]} {members} readonly showLabel={false} />
          {#if person.id === userId}<small class="facet-hint">Ty</small>{/if}
        </label>
      {:else}
        <p class="facet-empty" role="status">Brak pasujących osób.</p>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet labelPanel()}
  <div class="facet-panel">
    <label class="facet-search">
      <Search size={14} aria-hidden="true" />
      <input
        type="search"
        bind:value={labelQuery}
        placeholder={'Szukaj etykiet…'}
        aria-label={'Szukaj etykiet'}
      />
    </label>
    <div class="facet-options" role="group" aria-label={'Etykieta'}>
      {#if !labelQuery.trim()}
        <label class="facet-option">
          <input
            type="checkbox"
            checked={filters.unlabeled}
            onchange={() => onchange({ ...filters, unlabeled: !filters.unlabeled })}
          />
          <span class="facet-text">Bez etykiety</span>
        </label>
      {/if}
      {#each matchingLabels as label (label.name)}
        <label class="facet-option" title={label.description || label.name}>
          <input
            type="checkbox"
            checked={filters.labels.includes(label.name)}
            onchange={() => onchange({ ...filters, labels: toggle(filters.labels, label.name) })}
          />
          <span class="label-badge" style={labelColorStyle(label.color)}>
            <span class="label-dot"></span>
            <span class="label-name">{label.name}</span>
          </span>
          {#if label.description}<small class="facet-hint">{label.description}</small>{/if}
        </label>
      {:else}
        <p class="facet-empty" role="status">Brak pasujących etykiet.</p>
      {/each}
    </div>
  </div>
{/snippet}

<style>
  .kanban-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    min-width: 0;
  }
  .filter-search {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 200px;
    max-width: 300px;
    min-width: 0;
  }
  .filter-search > :global(svg) {
    position: absolute;
    left: 10px;
    color: var(--muted);
    pointer-events: none;
  }
  .filter-search input {
    width: 100%;
    min-width: 0;
    margin: 0;
    padding-left: 32px;
    padding-right: 30px;
  }
  .filter-search input::-webkit-search-cancel-button {
    display: none;
  }
  .filter-search .filter-icon-button {
    position: absolute;
    right: 4px;
  }
  .filter-icon-button {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .filter-icon-button:hover,
  .filter-icon-button:focus-visible {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .filters-toggle {
    display: none;
  }
  .filter-facets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }
  .filter-field {
    flex: 1 1 150px;
    min-width: 0;
    max-width: 220px;
  }
  .filter-field :global(.dropdown) {
    margin: 0;
  }
  .filter-field.active :global(.dropdown-trigger) {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--input));
    background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  }
  .filter-field.active :global(.dropdown-leading) {
    color: var(--accent);
  }
  .filter-summary {
    display: none;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }
  .filter-summary.active {
    display: flex;
  }
  .filter-clear {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .filter-count {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--radius-full);
    background: var(--accent);
    color: var(--surface);
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1;
  }
  .facet-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .facet-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 -4px 4px;
    padding: 4px 12px 8px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-weight: 400;
  }
  .facet-search input {
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 26px;
    margin: 0;
    padding: 4px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .facet-search input:hover,
  .facet-search input:focus {
    border: 0;
    outline: none;
    box-shadow: none;
  }
  .facet-options {
    display: grid;
    gap: 1px;
    max-height: 300px;
    overflow-y: auto;
    padding: 1px;
  }
  .facet-option {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 34px;
    margin: 0;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    color: var(--ink);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
  }
  .facet-option:hover,
  .facet-option:focus-within {
    background: var(--surface-muted);
  }
  .facet-option input {
    flex-shrink: 0;
    margin: 0;
  }
  .facet-option :global(.assigned) {
    flex: 1;
    min-width: 0;
    flex-wrap: nowrap;
  }
  .facet-text {
    flex: 1;
    min-width: 0;
  }
  .facet-hint {
    min-width: 0;
    margin-left: auto;
    overflow: hidden;
    color: var(--muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .facet-placeholder-avatar {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    border: 1px dashed var(--input);
    border-radius: 50%;
    color: var(--muted);
  }
  .facet-empty {
    margin: 0;
    padding: 12px 8px;
    color: var(--muted);
    font-size: 12px;
  }
  @media (max-width: 760px) {
    .filter-search {
      flex: 1 1 0;
      max-width: none;
    }
    .filters-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      min-height: 34px;
      padding: 6px 10px;
    }
    .filters-toggle.active {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--input));
    }
    .filter-facets {
      display: none;
      flex-basis: 100%;
    }
    .filter-facets.expanded {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .filter-field {
      max-width: none;
    }
    .filter-summary {
      flex-basis: 100%;
      justify-content: space-between;
      margin-left: 0;
    }
  }
</style>
