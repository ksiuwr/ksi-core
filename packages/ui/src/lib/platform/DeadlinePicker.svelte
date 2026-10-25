<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { CalendarClock, ChevronLeft, ChevronRight, X } from '@lucide/svelte';

  let {
    value = $bindable(''),
    language = 'en',
    disabled = false
  }: {
    value?: string;
    language?: 'pl' | 'en';
    disabled?: boolean;
  } = $props();

  const uid = $props.id();
  const pl = $derived(language === 'pl');
  const intl = $derived(pl ? 'pl-PL' : 'en-GB');

  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let grid = $state<HTMLDivElement>();
  let open = $state(false);
  let position = $state({ left: 0, top: 0 });
  let draftDate = $state('');
  let draftTime = $state('');
  let focusDay = $state('');
  let cursor = $state(firstOfMonth(new Date()));

  const fieldLabel = $derived(pl ? 'Termin (czas lokalny)' : 'Deadline (local time)');
  const emptyLabel = $derived(pl ? 'Brak terminu' : 'No deadline');
  const clearLabel = $derived(pl ? 'Wyczyść' : 'Clear');
  const doneLabel = $derived(pl ? 'Gotowe' : 'Done');
  const timeLabel = $derived(pl ? 'Godzina' : 'Time');
  const today = $derived(hourless(new Date()));
  const title = $derived(
    new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }).format(cursor)
  );
  const weekdays = $derived.by(() => {
    const fmt = new Intl.DateTimeFormat(intl, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, index) => fmt.format(new Date(2024, 0, 1 + index)));
  });
  const month = $derived.by(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return {
      offset: (start.getDay() + 6) % 7,
      count: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    };
  });

  $effect(() => {
    if (!open || !draftDate) return;
    value = `${draftDate}T${draftTime}`;
  });

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }
  function hourless(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function firstOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  function dayOf(key: string) {
    const [year, monthIndex, day] = key.split('-').map(Number);
    return new Date(year!, monthIndex! - 1, day!);
  }
  function addDays(key: string, offset: number) {
    const date = dayOf(key);
    date.setDate(date.getDate() + offset);
    return date;
  }
  function partsOf(raw?: string) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(raw ?? '');
    if (match) return { date: match[1], time: match[2] };
    const date = raw ? new Date(raw) : null;
    if (date && !Number.isNaN(date.getTime()))
      return {
        date: hourless(date),
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
      };
    return { date: '', time: '' };
  }
  function place() {
    if (!trigger) return;
    if (window.matchMedia('(max-width: 760px)').matches) {
      position = { left: 0, top: 0 };
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(312, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 16;
    const upward = below < 340 && rect.top > 340;
    position = {
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward ? Math.max(12, rect.top - 428) : rect.bottom + 6
    };
  }
  async function show() {
    if (disabled || !panel || panel.matches(':popover-open')) return;
    const parts = partsOf(value);
    draftDate = parts.date;
    draftTime = parts.time;
    focusDay = parts.date || today;
    cursor = firstOfMonth(new Date(`${parts.date || today}T12:00`));
    panel.showPopover();
    open = true;
    await tick();
    place();
    grid?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`)?.focus();
  }
  function close(focus = false) {
    if (panel?.matches(':popover-open')) panel.hidePopover();
    open = false;
    if (focus) trigger?.focus();
  }
  function settle() {
    draftTime ||= '09:00';
  }
  function pick(day: string) {
    draftDate = day;
    draftTime ||= '09:00';
    focusDay = day;
  }
  function preset(offset: number) {
    const date = addDays(today, offset);
    draftDate = hourless(date);
    draftTime ||= '09:00';
    focusDay = draftDate;
    cursor = firstOfMonth(date);
  }
  function clearAll() {
    draftDate = '';
    draftTime = '';
    value = '';
  }
  function move(offset: number) {
    const stamp = addDays(focusDay, offset);
    if (stamp.getMonth() !== cursor.getMonth() || stamp.getFullYear() !== cursor.getFullYear()) {
      cursor = firstOfMonth(stamp);
    }
    focusDay = hourless(stamp);
    grid?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`)?.focus();
  }
  async function shiftMonth(step: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + step, 1);
    cursor = next;
    await tick();
    const day = Number(focusDay.slice(8));
    if (day > month.count) shiftDay(month.count);
  }
  function shiftDay(day: number) {
    focusDay = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(day)}`;
    grid?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`)?.focus();
  }
  function keys(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (!(event.target as HTMLElement)?.dataset?.day && event.target !== grid) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 7 : -7);
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault();
      void shiftMonth(event.key === 'PageDown' ? 1 : -1);
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

<div class="picker">
  <label class="picker-name" for={`${uid}-trigger`}>{fieldLabel}</label>
  <button
    id={`${uid}-trigger`}
    bind:this={trigger}
    type="button"
    class="picker-trigger"
    {disabled}
    aria-haspopup="dialog"
    aria-controls={`${uid}-panel`}
    aria-expanded={open}
    onclick={() => (open ? close(true) : void show())}
  >
    <CalendarClock size={15} aria-hidden="true" />
    <span class="picker-value" class:empty={!value}>
      {value
        ? `${new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(new Date(value))} · ${new Intl.DateTimeFormat(intl, { timeStyle: 'short' }).format(new Date(value))}`
        : emptyLabel}
    </span>
  </button>
  <div
    bind:this={panel}
    popover="auto"
    class="picker-panel"
    role="dialog"
    id={`${uid}-panel`}
    aria-labelledby={`${uid}-title`}
    style:left="{position.left}px"
    style:top="{position.top}px"
    ontoggle={(event) => {
      open = event.newState === 'open';
    }}
    onkeydown={keys}
  >
    <header class="picker-head">
      <button
        type="button"
        class="picker-step"
        onclick={() => void shiftMonth(-1)}
        aria-label={pl ? 'Poprzedni miesiąc' : 'Previous month'}
        ><ChevronLeft size={17} aria-hidden="true" /></button
      >
      <strong class="picker-title" id={`${uid}-title`} aria-live="polite">{title}</strong>
      <button
        type="button"
        class="picker-step"
        onclick={() => void shiftMonth(1)}
        aria-label={pl ? 'Następny miesiąc' : 'Next month'}
        ><ChevronRight size={17} aria-hidden="true" /></button
      >
      <button type="button" class="picker-close" onclick={() => close(true)} aria-label={doneLabel}
        ><X size={18} aria-hidden="true" /></button
      >
    </header>
    <div class="picker-weekdays" aria-hidden="true">
      {#each weekdays as label, index (index)}<span>{label}</span>{/each}
    </div>
    <div class="picker-grid" bind:this={grid}>
      {#each Array(month.offset) as _, index (index)}<span aria-hidden="true"></span>{/each}
      {#each Array(month.count) as _, index (index)}
        {@const day = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(index + 1)}`}
        <button
          type="button"
          tabindex={focusDay === day ? 0 : -1}
          data-day={day}
          class:today={day === today}
          class:selected={day === draftDate}
          aria-pressed={day === draftDate}
          aria-label={new Intl.DateTimeFormat(intl, { dateStyle: 'full' }).format(
            new Date(`${day}T12:00`)
          )}
          onclick={() => pick(day)}
        >
          {index + 1}
        </button>
      {/each}
    </div>
    <div class="picker-presets">
      <button type="button" onclick={() => preset(0)}>
        {pl ? 'Dziś' : 'Today'}
      </button>
      <button type="button" onclick={() => preset(1)}>
        {pl ? 'Jutro' : 'Tomorrow'}
      </button>
      <button type="button" onclick={() => preset(7)}>{pl ? 'Za tydzień' : 'In a week'}</button>
    </div>
    <div class="picker-time">
      <label for={`${uid}-time`}>{timeLabel}</label>
      <input id={`${uid}-time`} type="time" bind:value={draftTime} onblur={settle} {disabled} />
    </div>
    <footer class="picker-foot">
      <button type="button" class="picker-clear" disabled={!value || disabled} onclick={clearAll}
        >{clearLabel}</button
      >
      <button type="button" class="picker-done" {disabled} onclick={() => close(true)}
        >{doneLabel}</button
      >
    </footer>
  </div>
</div>

<style>
  .picker {
    display: grid;
    gap: 5px;
  }
  .picker-name {
    color: var(--muted);
    margin-bottom: 0;
  }
  .picker-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: #fffefa;
    color: var(--ink);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .picker-trigger:hover,
  .picker-trigger[aria-expanded='true'] {
    border-color: var(--accent);
  }
  .picker-trigger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .picker-value {
    flex: 1;
    min-width: 0;
  }
  .picker-value.empty {
    color: var(--muted);
  }
  .picker-panel {
    position: fixed;
    inset: auto;
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin: 0;
    width: 312px;
    max-width: calc(100vw - 24px);
    padding: 12px;
    background: var(--surface, #fffefa);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
    box-shadow: 0 8px 24px #0003;
  }
  .picker-panel:popover-open {
    display: flex;
  }
  .picker-head {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .picker-title {
    flex: 1;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
  }
  .picker-step {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .picker-step:hover {
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
  }
  .picker-close {
    display: none;
    margin-left: 4px;
  }
  .picker-weekdays,
  .picker-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }
  .picker-weekdays span {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
  }
  .picker-grid button {
    display: grid;
    place-items: center;
    height: 32px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    font-size: 12px;
    cursor: pointer;
  }
  .picker-grid button:hover {
    background: var(--surface-muted, #f0ede4);
  }
  .picker-grid button.today {
    border-color: var(--line);
  }
  .picker-grid button.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .picker-grid span {
    height: 32px;
  }
  .picker-time {
    display: flex;
    align-items: center;
    gap: 10px;
    border-top: 1px solid var(--line);
    padding-top: 9px;
  }
  .picker-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .picker-presets button {
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 99px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  .picker-presets button:hover {
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
  }
  .picker-time label {
    margin: 0 0 0 2px;
  }
  .picker-time input {
    margin: 0;
    width: auto;
  }
  .picker-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .picker-foot button {
    padding: 7px 12px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: transparent;
    color: var(--ink);
    font-size: 13px;
    cursor: pointer;
  }
  .picker-foot button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .picker-foot button:hover:not(:disabled) {
    background: var(--surface-muted, #f0ede4);
  }
  .picker-done {
    margin-left: auto;
  }
  @media (max-width: 760px) {
    .picker-panel:popover-open {
      inset: 0;
      width: 100vw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      border: none;
      border-radius: 0;
      padding: 12px env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    .picker-close {
      display: grid;
    }
    .picker-presets button {
      min-height: 40px;
      padding: 6px 14px;
      font-size: 13px;
    }
    .picker-grid button {
      height: 42px;
      font-size: 14px;
    }
    .picker-grid span {
      height: 42px;
    }
    .picker-foot button {
      min-height: 44px;
      padding: 10px 16px;
      font-size: 14px;
    }
    .picker-foot {
      margin-top: auto;
    }
  }
</style>
