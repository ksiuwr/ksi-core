<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Check, ChevronsUpDown, Search, UserRoundPlus, X } from '@lucide/svelte';

  export type AssignmentMember = {
    id: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    image?: string | null;
    bio?: string | null;
    role?: string;
    leader?: boolean;
  };

  let {
    value = $bindable([]),
    projectId = '',
    members,
    language = 'en',
    readonly = false,
    disabled = false,
    onchange
  }: {
    value?: string[];
    projectId?: string;
    members?: AssignmentMember[];
    language?: 'pl' | 'en';
    readonly?: boolean;
    disabled?: boolean;
    onchange?: (value: string[]) => void;
  } = $props();

  const uid = $props.id();
  const pl = $derived(language === 'pl');
  let loaded = $state<AssignmentMember[]>([]),
    loading = $state(false),
    error = $state('');
  let broken = $state<string[]>([]);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let search = $state<HTMLInputElement>();
  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let position = $state({ left: 0, top: 0, width: 320, height: 300 });

  const choices = $derived(members ?? loaded);
  const fallback = (id: string): AssignmentMember => ({
    id,
    firstName: '',
    lastName: '',
    nickname: id,
    image: null
  });
  const fullName = (person: AssignmentMember) =>
    [person.firstName, person.lastName].filter(Boolean).join(' ') || person.nickname || person.id;
  const initials = (person: AssignmentMember) =>
    `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase() ||
    fullName(person).slice(0, 2).toUpperCase() ||
    '?';
  const selected = $derived(
    value.map((id) => choices.find((person) => person.id === id) ?? fallback(id))
  );
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ł/g, 'l');
  const filtered = $derived.by(() => {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return choices;
    return choices.filter((person) => {
      const haystack = normalize(
        `${person.firstName} ${person.lastName} ${person.nickname ?? ''}`.trim()
      );
      return terms.every((term) => haystack.includes(term));
    });
  });
  const personLabel = (person: AssignmentMember) =>
    pl ? `Przypisz ${fullName(person)}` : `Assign ${fullName(person)}`;
  const removeLabel = (person: AssignmentMember) =>
    pl ? `Usuń ${fullName(person)}` : `Remove ${fullName(person)}`;

  function breakImage(id: string) {
    if (!broken.includes(id)) broken = [...broken, id];
  }
  function place() {
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.min(340, Math.max(below, above));
    const upward = below < Math.min(240, panel.scrollHeight) && above > below;
    position = {
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward
        ? Math.max(12, rect.top - Math.min(panel.scrollHeight, height) - 6)
        : rect.bottom + 6,
      width,
      height
    };
  }
  async function show() {
    if (disabled || !panel || panel.matches(':popover-open')) return;
    query = '';
    active = 0;
    panel.showPopover();
    open = true;
    await tick();
    place();
    search?.focus();
  }
  function close(focus = false) {
    if (panel?.matches(':popover-open')) panel.hidePopover();
    open = false;
    if (focus) trigger?.focus();
  }
  function toggle(member: AssignmentMember) {
    if (disabled) return;
    value = value.includes(member.id)
      ? value.filter((id) => id !== member.id)
      : [...value, member.id];
    onchange?.(value);
    query = '';
    active = 0;
    void tick().then(() => search?.focus());
  }
  function remove(id: string) {
    if (disabled) return;
    value = value.filter((candidate) => candidate !== id);
    onchange?.(value);
  }
  function reveal() {
    document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }
  function keys(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (event.key === 'Backspace' && !query && value.length) {
      event.preventDefault();
      remove(value[value.length - 1]);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filtered.length) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      active = (active + direction + filtered.length) % filtered.length;
      reveal();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!filtered.length) return;
      active = event.key === 'Home' ? 0 : filtered.length - 1;
      reveal();
      return;
    }
    if (event.key === 'Enter' && filtered[active]) {
      event.preventDefault();
      toggle(filtered[active]);
    }
  }

  $effect(() => {
    if (members !== undefined) {
      loading = false;
      error = '';
      return;
    }
    const controller = new AbortController();
    const path = projectId ? `/projects/${encodeURIComponent(projectId)}/members` : '/members';
    error = '';
    loading = true;
    fetch(`/api/platform${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(pl ? 'Nie udało się wczytać osób' : 'Unable to load members');
        const result = await response.json();
        if (!controller.signal.aborted) loaded = result;
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          error =
            cause instanceof Error
              ? cause.message
              : pl
                ? 'Nie udało się wczytać osób'
                : 'Unable to load members';
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
  $effect(() => {
    if (open) void tick().then(place);
  });
  onMount(() => {
    const update = () => {
      if (open) place();
    };
    const dismiss = (event: PointerEvent) => {
      if (!open) return;
      const target = event.target as Node;
      if (panel?.contains(target) || trigger?.contains(target)) return;
      close();
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('pointerdown', dismiss);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('pointerdown', dismiss);
    };
  });
</script>

{#snippet avatar(person: AssignmentMember)}
  {#if person.image && !broken.includes(person.id)}
    <img
      class="avatar"
      src={person.image}
      alt=""
      loading="lazy"
      onerror={() => breakImage(person.id)}
    />
  {:else}
    <span class="avatar fallback" aria-hidden="true">{initials(person)}</span>
  {/if}
{/snippet}

{#if readonly}
  <span class="assigned">
    {#if selected.length}<span class="readonly-label">{pl ? 'Przypisane do' : 'Assigned to'}</span
      >{/if}
    {#each selected as person (person.id)}
      <span class="person-chip compact" title={fullName(person)}
        >{@render avatar(person)}<span class="person-name">{fullName(person)}</span></span
      >
    {/each}
  </span>
{:else}
  <div class="assignees">
    <span class="label" id={`${uid}-label`}>{pl ? 'Przypisane do' : 'Assigned to'}</span>
    {#if selected.length}
      <span class="selected-chips">
        {#each selected as person (person.id)}
          <span class="person-chip" title={fullName(person)}
            >{@render avatar(person)}<span class="person-name">{fullName(person)}</span
            >{#if !disabled}<button
                type="button"
                class="remove"
                aria-label={removeLabel(person)}
                title={removeLabel(person)}
                onclick={() => remove(person.id)}><X size={12} aria-hidden="true" /></button
              >{/if}</span
          >
        {/each}
      </span>
    {/if}
    <button
      bind:this={trigger}
      type="button"
      class="trigger"
      {disabled}
      aria-labelledby={`${uid}-label`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={`${uid}-list`}
      onclick={() => (open ? close(true) : void show())}
      onkeydown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          void show();
        }
      }}
    >
      <UserRoundPlus size={15} aria-hidden="true" />
      <span class="trigger-label">{pl ? 'Dodaj osoby' : 'Add assignees'}</span>
      <ChevronsUpDown size={14} aria-hidden="true" />
    </button>
    <div
      bind:this={panel}
      popover="manual"
      class="panel"
      role="dialog"
      tabindex="-1"
      aria-label={pl ? 'Wybierz osoby' : 'Choose assignees'}
      style:left="{position.left}px"
      style:top="{position.top}px"
      style:width="{position.width}px"
      style:max-height="{position.height}px"
      ontoggle={(event) => (open = event.newState === 'open')}
      onkeydown={keys}
    >
      <div class="panel-search">
        <Search size={15} aria-hidden="true" />
        <input
          bind:this={search}
          type="search"
          role="combobox"
          aria-label={pl ? 'Szukaj osób' : 'Search people'}
          placeholder={pl ? 'Szukaj osób…' : 'Search people…'}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${uid}-list`}
          aria-activedescendant={filtered.length ? `${uid}-option-${active}` : undefined}
          bind:value={query}
          oninput={() => {
            active = 0;
            place();
          }}
        />
      </div>
      <div
        id={`${uid}-list`}
        class="options"
        role="listbox"
        aria-label={pl ? 'Osoby w projekcie' : 'Project members'}
      >
        {#each filtered as member, index (member.id)}
          <button
            type="button"
            id={`${uid}-option-${index}`}
            class="option"
            class:chosen={value.includes(member.id)}
            class:highlighted={active === index}
            role="option"
            aria-selected={value.includes(member.id)}
            tabindex="-1"
            title={personLabel(member)}
            onpointermove={() => (active = index)}
            onclick={() => toggle(member)}
          >
            {@render avatar(member)}
            <span class="option-text">
              <span class="person-name">{fullName(member)}</span>
              {#if member.nickname && member.nickname !== fullName(member)}<small
                  >@{member.nickname}</small
                >{/if}
            </span>
            {#if value.includes(member.id)}<Check size={15} aria-hidden="true" />{/if}
          </button>
        {:else}
          <p class="empty" role="status">
            {loading
              ? pl
                ? 'Wczytywanie osób…'
                : 'Loading members…'
              : error
                ? error
                : pl
                  ? 'Brak pasujących osób.'
                  : 'No matching members.'}
          </p>
        {/each}
      </div>
    </div>
    {#if error && !open}<p class="error" role="alert">{error}</p>{/if}
  </div>
{/if}

<style>
  .assignees {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .label,
  .readonly-label {
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
  }
  .readonly-label {
    margin-right: 2px;
  }
  .assigned,
  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .person-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    padding: 2px 7px 2px 3px;
    border: 1px solid var(--line, #dcd8d0);
    border-radius: 999px;
    background: var(--surface-muted, #f0ede4);
    color: var(--ink, #272638);
    font-size: 12px;
    line-height: 1.5;
  }
  .person-chip.compact {
    padding: 0;
    border: 0;
    background: transparent;
  }
  .person-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .avatar {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    border: 1px solid var(--line, #dcd8d0);
    border-radius: 50%;
    object-fit: cover;
  }
  .avatar.fallback {
    display: grid;
    place-items: center;
    background: var(--surface, #fffefa);
    color: var(--muted);
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
  }
  .compact .avatar {
    width: 18px;
    height: 18px;
    flex-basis: 18px;
  }
  .remove {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .remove:hover,
  .remove:focus-visible {
    background: var(--surface);
    color: var(--ink);
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 36px;
    padding: 7px 10px;
    border: 1px dashed var(--line, #dcd8d0);
    border-radius: 3px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .trigger:hover,
  .trigger:focus-visible,
  .trigger[aria-expanded='true'] {
    border-color: var(--control-border-hover, var(--muted));
    color: var(--ink);
  }
  .trigger:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .trigger-label {
    flex: 1;
    min-width: 0;
  }
  .panel {
    position: fixed;
    inset: auto;
    display: none;
    flex-direction: column;
    margin: 0;
    padding: 6px;
    overflow: hidden;
    border: 1px solid var(--line, #dcd8d0);
    border-radius: 4px;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    box-shadow:
      0 8px 24px #0003,
      inset 0 1px 0 #ffffff08;
  }
  .panel:popover-open {
    display: flex;
  }
  .panel-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--line, #dcd8d0);
    color: var(--muted);
  }
  .panel-search input {
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-height: 0;
    padding-top: 5px;
    overflow-y: auto;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-height: 38px;
    padding: 6px 8px;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--ink, #272638);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .option.highlighted {
    background: var(--surface-muted, #f0ede4);
  }
  .option.chosen {
    background: color-mix(in srgb, var(--primary, #6750a4) 9%, transparent);
  }
  .option-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .option-text small {
    overflow: hidden;
    color: var(--muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty,
  .error {
    margin: 0;
    padding: 10px 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .error {
    color: var(--danger, #b42318);
  }
  @media (max-width: 600px) {
    .person-chip:not(.compact) {
      font-size: 11px;
    }
  }
</style>
