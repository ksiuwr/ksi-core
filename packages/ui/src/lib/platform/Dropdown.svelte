<script lang="ts">
  import { flushSync, onMount } from 'svelte';
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
    panelContent,
    footer,
    indicator,
    valueContent
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
    variant?: 'default' | 'workspace' | 'compact' | 'bar';
    onselect?: (value: string) => void;
    leading?: Snippet;
    panelContent?: Snippet<[close: () => void]>;
    footer?: Snippet<[close: () => void]>;
    indicator?: string;
    /** Custom selection summary inside the normal dropdown trigger. */
    valueContent?: Snippet;
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
        panelContent
          ? 360
          : variant === 'workspace' || variant === 'bar'
            ? 290
            : options.some((option) => option.description)
              ? 320
              : 220
      ),
      window.innerWidth - 24
    );
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.min(panelContent ? 480 : 340, Math.max(below, above));
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
  function show(direction = 1) {
    if (disabled || !panel) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    flushSync(() => {
      query = '';
      active = selectedIndex >= 0 ? selectedIndex : direction === -1 ? options.length - 1 : 0;
    });
    panel.showPopover();
    // Measure the displayed panel and commit its final geometry before the
    // browser gets an opportunity to paint the newly opened top layer.
    flushSync(() => {
      open = true;
      place();
    });
    (panelContent
      ? panel?.querySelector<HTMLElement>('button, input, [tabindex]')
      : searchable
        ? search
        : list
    )?.focus();
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
  // Press, drag to an option and release to pick it (native-select style).
  // Wait for the hold threshold before opening so a quick click cannot
  // light-dismiss the popover it just opened.
  const HOLD_MS = 220;
  let suppressClick = false;
  // Light-dismiss closes an open popup before `click` fires; remember it was open.
  let pressedWhileOpen = false;
  function pressTrigger(event: PointerEvent) {
    pressedWhileOpen = open;
    if (event.button !== 0 || event.pointerType === 'touch' || panelContent || disabled || open)
      return;
    let held = false;
    const holdTimer = window.setTimeout(() => {
      held = true;
      suppressClick = true;
      void show();
    }, HOLD_MS);
    const cleanup = () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
    const release = (up: PointerEvent) => {
      cleanup();
      if (!held) return;
      const target = document.elementFromPoint(up.clientX, up.clientY);
      const option = target?.closest<HTMLElement>('.dropdown-option');
      if (option && panel?.contains(option)) option.click();
      window.setTimeout(() => (suppressClick = false), 0);
    };
    const cancel = () => {
      cleanup();
      suppressClick = false;
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', cancel, true);
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
      if (!footer) close();
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
  class:dropdown-bar={variant === 'bar'}
>
  <button
    {id}
    bind:this={trigger}
    type="button"
    class="dropdown-trigger"
    {disabled}
    aria-label={label}
    aria-haspopup={panelContent ? 'dialog' : 'listbox'}
    aria-controls={panelContent ? `${uid}-content` : listId}
    aria-expanded={open}
    onpointerdown={pressTrigger}
    onclick={() => {
      if (suppressClick) return;
      if (pressedWhileOpen || open) {
        pressedWhileOpen = false;
        close(true);
      } else void show();
    }}
    onkeydown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        void show(event.key === 'ArrowUp' ? -1 : 1);
      }
    }}
  >
    {#if leading}<span class="dropdown-leading">{@render leading()}</span>{/if}
    {#if selected?.color}<span class="color-dot" style:background={selected.color}></span>{/if}<span
      class="dropdown-value"
      >{#if valueContent}{@render valueContent()}{:else}{selected?.label ||
          placeholder ||
          label}{/if}</span
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
    {#if panelContent}
      <div id="{uid}-content" class="dropdown-content" role="dialog" aria-label={label}>
        {@render panelContent(() => close(true))}
      </div>
    {:else}
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
    {/if}
    {#if footer}
      <div class="dropdown-footer">{@render footer(() => close(true))}</div>
    {/if}
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
    min-height: 34px;
    padding: 6px 10px;
    border: 1px solid var(--input, var(--line, #dcd8d0));
    border-radius: var(--radius-md, 6px);
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    box-shadow: var(--shadow-xs, 0 1px 2px #0000000d);
    transition:
      border-color var(--dur-fast, 120ms) ease,
      box-shadow var(--dur-fast, 120ms) ease,
      background-color var(--dur-fast, 120ms) ease;
  }
  .dropdown-trigger:hover {
    border-color: var(--control-border-hover, var(--muted));
  }
  .dropdown-trigger[aria-expanded='true'],
  .dropdown-trigger:focus-visible {
    outline: none;
    border-color: var(--ring-strong, var(--accent));
    box-shadow:
      var(--shadow-xs, 0 1px 2px #0000000d),
      0 0 0 3px var(--ring, color-mix(in srgb, var(--accent) 24%, transparent));
  }
  .dropdown-trigger :global(svg:last-child) {
    color: var(--muted);
    flex-shrink: 0;
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
    min-height: 28px;
    padding: 4px 8px;
    font-size: 11.5px;
  }
  /* Quiet trigger for navigation bars: no chrome until hovered. */
  .dropdown-bar .dropdown-trigger {
    min-height: 32px;
    padding: 4px 8px;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    font-weight: 500;
  }
  .dropdown-bar .dropdown-trigger:hover {
    border-color: transparent;
    background: var(--surface-muted);
  }
  .dropdown-bar .dropdown-trigger[aria-expanded='true'] {
    background: var(--surface-muted);
  }
  .dropdown-workspace .dropdown-trigger {
    min-height: 44px;
    padding: 6px 10px;
    border-radius: var(--radius-lg, 8px);
    font-weight: 500;
  }
  .dropdown-panel {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 4px;
    /* Dropdown contents must remain full-size and opaque while opening. */
    opacity: 1;
    scale: 1;
    translate: 0 0;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    border: 1px solid var(--line, #dcd8d0);
    border-radius: var(--radius-lg, 8px);
    box-shadow: var(--shadow-md, 0 8px 24px #0003);
    overflow: hidden;
    transition: none;
  }
  .dropdown-panel:popover-open {
    display: flex;
    flex-direction: column;
  }
  .dropdown-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 8px;
    margin: 0 -4px 4px;
    padding-inline: 12px;
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
  .dropdown-search input:hover,
  .dropdown-search input:focus {
    outline: none;
    border: 0;
    box-shadow: none;
  }
  .dropdown-content {
    min-height: 0;
    overflow: auto;
  }
  .dropdown-footer {
    flex-shrink: 0;
    border-top: 1px solid var(--line, #dcd8d0);
    margin: 4px -4px 0;
    padding: 4px 4px 0;
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
    padding: 7px 8px;
    border: 0;
    border-radius: var(--radius-sm, 4px);
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
    font-weight: 500;
  }
  .dropdown-option[aria-selected='true'] > :global(svg) {
    color: var(--accent);
    flex-shrink: 0;
  }
  .dropdown-empty {
    padding: 18px 10px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
