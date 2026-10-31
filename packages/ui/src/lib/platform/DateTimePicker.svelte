<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { CalendarClock, ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import { preferences } from './preferences.svelte.js';

  let {
    value = $bindable(''),
    disabled = false,
    label,
    placeholder,
    defaultTime = '23:59'
  }: {
    value?: string;
    disabled?: boolean;
    label?: string;
    placeholder?: string;
    defaultTime?: string;
  } = $props();

  const language = $derived(preferences.language);
  const uid = $props.id();
  const intl = $derived(language);

  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let grid = $state<HTMLDivElement>();
  let hourWheel = $state<HTMLDivElement>();
  let minuteWheel = $state<HTMLDivElement>();
  let open = $state(false);
  let position = $state({ left: 0, top: 0 });
  let draftDate = $state('');
  let draftTime = $state('');
  let focusDay = $state('');
  let cursor = $state(firstOfMonth(new Date()));
  let hourActive = $state(23);
  let minuteActive = $state(59);
  let clockHour = $state('');
  let clockMinute = $state('');
  let clockFocused = $state<'hour' | 'minute' | null>(null);
  let step = $state<'date' | 'time'>('date');
  let monthDirection = 1;
  let modeDirection = 1;
  let dragged = false;
  let dragging = $state(false);
  let glideToken = 0;
  let warping = false;
  let syncing = false;

  const fieldLabel = $derived(label ?? 'Termin (czas lokalny)');
  const emptyLabel = $derived(placeholder ?? 'Brak terminu');
  const doneLabel = $derived('Gotowe');
  const nextLabel = $derived('Dalej');
  const closeLabel = $derived('Zamknij');
  const timeLabel = $derived('Godzina');
  const hoursLabel = $derived('Godzina');
  const minutesLabel = $derived('Minuta');
  const hours = Array.from({ length: 24 }, (_, index) => pad(index));
  const minutes = Array.from({ length: 60 }, (_, index) => pad(index));
  const hourUnits = [...hours, ...hours, ...hours];
  const minuteUnits = [...minutes, ...minutes, ...minutes];
  const today = $derived(hourless(new Date()));
  const monthKey = $derived(`${cursor.getFullYear()}-${cursor.getMonth()}`);
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

  /** The draft stays local until the user confirms with "Done"; closing discards it. */
  function commit() {
    if (draftDate) value = `${draftDate}T${draftTime || defaultTime}`;
  }

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
    const height = panel?.offsetHeight || 340;
    const below = window.innerHeight - rect.bottom - 16;
    const upward = below < height + 8 && rect.top > height + 8;
    position = {
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward ? Math.max(12, rect.top - height - 14) : rect.bottom + 6
    };
  }
  async function show() {
    if (disabled || !panel || panel.matches(':popover-open')) return;
    const parts = partsOf(value);
    draftDate = parts.date;
    draftTime = parts.time || (parts.date ? defaultTime : '');
    focusDay = parts.date || today;
    monthDirection = 1;
    modeDirection = -1;
    cursor = firstOfMonth(new Date(`${parts.date || today}T12:00`));
    step = 'date';
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
  function setHour(hour: string) {
    draftTime = `${hour}:${draftTime.slice(3) || '00'}`;
  }
  function setMinute(minute: string) {
    draftTime = `${draftTime.slice(0, 2) || '00'}:${minute}`;
  }
  function wheelSelect(zone: 'hour' | 'minute', k: number) {
    if (zone === 'hour') {
      hourActive = k;
      setHour(pad(k));
    } else {
      minuteActive = k;
      setMinute(pad(k));
    }
  }
  function wheelSync(
    el: HTMLDivElement,
    count: number,
    k: number,
    motion: 'auto' | 'smooth' = 'auto'
  ) {
    const target = el.querySelector<HTMLLIElement>(`li[data-copy="1"][data-index="${k}"]`);
    const first = el.querySelector('li');
    if (!target || !first) return;
    const smooth =
      motion === 'smooth' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      top: target.offsetTop - (el.clientHeight - first.offsetHeight) / 2,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
  function draftSlot(part: string) {
    const value = Number(part);
    return Number.isFinite(value) ? value : 0;
  }
  function wheelReset() {
    if (!hourWheel || !minuteWheel) return;
    warping = false;
    syncing = true;
    const hour = draftTime.slice(0, 2) ? draftSlot(draftTime.slice(0, 2)) : 23;
    const minute = draftTime.slice(3, 5) ? draftSlot(draftTime.slice(3, 5)) : 59;
    hourActive = ((hour % hours.length) + hours.length) % hours.length;
    minuteActive = Math.min(minutes.length - 1, Math.max(0, minute));
    wheelSync(hourWheel, hours.length, hourActive);
    wheelSync(minuteWheel, minutes.length, minuteActive);
    requestAnimationFrame(() => (syncing = false));
  }
  function wheelScroll(zone: 'hour' | 'minute', el: HTMLDivElement) {
    if (syncing || warping) return;
    const first = el.querySelector('li');
    const step = first?.offsetHeight;
    if (!step) return;
    const count = zone === 'hour' ? hours.length : minutes.length;
    const pos = Math.round(el.scrollTop / step);
    if (pos < count || pos >= count * 2) {
      warping = true;
      el.scrollTop += pos < count ? step * count : -step * count;
      requestAnimationFrame(() => (warping = false));
      return;
    }
    const k = ((pos % count) + count) % count;
    const active = zone === 'hour' ? hourActive : minuteActive;
    if (active === k) return;
    wheelSelect(zone, k);
  }
  function wheelDrag(zone: 'hour' | 'minute', event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const el = event.currentTarget as HTMLDivElement;
    if (!el) return;
    event.preventDefault();
    dragged = false;
    dragging = true;
    glideToken += 1;
    const token = glideToken;
    const step = el.querySelector('li')?.offsetHeight || 32;
    const count = zone === 'hour' ? hours.length : minutes.length;
    let lastY = event.clientY;
    let lastT = performance.now();
    let velocity = 0;
    let travelled = 0;
    el.setPointerCapture(event.pointerId);
    const move = (dragEvent: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const dy = lastY - dragEvent.clientY;
      lastY = dragEvent.clientY;
      lastT = now;
      travelled += Math.abs(dy);
      dragged = travelled > step / 4;
      velocity = velocity * 0.7 + (dy / dt) * 0.3;
      el.scrollTop += dy;
    };
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', finish);
      el.removeEventListener('pointercancel', finish);
      el.removeEventListener('lostpointercapture', finish);
      const glide =
        Math.abs(velocity) >= 0.05 &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!glide) settle();
      else {
        let last = performance.now();
        const tick = () => {
          if (token !== glideToken) return;
          const now = performance.now();
          const dt = now - last;
          last = now;
          el.scrollTop += velocity * dt;
          velocity *= Math.pow(0.996, dt);
          if (token !== glideToken) return;
          if (Math.abs(velocity) >= 0.05) requestAnimationFrame(tick);
          else settle();
        };
        requestAnimationFrame(tick);
      }
    };
    const settle = () => {
      const k = ((Math.round(el.scrollTop / step) % count) + count) % count;
      wheelSelect(zone, k);
      wheelSync(el, count, k, 'auto');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
    el.addEventListener('lostpointercapture', finish);
  }
  function wheelPick(zone: 'hour' | 'minute', index: number) {
    if (dragged) {
      dragged = false;
      return;
    }
    const count = zone === 'hour' ? hours.length : minutes.length;
    const k = ((index % count) + count) % count;
    wheelSelect(zone, k);
    const el = zone === 'hour' ? hourWheel : minuteWheel;
    if (el) wheelSync(el, count, k, 'smooth');
  }
  function wheelKeys(zone: 'hour' | 'minute', event: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -4, PageDown: 4 };
    const offset = steps[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const count = zone === 'hour' ? hours.length : minutes.length;
    const active = zone === 'hour' ? hourActive : minuteActive;
    const k = (((active + offset) % count) + count) % count;
    wheelSelect(zone, k);
    const el = zone === 'hour' ? hourWheel : minuteWheel;
    if (el) wheelSync(el, count, k, 'smooth');
  }
  function pick(day: string) {
    draftDate = day;
    draftTime ||= defaultTime;
    focusDay = day;
    // The date is the only thing left to decide in the first step; move on.
    void showTime();
  }
  function preset(offset: number) {
    const date = addDays(today, offset);
    draftDate = hourless(date);
    draftTime ||= defaultTime;
    focusDay = draftDate;
    const next = firstOfMonth(date);
    monthDirection = next.getTime() >= cursor.getTime() ? 1 : -1;
    cursor = next;
  }
  function presetDate(offset: number) {
    return hourless(addDays(today, offset));
  }
  function monthIn(node: Element) {
    return fly(node, { x: 22 * monthDirection, duration: 170 });
  }
  function monthOut(node: Element) {
    (node as HTMLElement).style.pointerEvents = 'none';
    return fly(node, { x: -22 * monthDirection, duration: 130 });
  }
  function stepIn(node: Element) {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) {
      return fly(node, { x: 28 * modeDirection, duration: 180 });
    }
    return fly(node, { y: 10, duration: 180 });
  }
  function stepOut(node: Element) {
    (node as HTMLElement).style.pointerEvents = 'none';
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) {
      return fly(node, { x: -28 * modeDirection, duration: 140 });
    }
    return fly(node, { y: -10, duration: 130 });
  }
  async function showTime() {
    modeDirection = 1;
    step = 'time';
    draftTime ||= defaultTime;
    await tick();
    wheelReset();
    place();
  }
  function showDate() {
    modeDirection = -1;
    step = 'date';
    place();
  }
  function timePreset(time: string) {
    draftTime = time;
    hourActive = Number(time.slice(0, 2)) % hours.length;
    minuteActive = Math.min(minutes.length - 1, Number(time.slice(3, 5)));
    if (hourWheel) wheelSync(hourWheel, hours.length, hourActive);
    if (minuteWheel) wheelSync(minuteWheel, minutes.length, minuteActive);
  }
  $effect(() => {
    if (clockFocused !== 'hour') clockHour = draftTime.slice(0, 2);
  });
  $effect(() => {
    if (clockFocused !== 'minute') clockMinute = draftTime.slice(3, 5);
  });
  function clockInput(zone: 'hour' | 'minute', raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    if (zone === 'hour') clockHour = digits;
    else clockMinute = digits;
    if (!digits) {
      zone === 'hour' ? setHour('00') : setMinute('00');
      return;
    }
    const value = Number(digits);
    const cap = zone === 'hour' ? 23 : 59;
    if (value <= cap) zone === 'hour' ? setHour(pad(value)) : setMinute(pad(value));
  }
  function clockBlur(zone: 'hour' | 'minute') {
    clockFocused = null;
    const digits = (zone === 'hour' ? clockHour : clockMinute).replace(/\D/g, '');
    if (zone === 'hour') {
      const value = Math.min(23, Math.max(0, Number(digits) || 0));
      hourActive = value;
      clockHour = pad(value);
      setHour(clockHour);
      if (hourWheel) wheelSync(hourWheel, hours.length, value);
    } else {
      const value = Math.min(59, Math.max(0, Number(digits) || 0));
      minuteActive = value;
      clockMinute = pad(value);
      setMinute(clockMinute);
      if (minuteWheel) wheelSync(minuteWheel, minutes.length, value);
    }
  }
  function clockEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLInputElement).blur();
  }
  function move(offset: number) {
    const stamp = addDays(focusDay, offset);
    if (stamp.getMonth() !== cursor.getMonth() || stamp.getFullYear() !== cursor.getFullYear()) {
      monthDirection = offset > 0 ? 1 : -1;
      cursor = firstOfMonth(stamp);
    }
    focusDay = hourless(stamp);
    grid?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`)?.focus();
  }
  async function shiftMonth(direction: number) {
    monthDirection = direction > 0 ? 1 : -1;
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
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
    const update = (event: Event) => {
      if (!open) return;
      const target = event.target;
      if (target instanceof Node && panel?.contains(target)) return;
      place();
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
    aria-label={fieldLabel}
    style:left="{position.left}px"
    style:top="{position.top}px"
    ontoggle={(event) => {
      open = event.newState === 'open';
    }}
    onkeydown={keys}
  >
    <header class="picker-head" class:picker-time-head={step === 'time'}>
      {#if step === 'date'}
        <button
          type="button"
          class="picker-step"
          onclick={() => void shiftMonth(-1)}
          aria-label={'Poprzedni miesiąc'}><ChevronLeft size={17} aria-hidden="true" /></button
        >
        <strong class="picker-title" aria-live="polite">{title}</strong>
        <button
          type="button"
          class="picker-step"
          onclick={() => void shiftMonth(1)}
          aria-label={'Następny miesiąc'}><ChevronRight size={17} aria-hidden="true" /></button
        >
      {:else}
        <button type="button" class="picker-step" onclick={showDate} aria-label={'Wstecz do daty'}
          ><ChevronLeft size={17} aria-hidden="true" /></button
        >
        <strong class="picker-title" aria-live="polite">{timeLabel}</strong>
      {/if}
      <button type="button" class="picker-close" onclick={() => close(true)} aria-label={closeLabel}
        ><X size={18} aria-hidden="true" /></button
      >
    </header>
    <div class="picker-body">
      {#if step === 'date'}
        <div class="picker-scroll picker-date-step" in:stepIn out:stepOut>
          <button
            type="button"
            class="picker-mobile-close"
            onclick={() => close(true)}
            aria-label={closeLabel}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div class="picker-presets">
            <button
              type="button"
              class:selected={draftDate === presetDate(0)}
              aria-pressed={draftDate === presetDate(0)}
              onclick={() => preset(0)}>Dziś</button
            >
            <button
              type="button"
              class:selected={draftDate === presetDate(1)}
              aria-pressed={draftDate === presetDate(1)}
              onclick={() => preset(1)}>Jutro</button
            >
            <button
              type="button"
              class:selected={draftDate === presetDate(7)}
              aria-pressed={draftDate === presetDate(7)}
              onclick={() => preset(7)}>Za tydzień</button
            >
            <button
              type="button"
              class:selected={draftDate === presetDate(28)}
              aria-pressed={draftDate === presetDate(28)}
              onclick={() => preset(28)}>Za miesiąc</button
            >
          </div>
          <div class="picker-cal-wrap">
            {#key monthKey}
              <div class="picker-cal" in:monthIn out:monthOut>
                <div class="picker-weekdays" aria-hidden="true">
                  {#each weekdays as label, index (index)}<span>{label}</span>{/each}
                </div>
                <div class="picker-grid" bind:this={grid}>
                  {#each Array(month.offset) as _, index (index)}<span aria-hidden="true"
                    ></span>{/each}
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
              </div>
            {/key}
          </div>
        </div>
      {:else}
        <div class="picker-scroll picker-time-step" in:stepIn out:stepOut>
          <div class="picker-clock" role="group" aria-label={timeLabel}>
            <label class="picker-clock-field">
              <input
                id={`${uid}-clock-hour`}
                type="text"
                inputmode="numeric"
                enterkeyhint="done"
                maxlength="2"
                autocomplete="off"
                value={clockHour}
                class="picker-clock-part"
                aria-label={hoursLabel}
                onfocus={() => (clockFocused = 'hour')}
                onblur={() => clockBlur('hour')}
                oninput={(event) =>
                  clockInput('hour', (event.currentTarget as HTMLInputElement).value)}
                onkeydown={clockEnter}
              />
            </label>
            <span class="picker-clock-sep" aria-hidden="true"></span>
            <label class="picker-clock-field">
              <input
                id={`${uid}-clock-minute`}
                type="text"
                inputmode="numeric"
                enterkeyhint="done"
                maxlength="2"
                autocomplete="off"
                value={clockMinute}
                class="picker-clock-part"
                aria-label={minutesLabel}
                onfocus={() => (clockFocused = 'minute')}
                onblur={() => clockBlur('minute')}
                oninput={(event) =>
                  clockInput('minute', (event.currentTarget as HTMLInputElement).value)}
                onkeydown={clockEnter}
              />
            </label>
          </div>
          <div class="picker-wheel-row">
            <div class="picker-wheel-box">
              <div
                class="picker-wheel"
                class:dragging
                bind:this={hourWheel}
                role="listbox"
                aria-label={hoursLabel}
                aria-orientation="vertical"
                aria-activedescendant={`${uid}-hour-${hourActive + hours.length}`}
                tabindex="0"
                onscroll={(event) => wheelScroll('hour', event.currentTarget as HTMLDivElement)}
                onkeydown={(event) => wheelKeys('hour', event)}
                onpointerdown={(event) => wheelDrag('hour', event)}
              >
                <ul>
                  {#each hourUnits as unit, index (index)}
                    <li
                      id={`${uid}-hour-${index}`}
                      role="option"
                      aria-selected={index === hourActive + hours.length}
                      data-index={index % hours.length}
                      data-copy={Math.floor(index / hours.length)}
                      class:selected={index === hourActive + hours.length}
                      onclick={() => wheelPick('hour', index)}
                    >
                      {unit}
                    </li>
                  {/each}
                </ul>
              </div>
              <span class="picker-wheel-band" aria-hidden="true"></span>
            </div>
            <div class="picker-wheel-box">
              <div
                class="picker-wheel"
                class:dragging
                bind:this={minuteWheel}
                role="listbox"
                aria-label={minutesLabel}
                aria-orientation="vertical"
                aria-activedescendant={`${uid}-minute-${minuteActive + minutes.length}`}
                tabindex="0"
                onscroll={(event) => wheelScroll('minute', event.currentTarget as HTMLDivElement)}
                onkeydown={(event) => wheelKeys('minute', event)}
                onpointerdown={(event) => wheelDrag('minute', event)}
              >
                <ul>
                  {#each minuteUnits as unit, index (index)}
                    <li
                      id={`${uid}-minute-${index}`}
                      role="option"
                      aria-selected={index === minuteActive + minutes.length}
                      data-index={index % minutes.length}
                      data-copy={Math.floor(index / minutes.length)}
                      class:selected={index === minuteActive + minutes.length}
                      onclick={() => wheelPick('minute', index)}
                    >
                      {unit}
                    </li>
                  {/each}
                </ul>
              </div>
              <span class="picker-wheel-band" aria-hidden="true"></span>
            </div>
          </div>
          <div class="picker-presets picker-time-presets">
            <button type="button" onclick={() => timePreset('23:59')}>23:59</button>
            <button type="button" onclick={() => timePreset('12:00')}>12:00</button>
          </div>
        </div>
      {/if}
    </div>
    <footer class="picker-foot">
      {#if step === 'date'}
        <div class="picker-navstrip">
          <button
            type="button"
            class="picker-step"
            onclick={() => void shiftMonth(-1)}
            aria-label={'Poprzedni miesiąc'}><ChevronLeft size={19} aria-hidden="true" /></button
          >
          <strong class="picker-title" aria-live="polite">{title}</strong>
          <button
            type="button"
            class="picker-step"
            onclick={() => void shiftMonth(1)}
            aria-label={'Następny miesiąc'}><ChevronRight size={19} aria-hidden="true" /></button
          >
        </div>
      {/if}
      <div class="picker-actions">
        <button
          type="button"
          class="picker-done"
          disabled={disabled || (step === 'date' && !draftDate)}
          onclick={() => {
            if (step === 'date') return void showTime();
            commit();
            close(true);
          }}
        >
          {step === 'date' ? nextLabel : doneLabel}
        </button>
      </div>
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
    min-height: 34px;
    padding: 6px 10px;
    border: 1px solid var(--input, var(--line));
    border-radius: var(--radius-md, 6px);
    background: var(--surface, #fffefa);
    color: var(--ink);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    box-shadow: var(--shadow-xs, none);
    transition:
      border-color var(--dur-fast, 120ms) ease,
      box-shadow var(--dur-fast, 120ms) ease;
  }
  .picker-trigger:hover {
    border-color: var(--control-border-hover, var(--accent));
  }
  .picker-trigger[aria-expanded='true'],
  .picker-trigger:focus-visible {
    outline: none;
    border-color: var(--ring-strong, var(--accent));
    box-shadow:
      var(--shadow-xs, 0 0 #0000),
      0 0 0 3px var(--ring, transparent);
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
    height: 384px;
    max-height: calc(100dvh - 24px);
    padding: 12px;
    overflow: hidden;
    background: var(--surface, #fffefa);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg, 8px);
    box-shadow: var(--shadow-md, 0 8px 24px #0003);
  }
  .picker-panel:popover-open {
    display: flex;
  }
  .picker-panel:not(:popover-open) {
    display: none;
  }
  .picker-body {
    display: grid;
    flex: 1;
    min-height: 0;
    overflow: hidden;
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
    border-radius: var(--radius-md, 6px);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .picker-step:hover {
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
  }
  .picker-close {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: var(--radius-md, 6px);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .picker-close:hover {
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
  }
  .picker-mobile-close {
    display: none;
  }
  .picker-clock {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 2px 0;
  }
  .picker-clock-field {
    display: flex;
    align-items: center;
  }
  .picker-clock-part {
    width: 54px;
    margin: 0;
    padding: 5px 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md, 6px);
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
    font-family: var(--mono);
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
    text-align: center;
  }
  .picker-clock-part:focus-visible {
    border-color: var(--accent);
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .picker-clock-sep {
    position: relative;
    flex: 0 0 4px;
    width: 4px;
    height: 20px;
    color: var(--muted);
  }
  .picker-clock-sep::before,
  .picker-clock-sep::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    transform: translateX(-50%);
  }
  .picker-clock-sep::before {
    top: calc(50% - 6px);
  }
  .picker-clock-sep::after {
    top: calc(50% + 3px);
  }
  .picker-wheel.dragging {
    scroll-snap-type: none;
    cursor: grabbing;
  }
  .picker-weekdays,
  .picker-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }
  .picker-grid {
    min-height: calc(6 * 32px + 5 * 3px);
  }
  .picker-cal-wrap {
    display: grid;
    overflow: hidden;
  }
  .picker-cal {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--surface, #fffefa);
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
    border-radius: var(--radius-md, 6px);
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
  .picker-wheel-row {
    --wheel-item: 30px;
    display: flex;
    gap: 10px;
  }
  .picker-wheel-box {
    position: relative;
    isolation: isolate;
    flex: 1;
    min-width: 0;
  }
  .picker-wheel {
    position: relative;
    z-index: 1;
    height: calc(5 * var(--wheel-item));
    overflow-y: auto;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scroll-snap-type: y mandatory;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 5%,
      #000 24%,
      #000 76%,
      transparent 95%
    );
    mask-image: linear-gradient(180deg, transparent 5%, #000 24%, #000 76%, transparent 95%);
  }
  .picker-wheel::-webkit-scrollbar {
    display: none;
  }
  .picker-wheel:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .picker-wheel ul {
    margin: 0;
    padding: calc(2 * var(--wheel-item)) 0;
    list-style: none;
  }
  .picker-wheel li {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--wheel-item);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    scroll-snap-align: center;
    cursor: pointer;
    user-select: none;
  }
  .picker-wheel li:hover {
    color: var(--ink);
  }
  .picker-wheel li.selected {
    color: var(--ink);
    font-weight: 600;
  }
  .picker-wheel-band {
    position: absolute;
    left: 4px;
    right: 4px;
    top: 50%;
    z-index: 0;
    height: var(--wheel-item);
    transform: translateY(-50%);
    background: color-mix(in srgb, var(--surface-muted, #f0ede4) 72%, transparent);
    border-block: 1px solid var(--line);
    border-radius: var(--radius-md, 6px);
    pointer-events: none;
  }
  .picker-presets {
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .picker-presets::-webkit-scrollbar {
    display: none;
  }
  .picker-presets button {
    flex: 0 0 auto;
    padding: 4px 8px;
    border: 1px solid var(--line);
    border-radius: 99px;
    background: transparent;
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
  }
  .picker-presets button:hover {
    background: var(--surface-muted, #f0ede4);
    color: var(--ink);
  }
  .picker-presets button.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--ink);
  }
  .picker-scroll {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    gap: 9px;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--surface, #fffefa);
  }
  .picker-time-step {
    justify-content: center;
    overflow: visible;
  }
  .picker-foot {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .picker-navstrip {
    display: none;
    align-items: center;
    gap: 4px;
  }
  .picker-navstrip .picker-title {
    font-size: 14px;
  }
  .picker-navstrip .picker-step {
    width: 44px;
    height: 44px;
  }
  .picker-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .picker-foot button {
    padding: 7px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md, 6px);
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
  .picker-foot button.picker-done {
    width: 100%;
    border-color: #c74b0a;
    background: #e8590c;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.02em;
    box-shadow: var(--shadow-xs, inset 0 -2px 0 #0002);
  }
  .picker-foot button.picker-done:hover:not(:disabled) {
    border-color: #b84208;
    background: #d9480f;
  }
  @media (max-width: 760px) {
    .picker-panel {
      inset: 0;
      width: 100vw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      border: none;
      border-radius: 0;
      padding: calc(14px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom));
    }
    .picker-head {
      visibility: hidden;
      pointer-events: none;
    }
    .picker-head.picker-time-head {
      visibility: visible;
      pointer-events: auto;
    }
    .picker-mobile-close {
      position: absolute;
      top: calc(10px + env(safe-area-inset-top));
      right: 14px;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
    }
    .picker-mobile-close:hover {
      background: var(--surface-muted, #f0ede4);
      color: var(--ink);
    }
    .picker-scroll {
      flex: 1;
      max-height: none;
      padding-bottom: 4px;
    }
    .picker-date-step {
      justify-content: flex-end;
      padding-bottom: 0;
    }
    .picker-time-step {
      justify-content: center;
      overflow: visible;
      padding-bottom: 8px;
    }
    .picker-navstrip {
      display: flex;
    }
    .picker-foot {
      justify-content: flex-end;
      min-height: calc(44px + 10px + 48px);
    }
    .picker-step {
      width: 44px;
      height: 44px;
    }
    .picker-presets {
      gap: 8px;
    }
    .picker-presets button {
      min-height: 40px;
      padding: 6px 14px;
      font-size: 13px;
    }
    .picker-cal {
      gap: 4px;
    }
    .picker-grid {
      gap: 4px;
      min-height: calc(6 * 46px + 5 * 4px);
    }
    .picker-grid button {
      height: 46px;
      font-size: 15px;
    }
    .picker-grid span {
      height: 46px;
    }
    .picker-clock {
      gap: 10px;
    }
    .picker-clock-part {
      width: 68px;
      min-height: 46px;
      font-size: 20px;
    }
    .picker-wheel-row {
      --wheel-item: 34px;
      gap: 12px;
    }
    .picker-wheel li {
      font-size: 15px;
    }
    .picker-foot {
      gap: 10px;
    }
    .picker-foot button {
      min-height: 48px;
      padding: 10px 14px;
      font-size: 15px;
    }
    .picker-actions {
      gap: 8px;
    }
    .picker-done {
      flex: 1;
      letter-spacing: 0.04em;
    }
  }
</style>
