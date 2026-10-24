<script lang="ts">
  import { untrack } from 'svelte';
  import { ChevronDown, ArrowRight, FileDiff, Minus, Plus } from '@lucide/svelte';
  import Dropdown from './Dropdown.svelte';
  import { hasContentChange, type ContentChange } from 'shared/activity';
  import { activityDiffRows } from 'shared/activity-diff';
  let {
    changes,
    language = 'pl',
    initiallyExpanded = false
  }: { changes: ContentChange[]; language?: 'pl' | 'en'; initiallyExpanded?: boolean } = $props();
  const uid = $props.id();
  let expanded = $state<number[]>(untrack(() => (initiallyExpanded ? [0] : [])));
  let visibleLines = $state<Record<number, number>>({});
  let layout = $state('split');
  const options = $derived([
    { value: 'split', label: language === 'pl' ? 'Obok siebie' : 'Side by side' },
    { value: 'unified', label: language === 'pl' ? 'Widok łączony' : 'Unified' }
  ]);
  const validChanges = $derived(
    changes.filter(
      (change) =>
        change && typeof change.field === 'string' && hasContentChange(change.before, change.after)
    )
  );
  const names: Record<string, [string, string]> = {
    statuses: ['Statusy tablicy', 'Board statuses'],
    layout: ['Układ strony', 'Page layout'],
    links: ['Linki', 'Links'],
    leaderIds: ['Liderzy', 'Leaders'],
    member: ['Członkostwo', 'Membership'],
    leader: ['Lider', 'Leader'],
    memberPermissions: ['Uprawnienia członków', 'Member permissions'],
    nonMemberPermissions: ['Uprawnienia pozostałych osób', 'Non-member permissions'],
    groups: ['Grupy uprawnień', 'Permission groups'],
    visibility: ['Widoczność', 'Visibility'],
    invitedIds: ['Zaproszone osoby', 'Invited members'],
    archivedAt: ['Archiwizacja', 'Archived at'],
    deletedAt: ['Usunięcie', 'Deleted at'],
    publicCredit: ['Publiczne autorstwo', 'Public author credit'],
    image: ['Awatar', 'Avatar'],
    fileId: ['Plik awatara', 'Avatar file'],
    emailVerified: ['Potwierdzony adres e-mail', 'Email verified'],
    emailChanged: ['Zmiana adresu e-mail', 'Email changed'],
    active: ['Aktywna sesja', 'Active session'],
    reference: ['Powiązanie pliku', 'File reference'],
    filename: ['Nazwa pliku', 'Filename'],
    mime: ['Typ pliku', 'File type'],
    size: ['Rozmiar pliku', 'File size'],
    branch: ['Gałąź', 'Branch'],
    commit: ['Wersja kodu', 'Commit'],
    previewUrl: ['Adres podglądu', 'Preview URL'],
    available: ['Dostępność', 'Availability'],
    priority: ['Priorytet', 'Priority'],
    link: ['Link', 'Link'],
    color: ['Kolor', 'Color'],
    startDate: ['Data początku', 'Start date'],
    endDate: ['Data końca', 'End date'],
    title: ['Tytuł', 'Title'],
    markdown: ['Treść', 'Description'],
    column: ['Status', 'Status'],
    labels: ['Etykiety', 'Labels'],
    tags: ['Tagi projektu', 'Project tags'],
    name: ['Nazwa', 'Name'],
    description: ['Opis', 'Description'],
    firstName: ['Imię', 'First name'],
    lastName: ['Nazwisko', 'Last name'],
    nickname: ['Pseudonim', 'Nickname'],
    bio: ['Biografia', 'Biography'],
    github: ['GitHub', 'GitHub'],
    linkedin: ['LinkedIn', 'LinkedIn'],
    publicPrivacy: ['Prywatność profilu', 'Profile privacy'],
    role: ['Rola', 'Role'],
    membershipStatus: ['Status członkostwa', 'Membership status'],
    flags: ['Uprawnienia', 'Permissions'],
    position: ['Pozycja', 'Position'],
    order: ['Kolejność zadań', 'Task order'],
    state: ['Stan publikacji', 'Publication state'],
    locked: ['Projekt zamknięty', 'Project locked'],
    fields: ['Obszary projektu', 'Project fields'],
    mainArticle: ['Główny artykuł', 'Main article'],
    projectFeed: ['Aktualności projektu', 'Project feed'],
    websiteFeed: ['Aktualności strony', 'Website feed'],
    thumbnailFileId: ['Miniatura', 'Thumbnail']
  };
  function display(value: unknown): string {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && !value.length)
    )
      return language === 'pl' ? 'Brak wartości' : 'Not set';
    if (typeof value === 'boolean')
      return value ? (language === 'pl' ? 'Tak' : 'Yes') : language === 'pl' ? 'Nie' : 'No';
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
      return value.join('\n');
    return JSON.stringify(value, null, 2);
  }
  const summary = (value: unknown) => display(value).replace(/\s+/g, ' ').slice(0, 70);
</script>

{#if validChanges.length}
  <div class="changes">
    <div class="changes-toolbar">
      <span class="changes-caption"
        ><FileDiff size={14} aria-hidden="true" />{language === 'pl' ? 'Zmiany' : 'Changes'}<span
          class="change-count">{validChanges.length}</span
        ></span
      >
      <div class="layout-picker">
        <Dropdown
          label={language === 'pl' ? 'Układ porównania' : 'Diff layout'}
          bind:value={layout}
          {options}
          variant="compact"
        />
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
          <strong>{names[change.field]?.[language === 'pl' ? 0 : 1] ?? change.field}</strong>
          <span class="change-summary"
            ><span>{summary(change.before)}</span><ArrowRight size={12} aria-hidden="true" /><span
              >{summary(change.after)}</span
            ></span
          >
        </button>
        <div id={`${uid}-${index}`} hidden={!open}>
          {#if open}
            {@const rows = activityDiffRows(display(change.before), display(change.after))}
            {@const limit = visibleLines[index] ?? 120}
            <div class="diff-headings" class:unified={layout === 'unified'}>
              <span class="before-heading"
                ><Minus size={12} aria-hidden="true" />{language === 'pl'
                  ? 'Przed'
                  : 'Before'}</span
              >
              <span class="after-heading"
                ><Plus size={12} aria-hidden="true" />{language === 'pl' ? 'Po' : 'After'}</span
              >
            </div>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus and scroll long diffs.) -->
            <div
              class="diff-scroll"
              tabindex="0"
              role="region"
              aria-label={names[change.field]?.[language === 'pl' ? 0 : 1] ?? change.field}
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
                >{language === 'pl' ? 'Pokaż więcej wierszy' : 'Show more lines'} ({rows.length -
                  limit})</button
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
    border-radius: 4px;
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
