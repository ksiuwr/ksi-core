<script lang="ts">
  import { formatDateTime } from 'shared/format';
  import { preferences } from './preferences.svelte.js';
  import { untrack } from 'svelte';
  import { ChevronDown, ArrowRight, FileDiff, Minus, Plus } from '@lucide/svelte';
  import Dropdown from './Dropdown.svelte';
  import { hasContentChange, type ContentChange } from 'shared/activity';
  import { activityDiffRows } from 'shared/activity-diff';
  let {
    changes,
    initiallyExpanded = false
  }: {
    changes: ContentChange[];
    initiallyExpanded?: boolean;
  } = $props();
  const language = $derived(preferences.language);
  const uid = $props.id();
  let expanded = $state<number[]>(untrack(() => (initiallyExpanded ? [0] : [])));
  let visibleLines = $state<Record<number, number>>({});
  let layout = $state('split');
  const options = $derived([
    { value: 'split', label: 'Obok siebie' },
    { value: 'unified', label: 'Widok łączony' }
  ]);
  const validChanges = $derived(
    changes.filter(
      (change) =>
        change && typeof change.field === 'string' && hasContentChange(change.before, change.after)
    )
  );
  const names: Record<string, string> = {
    statuses: 'Statusy tablicy',
    layout: 'Układ strony',
    links: 'Linki',
    leaderIds: 'Liderzy',
    member: 'Członkostwo',
    leader: 'Lider',
    memberPermissions: 'Uprawnienia członków',
    nonMemberPermissions: 'Uprawnienia pozostałych osób',
    groups: 'Grupy uprawnień',
    visibility: 'Widoczność',
    invitedIds: 'Zaproszone osoby',
    archivedAt: 'Archiwizacja',
    deletedAt: 'Usunięcie',
    publicCredit: 'Publiczne autorstwo',
    image: 'Awatar',
    fileId: 'Plik awatara',
    emailVerified: 'Potwierdzony adres e-mail',
    emailChanged: 'Zmiana adresu e-mail',
    active: 'Aktywna sesja',
    reference: 'Powiązanie pliku',
    filename: 'Nazwa pliku',
    mime: 'Typ pliku',
    size: 'Rozmiar pliku',
    branch: 'Gałąź',
    commit: 'Wersja kodu',
    previewUrl: 'Adres podglądu',
    available: 'Dostępność',
    priority: 'Priorytet',
    link: 'Link',
    color: 'Kolor',
    startDate: 'Data początku',
    endDate: 'Data końca',
    title: 'Tytuł',
    markdown: 'Treść',
    column: 'Status',
    labels: 'Etykiety',
    assigneeIds: 'Przypisane osoby',
    label: 'Etykieta',
    dueAt: 'Termin',
    tags: 'Tagi projektu',
    name: 'Nazwa',
    description: 'Opis',
    firstName: 'Imię',
    lastName: 'Nazwisko',
    nickname: 'Pseudonim',
    bio: 'Biografia',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    publicPrivacy: 'Prywatność profilu',
    role: 'Rola',
    membershipStatus: 'Status członkostwa',
    flags: 'Uprawnienia',
    position: 'Pozycja',
    order: 'Kolejność zadań',
    state: 'Stan publikacji',
    locked: 'Projekt zamknięty',
    fields: 'Obszary projektu',
    mainArticle: 'Główny artykuł',
    projectFeed: 'Aktualności projektu',
    websiteFeed: 'Aktualności strony',
    thumbnailFileId: 'Miniatura'
  };
  function display(field: string, value: unknown): string {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && !value.length)
    )
      return 'Brak wartości';
    if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime()))
        return formatDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' });
      return value;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
      return value.join('\n');
    return JSON.stringify(value, null, 2);
  }
  const summary = (field: string, value: unknown) =>
    display(field, value).replace(/\s+/g, ' ').slice(0, 70);
</script>

{#if validChanges.length}
  <div class="changes">
    <div class="changes-toolbar">
      <span class="changes-caption"
        ><FileDiff size={14} aria-hidden="true" />Zmiany<span class="change-count"
          >{validChanges.length}</span
        ></span
      >
      <div class="layout-picker">
        <Dropdown label={'Układ porównania'} bind:value={layout} {options} variant="compact" />
      </div>
    </div>
    {#each validChanges as change, index}
      {@const open = expanded.includes(index)}
      <section class="change-field">
        <button
          type="button"
          class="change-toggle"
          aria-expanded={open}
          aria-controls={`${uid}-${index}`}
          onclick={() =>
            (expanded = open ? expanded.filter((value) => value !== index) : [...expanded, index])}
        >
          <ChevronDown
            class={open ? 'change-chevron expanded' : 'change-chevron'}
            size={15}
            aria-hidden="true"
          />
          <strong>{names[change.field] ?? change.field}</strong>
          <span class="change-summary"
            ><span>{summary(change.field, change.before)}</span><ArrowRight
              size={12}
              aria-hidden="true"
            /><span>{summary(change.field, change.after)}</span></span
          >
        </button>
        <div id={`${uid}-${index}`} hidden={!open}>
          {#if open}
            {@const rows = activityDiffRows(
              display(change.field, change.before),
              display(change.field, change.after)
            )}
            {@const limit = visibleLines[index] ?? 120}
            <div class="diff-headings" class:unified={layout === 'unified'}>
              <span class="before-heading"><Minus size={12} aria-hidden="true" />Przed</span>
              <span class="after-heading"><Plus size={12} aria-hidden="true" />Po</span>
            </div>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus and scroll long diffs.) -->
            <div
              class="diff-scroll"
              tabindex="0"
              role="region"
              aria-label={names[change.field] ?? change.field}
            >
              {#each rows.slice(0, limit) as row}
                {#if layout === 'split'}
                  <div class="diff-row">
                    <div
                      class="diff-cell before"
                      class:removed={row.changed && !!row.before}
                      class:empty={!row.before}
                    >
                      <span class="line-number" aria-hidden="true">{row.before?.number ?? ''}</span
                      ><span class="line-marker" aria-hidden="true"
                        >{row.changed && row.before ? '−' : ' '}</span
                      ><code>{row.before?.text ?? ''}</code>
                    </div>
                    <div
                      class="diff-cell after"
                      class:added={row.changed && !!row.after}
                      class:empty={!row.after}
                    >
                      <span class="line-number" aria-hidden="true">{row.after?.number ?? ''}</span
                      ><span class="line-marker" aria-hidden="true"
                        >{row.changed && row.after ? '+' : ' '}</span
                      ><code>{row.after?.text ?? ''}</code>
                    </div>
                  </div>
                {:else}
                  {#if row.before}<div class="diff-cell" class:removed={row.changed}>
                      <span class="line-number" aria-hidden="true">{row.before.number}</span><span
                        class="line-marker"
                        aria-hidden="true">{row.changed ? '−' : ' '}</span
                      ><code>{row.before.text}</code>
                    </div>{/if}
                  {#if row.changed && row.after}<div class="diff-cell added">
                      <span class="line-number" aria-hidden="true">{row.after.number}</span><span
                        class="line-marker"
                        aria-hidden="true">+</span
                      ><code>{row.after.text}</code>
                    </div>{/if}
                {/if}
              {/each}
            </div>
            {#if rows.length > limit}<button
                type="button"
                class="show-more"
                onclick={() => (visibleLines[index] = limit + 120)}
                >Pokaż więcej wierszy ({rows.length - limit})</button
              >{/if}
          {/if}
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  .changes {
    --diff-added: #32734e;
    min-width: 0;
    margin-top: 12px;
    width: 100%;
  }
  :global([data-theme='dark']) .changes {
    --diff-added: #7ec79b;
  }
  .changes-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .changes-caption {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--muted);
    font-size: 11px;
  }
  .change-count {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0 6px;
  }
  .layout-picker {
    width: 154px;
  }
  .change-field {
    border: 1px solid var(--line);
    border-radius: var(--radius-md, 6px);
    margin-top: 6px;
    overflow: hidden;
  }
  .change-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 11px 12px;
    border: 0;
    background: var(--surface);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    font-size: 12px;
  }
  .change-toggle:hover {
    background: var(--surface-muted);
  }
  .change-toggle:focus-visible,
  .show-more:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .change-toggle :global(svg) {
    flex-shrink: 0;
    transition: transform 140ms ease;
  }
  .change-toggle :global(.change-chevron:not(.expanded)) {
    transform: rotate(-90deg);
  }
  .change-summary {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-left: auto;
    min-width: 0;
    color: var(--muted);
    font-size: 11px;
  }
  .change-summary > span {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .change-summary :global(svg) {
    transform: none !important;
  }
  .diff-headings,
  .diff-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .diff-headings {
    border-block: 1px solid var(--line);
    font-size: 10px;
    font-weight: 600;
  }
  .diff-headings > span {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 10px;
  }
  .before-heading {
    color: var(--danger, #ad3b42);
    background: color-mix(in srgb, var(--danger, #ad3b42) 8%, var(--surface));
  }
  .after-heading {
    color: var(--diff-added);
    background: color-mix(in srgb, var(--diff-added) 8%, var(--surface));
  }
  .diff-scroll {
    max-height: 360px;
    overflow: auto;
    background: var(--surface);
  }
  .diff-cell {
    display: flex;
    min-width: 0;
    font-size: 11px;
    line-height: 1.7;
    padding-block: 2px;
  }
  .diff-row .before {
    border-right: 1px solid var(--line);
  }
  .line-number {
    min-width: 30px;
    padding-inline: 5px;
    color: var(--muted);
    text-align: right;
    user-select: none;
    font-variant-numeric: tabular-nums;
  }
  .line-marker {
    width: 16px;
    flex-shrink: 0;
    text-align: center;
    user-select: none;
  }
  code {
    display: block;
    flex: 1;
    min-width: 0;
    padding-right: 8px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
    font-family: var(--mono, monospace);
  }
  .removed {
    background: color-mix(in srgb, var(--danger, #ad3b42) 12%, var(--surface));
  }
  .added {
    background: color-mix(in srgb, var(--diff-added) 12%, var(--surface));
  }
  .removed .line-marker {
    color: var(--danger, #ad3b42);
  }
  .added .line-marker {
    color: var(--diff-added);
  }
  .empty {
    background: var(--surface-muted);
  }
  .show-more {
    padding: 8px 12px;
    width: 100%;
    border: 0;
    border-top: 1px solid var(--line);
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .change-summary {
      display: none;
    }
    .line-number {
      min-width: 22px;
      padding-inline: 2px;
    }
    .line-marker {
      width: 12px;
    }
    .layout-picker {
      width: 140px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .change-toggle :global(svg) {
      transition: none;
    }
  }
</style>
