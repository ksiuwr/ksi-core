<script lang="ts">
  import { tick, onMount } from 'svelte';
  import { Check, ChevronsUpDown, Search } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  export type DropdownOption = {
    value: string;
    color?: string;
    label: string;
    description?: string;
    indicator?: string;
    href?: string;
    disabled?: boolean;
  };
  let {
    value = $bindable(''),
    options,
    label,
    id,
    placeholder = '',
    searchable = false,
    searchPlaceholder = 'Search…',
    emptyLabel = 'No results',
    disabled = false,
    variant = 'default',
    onselect,
    leading,
    indicator
  }: {
    value?: string;
    options: DropdownOption[];
    label: string;
    id?: string;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyLabel?: string;
    disabled?: boolean;
    variant?: 'default' | 'workspace' | 'compact';
    onselect?: (value: string) => void;
    leading?: Snippet;
    indicator?: string;
  } = $props();
  const uid = $props.id();
  const listId = `${uid}-list`;
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let search = $state<HTMLInputElement>();
  let list = $state<HTMLDivElement>();
  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let position = $state({ left: 0, top: 0, width: 240, height: 320 });
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ł/g, 'l');
  const filtered = $derived(
    options.filter((option) =>
      normalize(`${option.label} ${option.description ?? ''}`).includes(normalize(query.trim()))
    )
  );
  const selected = $derived(options.find((option) => option.value === value));

  function place() {
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      Math.max(
        rect.width,
        variant === 'workspace' ? 290 : options.some((option) => option.description) ? 320 : 220
      ),
      window.innerWidth - 24
    );
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.min(340, Math.max(below, above));
    const upward = below < Math.min(260, panel.scrollHeight) && above > below;
    position = {
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward
        ? Math.max(12, rect.top - Math.min(panel.scrollHeight, height) - 6)
        : rect.bottom + 6,
      width,
      height
    };
  }
  async function show(direction = 1) {
    if (disabled || !panel) return;
    query = '';
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    active = selectedIndex >= 0 ? selectedIndex : direction === -1 ? options.length - 1 : 0;
    panel.showPopover();
    open = true;
    await tick();
    place();
    (searchable ? search : list)?.focus();
    reveal();
  }
  function close(focus = false) {
    panel?.hidePopover();
    open = false;
    if (focus) trigger?.focus();
  }
  function choose(option: DropdownOption, event?: MouseEvent) {
    if (disabled || option.disabled) {
      event?.preventDefault();
      return;
    }
    if (!onselect) value = option.value;
    close(!option.href);
    onselect?.(option.value);
  }
  function reveal() {
    document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }
  function keys(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!filtered.length) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      for (let step = 0; step < filtered.length; step++) {
        active = (active + direction + filtered.length) % filtered.length;
        if (!filtered[active].disabled) break;
      }
      reveal();
    } else if (event.target !== search && ['Home', 'End'].includes(event.key)) {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : filtered.length - 1;
      reveal();
    } else if (event.key === 'Enter' || (event.key === ' ' && event.target !== search)) {
      event.preventDefault();
      if (filtered[active] && !filtered[active].disabled)
        document.getElementById(`${uid}-option-${active}`)?.click();
    }
  }
  onMount(() => {
    const update = () => {
      if (open) place();
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  });
</script>

<div
  class="dropdown"
  class:dropdown-workspace={variant === 'workspace'}
  class:dropdown-compact={variant === 'compact'}
>
  <button
    {id}
    bind:this={trigger}
    type="button"
    class="dropdown-trigger"
    {disabled}
    aria-label={label}
    aria-haspopup="listbox"
    aria-controls={listId}
    aria-expanded={open}
    onclick={() => (open ? close(true) : void show())}
    onkeydown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        void show(event.key === 'ArrowUp' ? -1 : 1);
      }
    }}
  >
    {#if leading}<span class="dropdown-leading">{@render leading()}</span>{/if}
    {#if selected?.color}<span class="color-dot" style:background={selected.color}></span>{/if}<span
      class="dropdown-value">{selected?.label || placeholder || label}</span
    >
    {#if indicator}<span
        class="notification-dot"
        role="img"
        aria-label={indicator}
        title={indicator}
      ></span>{/if}
    <ChevronsUpDown size={15} strokeWidth={1.7} aria-hidden="true" />
  </button>
  <div
    bind:this={panel}
    popover="auto"
    class="dropdown-panel"
    style:left="{position.left}px"
    style:top="{position.top}px"
    style:width="{position.width}px"
    style:max-height="{position.height}px"
    ontoggle={(event) => {
      open = event.newState === 'open';
    }}
  >
    {#if searchable}
      <div class="dropdown-search">
        <Search size={16} aria-hidden="true" />
        <input
          bind:this={search}
          type="search"
          role="combobox"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={filtered.length ? `${uid}-option-${active}` : undefined}
          bind:value={query}
          oninput={() => (active = 0)}
          onkeydown={keys}
        />
      </div>
    {/if}
    <div
      bind:this={list}
      id={listId}
      class="dropdown-options"
      role="listbox"
      aria-label={label}
      tabindex={searchable ? -1 : 0}
      aria-activedescendant={filtered.length ? `${uid}-option-${active}` : undefined}
      onkeydown={keys}
    >
      {#each filtered as option, index (option.value)}
        {#if option.href}
          <a
            href={option.href}
            class="dropdown-option"
            class:highlighted={active === index}
            id="{uid}-option-{index}"
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || disabled}
            tabindex="-1"
            onpointermove={() => (active = index)}
            onclick={(event) => choose(option, event)}
          >
            <span
              ><span
                >{#if option.color}<span class="color-dot" style:background={option.color}
                  ></span>{/if}{option.label}</span
              >{#if option.description}<small>{option.description}</small>{/if}</span
            >
            {#if option.indicator}<span
                class="notification-dot"
                role="img"
                aria-label={option.indicator}
                title={option.indicator}
              ></span>{/if}
            {#if option.value === value}<Check size={16} aria-hidden="true" />{/if}
          </a>
        {:else}
          <button
            type="button"
            class="dropdown-option"
            class:highlighted={active === index}
            id="{uid}-option-{index}"
            role="option"
            aria-selected={option.value === value}
            disabled={option.disabled || disabled}
            tabindex="-1"
            onpointermove={() => (active = index)}
            onclick={() => choose(option)}
          >
            <span
              ><span
                >{#if option.color}<span class="color-dot" style:background={option.color}
                  ></span>{/if}{option.label}</span
              >{#if option.description}<small>{option.description}</small>{/if}</span
            >
            {#if option.indicator}<span
                class="notification-dot"
                role="img"
                aria-label={option.indicator}
                title={option.indicator}
              ></span>{/if}
            {#if option.value === value}<Check size={16} aria-hidden="true" />{/if}
          </button>
        {/if}
      {/each}
      {#if !filtered.length}<p class="dropdown-empty" role="status">{emptyLabel}</p>{/if}
    </div>
  </div>
</div>

<style>
  .notification-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--primary, #6750a4);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #6750a4) 20%, transparent);
  }
  .color-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 7px;
    flex-shrink: 0;
  }
  .dropdown {
    min-width: 0;
    width: 100%;
  }
  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border: 1px solid var(--line, #dcd8d0);
    border-radius: 3px;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    box-shadow: inset 0 -1px 0 #0001;
  }
  .dropdown-trigger:hover,
  .dropdown-trigger[aria-expanded='true'] {
    border-color: var(--control-border-hover, var(--muted));
    outline: 1px solid var(--control-border-hover, var(--muted));
    outline-offset: 2px;
    background: var(--surface-muted, #f0ede4);
  }
  .dropdown-value {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dropdown-leading {
    display: flex;
    align-items: center;
    color: var(--muted);
  }
  .dropdown-compact .dropdown-trigger {
    min-height: 30px;
    padding: 5px 9px;
    font-size: 11px;
  }
  .dropdown-workspace .dropdown-trigger {
    min-height: 54px;
    font-weight: 500;
  }
  .dropdown-panel {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 5px;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    border: 1px solid var(--line, #dcd8d0);
    border-radius: 4px;
    box-shadow:
      0 8px 24px #0003,
      inset 0 1px 0 #ffffff08;
    overflow: hidden;
  }
  .dropdown-panel:popover-open {
    display: flex;
    flex-direction: column;
  }
  .dropdown-search {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 9px 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--line, #dcd8d0);
    color: var(--muted);
  }
  .dropdown-search input {
    min-width: 0;
    flex: 1;
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    padding: 4px 0;
    margin: 0;
    min-height: 26px;
    font-size: 13px;
    box-shadow: none;
  }
  .dropdown-search input:focus {
    outline: none;
  }
  .dropdown-search:focus-within {
    border-color: var(--accent);
  }
  .dropdown-options {
    min-height: 0;
    overflow: auto;
    padding: 1px;
  }
  .dropdown-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 9px 10px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: var(--ink, #272638);
    font-size: 13px;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .dropdown-option > span:first-child {
    flex: 1;
    min-width: 0;
  }
  .dropdown-option small {
    display: block;
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }
  .dropdown-option.highlighted {
    background: var(--surface-muted, #f0ede4);
  }
  .dropdown-option[aria-selected='true'] {
    color: var(--accent);
  }
  .dropdown-empty {
    padding: 18px 10px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
