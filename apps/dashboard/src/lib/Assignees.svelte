<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Search, UserRoundPlus, ChevronsUpDown } from '@lucide/svelte';
  import {
    Avatar,
    AvatarGroup,
    Button,
    HStack,
    Text,
    TextInput,
    Token,
    VStack
  } from '@astryx-sv/core';

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
    readonly = false,
    disabled = false,
    showLabel = true,
    stacked = false,
    onchange
  }: {
    value?: string[];
    projectId?: string;
    members?: AssignmentMember[];
    readonly?: boolean;
    disabled?: boolean;
    showLabel?: boolean;
    /** Read-only only: overlapping avatars; names stay available to screen readers. */
    stacked?: boolean;
    onchange?: (value: string[]) => void;
  } = $props();

  const uid = $props.id();
  let loaded = $state<AssignmentMember[]>([]),
    loading = $state(false),
    error = $state(false);
  let panel = $state<HTMLElement>();
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
  const selected = $derived(
    value.map((id) => choices.find((person) => person.id === id) ?? fallback(id))
  );
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ł/g, 'l');
  const available = $derived(choices.filter((person) => !value.includes(person.id)));
  const filtered = $derived.by(() => {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return available;
    return available.filter((person) => {
      const haystack = normalize(
        `${person.firstName} ${person.lastName} ${person.nickname ?? ''}`.trim()
      );
      return terms.every((term) => haystack.includes(term));
    });
  });
  const removeLabel = (person: AssignmentMember) => `Usuń ${fullName(person)}`;
  const triggerElement = () =>
    document.getElementById(`${uid}-trigger`) as HTMLButtonElement | null;
  $effect(() => {
    if (!available.length) open = false;
  });

  function place() {
    const trigger = triggerElement();
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
    document.getElementById(`${uid}-search`)?.focus();
  }
  function close(focus = false) {
    if (panel?.matches(':popover-open')) panel.hidePopover();
    open = false;
    if (focus) triggerElement()?.focus();
  }
  function toggle(member: AssignmentMember) {
    if (disabled) return;
    value = value.includes(member.id)
      ? value.filter((id) => id !== member.id)
      : [...value, member.id];
    onchange?.(value);
    query = '';
    active = 0;
    void tick().then(() => document.getElementById(`${uid}-search`)?.focus());
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
      error = false;
      return;
    }
    const controller = new AbortController();
    const path = projectId ? `/projects/${encodeURIComponent(projectId)}/members` : '/members';
    error = false;
    loading = true;
    fetch(`/api/platform${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Nie udało się wczytać osób');
        const result = await response.json();
        if (!controller.signal.aborted) loaded = result;
      })
      .catch(() => {
        if (!controller.signal.aborted) error = true;
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
      if (panel?.contains(target) || triggerElement()?.contains(target)) return;
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
  <Avatar src={person.image ?? undefined} name={fullName(person)} size={20} alt="" />
{/snippet}

{#if readonly}
  {#if stacked}
    <HStack gap={1.5} vAlign="center">
      {#if selected.length && showLabel}
        <Text type="supporting" color="secondary">Przypisane do</Text>
      {/if}
      <AvatarGroup size="sm">
        {#each selected as person (person.id)}
          <Avatar
            src={person.image ?? undefined}
            name={fullName(person)}
            href={`/members/${encodeURIComponent(person.id)}`}
          />
        {/each}
      </AvatarGroup>
    </HStack>
  {:else}
    <HStack gap={1.5} vAlign="center" wrap="wrap">
      {#if selected.length && showLabel}
        <Text type="supporting" color="secondary">Przypisane do</Text>
      {/if}
      {#each selected as person (person.id)}
        <Token label={fullName(person)} size="sm" description={fullName(person)}>
          {#snippet icon()}{@render avatar(person)}{/snippet}
        </Token>
      {/each}
    </HStack>
  {/if}
{:else}
  <VStack gap={2} class="assignees">
    {#if showLabel}<Text type="supporting" color="secondary" id={`${uid}-label`}>Przypisane do</Text
      >{/if}
    {#if selected.length}
      <HStack gap={1.5} wrap="wrap">
        {#each selected as person (person.id)}
          <Token
            label={fullName(person)}
            href={`/members/${encodeURIComponent(person.id)}`}
            size="sm"
            onRemove={disabled ? undefined : () => remove(person.id)}
            description={removeLabel(person)}
          >
            {#snippet icon()}{@render avatar(person)}{/snippet}
          </Token>
        {/each}
      </HStack>
    {/if}
    {#if available.length}
      <Button
        id={`${uid}-trigger`}
        variant="secondary"
        label="Dodaj osoby"
        width="100%"
        isDisabled={disabled}
        aria-label={showLabel ? undefined : 'Dodaj osoby'}
        aria-labelledby={showLabel ? `${uid}-label` : undefined}
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
        {#snippet icon()}<UserRoundPlus size={15} aria-hidden="true" />{/snippet}
        {#snippet endContent()}
          <ChevronsUpDown size={14} aria-hidden="true" />
        {/snippet}
      </Button>
      <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
      <section
        bind:this={panel}
        popover="manual"
        class="panel"
        role="dialog"
        tabindex="-1"
        aria-label="Wybierz osoby"
        style:left="{position.left}px"
        style:top="{position.top}px"
        style:width="{position.width}px"
        style:max-height="{position.height}px"
        ontoggle={(event) => (open = event.newState === 'open')}
        onkeydown={keys}
      >
        <VStack gap={2} class="panel-inner">
          <TextInput
            id={`${uid}-search`}
            label="Szukaj osób"
            isLabelHidden
            type="text"
            placeholder="Szukaj osób…"
            bind:value={query}
            onChange={() => {
              active = 0;
              place();
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${uid}-list`}
            aria-activedescendant={filtered.length ? `${uid}-option-${active}` : undefined}
          >
            {#snippet startIcon()}<Search size={15} aria-hidden="true" />{/snippet}
          </TextInput>
          <VStack
            gap={0}
            id={`${uid}-list`}
            role="listbox"
            aria-label="Członkowie projektu"
            class="options"
          >
            {#each filtered as member, index (member.id)}
              <button
                type="button"
                id={`${uid}-option-${index}`}
                class="option"
                class:highlighted={active === index}
                role="option"
                aria-selected="false"
                tabindex="-1"
                title={fullName(member)}
                onpointermove={() => (active = index)}
                onclick={() => toggle(member)}
              >
                {@render avatar(member)}
                <VStack gap={0}>
                  <Text as="span">{fullName(member)}</Text>
                  {#if member.nickname && member.nickname !== fullName(member)}
                    <Text as="span" type="supporting" color="secondary">@{member.nickname}</Text>
                  {/if}
                </VStack>
              </button>
            {:else}
              <Text type="supporting" color="secondary" role="status">
                {#if loading}Wczytywanie osób…{:else if error}Nie udało się wczytać osób{:else}Brak
                  pasujących osób.{/if}
              </Text>
            {/each}
          </VStack>
        </VStack>
      </section>
    {/if}
    {#if error && !open}<Text type="supporting" role="alert" class="error-text"
        >Nie udało się wczytać osób</Text
      >{/if}
  </VStack>
{/if}

<style>
  :global(.assignees) {
    min-width: 0;
  }
  .panel {
    position: fixed;
    inset: auto;
    display: none;
    flex-direction: column;
    margin: 0;
    padding: var(--spacing-1);
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-element);
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-med);
  }
  .panel:popover-open {
    display: flex;
  }
  :global(.panel-inner) {
    min-height: 0;
  }
  :global(.options) {
    min-height: 0;
    overflow-y: auto;
  }
  .option {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    min-height: 36px;
    padding: var(--spacing-1-5) var(--spacing-2);
    border: 0;
    border-radius: var(--radius-inner);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .option.highlighted {
    background: var(--color-background-muted);
  }
  :global(.error-text) {
    color: var(--color-error);
  }
</style>
