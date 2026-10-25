<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Bell,
    Inbox,
    UserPlus,
    Image,
    Check,
    CheckCheck,
    X,
    Settings,
    ArrowLeft,
    ArrowRight,
    AtSign,
    CircleUserRound,
    MessageSquare
  } from '@lucide/svelte';
  import type { InboxData } from './ApprovalInbox.svelte';
  let {
    language = 'en',
    admin,
    administrator,
    refresh,
    reportError
  }: {
    language?: 'pl' | 'en';
    admin?: InboxData;
    administrator?: boolean;
    refresh?: () => Promise<void>;
    reportError?: (message: string) => void;
  } = $props();
  type Notification = {
    id: string;
    title: string;
    href: string;
    reason: string;
    createdAt: string;
    readAt: string | null;
  };
  const uid = $props.id();
  let open = $state(false);
  let settings = $state(false);
  let filter = $state<'all' | 'unread'>('all');
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let loaded = $state(false);
  let saved = $state(false);
  let now = $state(Date.now());
  let items = $state<Notification[]>([]),
    error = $state(''),
    busy = $state(false);
  let emailEnabled = $state(false),
    emailDelayMinutes = $state(60);
  const unread = $derived(items.filter((item) => !item.readAt).length);
  const adminCount = $derived((admin?.memberships.length ?? 0) + (admin?.avatars.length ?? 0));
  const totalUnread = $derived(unread + adminCount);
  type Entry =
    | {
        kind: 'activity';
        id: string;
        title: string;
        createdAt: string;
        unread: boolean;
        notification: Notification;
      }
    | { kind: 'members'; id: string; title: string; createdAt: string; unread: true }
    | {
        kind: 'avatars';
        id: string;
        title: string;
        createdAt: string;
        unread: true;
        fileId: string;
        version: number;
      };
  const entries = $derived<Entry[]>(
    [
      ...items.map((notification) => ({
        kind: 'activity' as const,
        id: notification.id,
        title: notification.title,
        createdAt: notification.createdAt,
        unread: !notification.readAt,
        notification
      })),
      ...(admin?.memberships ?? []).map((member) => ({
        kind: 'members' as const,
        id: member.id,
        title: member.name || member.email,
        createdAt: member.createdAt,
        unread: true as const
      })),
      ...(admin?.avatars ?? []).map((avatar) => ({
        kind: 'avatars' as const,
        id: avatar.userId,
        title: avatar.name,
        createdAt: avatar.createdAt,
        unread: true as const,
        fileId: avatar.fileId,
        version: avatar.version
      }))
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  );
  const filtered = $derived(entries.filter((entry) => filter === 'all' || entry.unread));
  const preview = $derived(filtered.slice(0, 8));

  function close(restoreFocus = false) {
    open = false;
    if (restoreFocus) trigger?.focus();
  }
  function positionPanel(node: HTMLDivElement) {
    const position = () => {
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 24);
      node.style.width = `${width}px`;
      node.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      node.style.top = `${rect.bottom + 8}px`;
      node.style.maxHeight = `${Math.max(0, Math.min(560, window.innerHeight - rect.bottom - 20))}px`;
    };
    position();
    node.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return {
      destroy() {
        window.removeEventListener('resize', position);
        window.removeEventListener('scroll', position, true);
      }
    };
  }
  function outside(event: Event) {
    if (
      open &&
      event.target instanceof Node &&
      !panel?.contains(event.target) &&
      !trigger?.contains(event.target)
    )
      close();
  }
  function relativeTime(date: string) {
    const seconds = Math.max(0, Math.floor((now - Date.parse(date)) / 1000));
    const formatter = new Intl.RelativeTimeFormat(language === 'pl' ? 'pl' : 'en', {
      numeric: 'auto',
      style: 'short'
    });
    if (seconds < 60) return language === 'pl' ? 'Teraz' : 'Just now';
    if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute');
    if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour');
    return formatter.format(-Math.floor(seconds / 86400), 'day');
  }
  async function request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`/api/notifications${path}`, {
      method,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok)
      throw new Error(
        language === 'pl' ? 'Nie udało się pobrać powiadomień.' : 'Unable to update notifications.'
      );
    return response.json();
  }
  async function load() {
    try {
      items = await request('');
      loaded = true;
      now = Date.now();
    } catch (cause) {
      error = (cause as Error).message;
    }
  }
  async function read(id?: string) {
    busy = true;
    error = '';
    try {
      await request(id ? `/${id}/read` : '/read-all', 'POST');
      await load();
      await refresh?.();
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      busy = false;
    }
  }
  async function savePreferences() {
    busy = true;
    error = '';
    try {
      await request('/preferences', 'PUT', { emailEnabled, emailDelayMinutes });
      saved = true;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      busy = false;
    }
  }
  async function reviewAdmin(
    kind: 'members' | 'avatars',
    id: string,
    approved: boolean,
    version?: number
  ) {
    busy = true;
    error = '';
    reportError?.('');
    try {
      const response = await fetch(`/api/users/inbox/${kind}/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved, ...(version ? { version } : {}) })
      });
      const text = await response.text();
      let result: any = {};
      if (text)
        try {
          result = JSON.parse(text);
        } catch {}
      if (!response.ok) throw new Error(result.code ?? 'Request failed');
      await refresh?.();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Request failed';
      reportError?.(error);
    } finally {
      busy = false;
    }
  }
  onMount(() => {
    void load();
    void request('/preferences')
      .then((result) => {
        emailEnabled = result.emailEnabled;
        emailDelayMinutes = result.emailDelayMinutes;
      })
      .catch((cause) => {
        error = cause.message;
      });
    const timer = setInterval(() => void load(), 30000);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  });
  function reasonLabel(reason: string) {
    if (reason === 'mention') return language === 'pl' ? 'Wzmianka' : 'Mention';
    if (reason === 'assignment') return language === 'pl' ? 'Przypisanie' : 'Assignment';
    return language === 'pl' ? 'Aktualizacja' : 'Update';
  }
</script>

<svelte:window
  onpointerdown={outside}
  onfocusin={outside}
  onkeydown={(event) => {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  }}
/>

<button
  bind:this={trigger}
  type="button"
  class="notification-trigger"
  class:active={open}
  aria-label={`${language === 'pl' ? 'Powiadomienia' : 'Notifications'}${totalUnread ? ` (${totalUnread})` : ''}`}
  title={language === 'pl' ? 'Powiadomienia' : 'Notifications'}
  aria-expanded={open}
  aria-controls={open ? `${uid}-panel` : undefined}
  aria-haspopup="dialog"
  onclick={() => {
    open = !open;
    if (open) {
      settings = false;
      void load();
    }
  }}
>
  <Bell size={18} aria-hidden="true" />
  {#if totalUnread}<span class="notification-dot" aria-hidden="true"></span>{/if}
</button>

{#if open}
  <div
    bind:this={panel}
    use:positionPanel
    id={`${uid}-panel`}
    class="notification-panel"
    role="dialog"
    aria-label={language === 'pl' ? 'Powiadomienia' : 'Notifications'}
    tabindex="-1"
  >
    <header class="panel-header">
      {#if settings}
        <button
          class="menu-icon"
          type="button"
          onclick={() => (settings = false)}
          aria-label={language === 'pl' ? 'Wstecz' : 'Back'}><ArrowLeft size={16} /></button
        >
      {/if}
      <h2>
        {settings
          ? language === 'pl'
            ? 'Ustawienia powiadomień'
            : 'Notification settings'
          : language === 'pl'
            ? 'Powiadomienia'
            : 'Notifications'}
      </h2>
      {#if !settings && totalUnread}<span class="count">{totalUnread}</span>{/if}
      <div class="header-actions">
        {#if !settings}
          <button
            class="menu-icon"
            type="button"
            disabled={busy || !unread}
            onclick={() => read()}
            aria-label={language === 'pl'
              ? 'Oznacz wszystkie jako przeczytane'
              : 'Mark all as read'}
            title={language === 'pl' ? 'Oznacz wszystkie jako przeczytane' : 'Mark all as read'}
            ><CheckCheck size={17} /></button
          >
          <button
            class="menu-icon"
            type="button"
            onclick={() => {
              settings = true;
              saved = false;
            }}
            aria-label={language === 'pl' ? 'Ustawienia powiadomień' : 'Notification settings'}
            title={language === 'pl' ? 'Ustawienia powiadomień' : 'Notification settings'}
            ><Settings size={16} /></button
          >
        {/if}
        <button
          class="menu-icon"
          type="button"
          onclick={() => close(true)}
          aria-label={language === 'pl' ? 'Zamknij' : 'Close'}><X size={17} /></button
        >
      </div>
    </header>
    {#if error}<p role="alert" class="notification-error">{error}</p>{/if}
    {#if settings}
      <form
        class="preferences-form"
        onsubmit={(event) => {
          event.preventDefault();
          void savePreferences();
        }}
      >
        <label class="email-toggle"
          ><input
            type="checkbox"
            bind:checked={emailEnabled}
            onchange={() => (saved = false)}
          />{language === 'pl'
            ? 'E-mail o nieprzeczytanych powiadomieniach'
            : 'Email me about unread notifications'}</label
        >
        <p>
          {language === 'pl'
            ? 'Otrzymuj przypomnienia o powiadomieniach, których jeszcze nie przeczytano.'
            : 'Get a reminder for notifications you haven’t read yet.'}
        </p>
        <label for={`${uid}-delay`}
          >{language === 'pl' ? 'Opóźnienie (minuty)' : 'Delay (minutes)'}</label
        >
        <input
          id={`${uid}-delay`}
          type="number"
          bind:value={emailDelayMinutes}
          oninput={() => (saved = false)}
          min="1"
          max="10080"
          required
        />
        <div class="save-row">
          <button type="submit" class="menu-button" disabled={busy}
            >{language === 'pl' ? 'Zapisz ustawienia' : 'Save preferences'}</button
          >{#if saved}<span role="status">{language === 'pl' ? 'Zapisano' : 'Saved'}</span>{/if}
        </div>
      </form>
    {:else}
      <div
        class="filter-bar"
        role="group"
        aria-label={language === 'pl' ? 'Filtr powiadomień' : 'Filter notifications'}
      >
        <button
          type="button"
          class:selected={filter === 'all'}
          aria-pressed={filter === 'all'}
          onclick={() => (filter = 'all')}>{language === 'pl' ? 'Wszystkie' : 'All'}</button
        >
        <button
          type="button"
          class:selected={filter === 'unread'}
          aria-pressed={filter === 'unread'}
          onclick={() => (filter = 'unread')}
          >{language === 'pl' ? 'Nieprzeczytane' : 'Unread'}<span class="count">{totalUnread}</span
          ></button
        >
      </div>
      <div class="notification-content" aria-busy={busy}>
        {#if preview.length}
          <ul class="notification-list">
            {#each preview as entry (`${entry.kind}-${entry.id}`)}
              <li class:unread={entry.unread}>
                <span class="entry-icon" aria-hidden="true">
                  {#if entry.kind === 'members'}<UserPlus size={18} />
                  {:else if entry.kind === 'avatars'}<Image size={18} />
                  {:else if entry.notification.reason === 'mention'}<AtSign size={18} />
                  {:else if entry.notification.reason === 'assignment'}<CircleUserRound size={18} />
                  {:else}<MessageSquare size={18} />{/if}
                </span>
                <a
                  class="entry-link"
                  href={entry.kind === 'activity' ? entry.notification.href : '/inbox'}
                  onclick={() => {
                    if (entry.kind === 'activity' && entry.unread) void read(entry.id);
                    close();
                  }}
                >
                  <span class="entry-meta"
                    >{entry.kind === 'activity'
                      ? reasonLabel(entry.notification.reason)
                      : language === 'pl'
                        ? 'Wymaga zatwierdzenia'
                        : 'Needs approval'}<span aria-hidden="true"> · </span><time
                      datetime={entry.createdAt}
                      title={new Date(entry.createdAt).toLocaleString(
                        language === 'pl' ? 'pl-PL' : 'en-GB'
                      )}>{relativeTime(entry.createdAt)}</time
                    ></span
                  >
                  <span class="entry-title">{entry.title}</span>
                  {#if entry.kind !== 'activity'}<span class="entry-description"
                      >{entry.kind === 'members'
                        ? language === 'pl'
                          ? 'Prośba o aktywację konta'
                          : 'Account activation request'
                        : language === 'pl'
                          ? 'Nowe zdjęcie profilowe'
                          : 'New profile picture'}</span
                    >{/if}
                </a>
                <div class="entry-actions">
                  {#if entry.kind === 'activity'}
                    {#if entry.unread}
                      <span
                        class="unread-dot"
                        title={language === 'pl' ? 'Nieprzeczytane' : 'Unread'}
                      ></span>
                      <button
                        class="menu-icon read-action"
                        type="button"
                        disabled={busy}
                        onclick={() => read(entry.id)}
                        aria-label={language === 'pl' ? 'Oznacz jako przeczytane' : 'Mark as read'}
                        title={language === 'pl' ? 'Oznacz jako przeczytane' : 'Mark as read'}
                        ><Check size={16} /></button
                      >
                    {/if}
                  {:else}
                    {#if entry.kind === 'avatars'}<img
                        class="approval-avatar"
                        src={`/media/${entry.fileId}`}
                        alt={language === 'pl'
                          ? 'Proponowane zdjęcie profilowe'
                          : 'Proposed profile picture'}
                      />{/if}
                    <div class="review-actions">
                      <button
                        class="menu-icon"
                        type="button"
                        disabled={busy}
                        onclick={() =>
                          reviewAdmin(
                            entry.kind,
                            entry.id,
                            true,
                            entry.kind === 'avatars' ? entry.version : undefined
                          )}
                        aria-label={language === 'pl' ? 'Zatwierdź' : 'Approve'}
                        title={language === 'pl' ? 'Zatwierdź' : 'Approve'}
                        ><Check size={16} /></button
                      >
                      {#if entry.kind === 'avatars' || administrator}<button
                          class="menu-icon decline-action"
                          type="button"
                          disabled={busy}
                          onclick={() =>
                            reviewAdmin(
                              entry.kind,
                              entry.id,
                              false,
                              entry.kind === 'avatars' ? entry.version : undefined
                            )}
                          aria-label={language === 'pl' ? 'Odrzuć' : 'Decline'}
                          title={language === 'pl' ? 'Odrzuć' : 'Decline'}><X size={16} /></button
                        >{/if}
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {:else if !loaded && !error}
          <p class="loading" role="status">
            {language === 'pl' ? 'Ładowanie powiadomień…' : 'Loading notifications…'}
          </p>
        {:else if !error}
          <div class="inbox-empty">
            <Inbox size={32} strokeWidth={1.5} aria-hidden="true" />
            <h3>{language === 'pl' ? 'Wszystko na bieżąco' : 'You’re all caught up'}</h3>
            <p>
              {language === 'pl'
                ? 'Nowe wzmianki, przypisania i prośby pojawią się tutaj.'
                : 'New mentions, assignments, and requests will appear here.'}
            </p>
          </div>
        {/if}
      </div>
      <a class="inbox-footer" href="/inbox" onclick={() => close()}
        ><span
          >{language === 'pl' ? 'Zobacz wszystkie powiadomienia' : 'View all notifications'}</span
        >{#if filtered.length > preview.length}<span class="count"
            >+{filtered.length - preview.length}</span
          >{/if}<ArrowRight size={16} aria-hidden="true" /></a
      >
    {/if}
  </div>
{/if}

<style>
  .notification-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
  }
  .notification-trigger:hover,
  .notification-trigger.active {
    background: var(--surface-muted);
    color: var(--ink);
    border-color: var(--control-border-hover);
  }
  .notification-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 10px;
    height: 10px;
    border: 2px solid var(--surface);
    border-radius: 50%;
    background: #218bff;
    box-sizing: content-box;
  }
  .notification-panel {
    position: fixed;
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow:
      0 8px 28px #0002,
      0 0 0 1px #00000004;
    font-family: var(--font);
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    flex-shrink: 0;
  }
  .panel-header h2 {
    margin: 0;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: normal;
  }
  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    padding: 0 6px;
    height: 20px;
    border-radius: 10px;
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .header-actions {
    margin-left: auto;
    display: flex;
    gap: 2px;
  }
  .menu-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }
  .menu-icon:hover:enabled {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .menu-icon:disabled,
  .menu-button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .notification-trigger:focus-visible,
  .notification-panel :global(:focus-visible) {
    outline: 2px solid #218bff;
    outline-offset: -2px;
  }
  .filter-bar {
    display: flex;
    gap: 16px;
    padding: 0 16px;
    border-bottom: 1px solid var(--line);
    flex-shrink: 0;
  }
  .filter-bar button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 8px 0 11px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    cursor: pointer;
  }
  .filter-bar button:hover,
  .filter-bar button.selected {
    color: var(--ink);
  }
  .filter-bar button.selected {
    font-weight: 600;
  }
  .filter-bar button.selected::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent);
    border-radius: 2px;
  }
  .notification-content {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }
  .notification-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .notification-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px 14px;
    border-bottom: 1px solid var(--line);
  }
  .notification-list li:last-child {
    border-bottom: 0;
  }
  .notification-list li.unread {
    background: color-mix(in srgb, #218bff 4%, var(--surface));
  }
  .notification-list li:hover {
    background: var(--surface-muted);
  }
  .entry-icon {
    display: flex;
    color: var(--muted);
    margin-top: 3px;
    flex-shrink: 0;
  }
  .entry-link {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }
  .entry-meta {
    color: var(--muted);
    font-size: 11px;
  }
  .entry-meta > span {
    margin-inline: 4px;
  }
  time {
    white-space: nowrap;
  }
  .entry-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.45;
  }
  .unread .entry-title {
    font-weight: 600;
  }
  .entry-link:hover .entry-title {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .entry-description {
    color: var(--muted);
    font-size: 12px;
  }
  .entry-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    min-width: 30px;
  }
  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #218bff;
    margin: 11px;
  }
  .read-action {
    display: none;
  }
  li:hover .unread-dot,
  li:focus-within .unread-dot {
    display: none;
  }
  li:hover .read-action,
  li:focus-within .read-action {
    display: inline-flex;
  }
  .review-actions {
    display: flex;
  }
  .decline-action:hover:enabled {
    color: var(--danger);
  }
  .approval-avatar {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    object-fit: cover;
    margin-bottom: 4px;
  }
  .inbox-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 28px;
    text-align: center;
    color: var(--muted);
  }
  .inbox-empty h3 {
    margin: 14px 0 5px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }
  .inbox-empty p {
    margin: 0;
    max-width: 270px;
    font-size: 12px;
  }
  .inbox-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 16px;
    border-top: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }
  .inbox-footer:hover {
    background: var(--surface-muted);
  }
  .preferences-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 16px 20px;
    overflow-y: auto;
  }
  .preferences-form label {
    margin: 0;
    font: inherit;
    color: var(--ink);
    text-transform: none;
    letter-spacing: normal;
  }
  .email-toggle {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .preferences-form input[type='checkbox'] {
    width: 16px;
    height: 16px;
    margin: 2px 0 0;
    accent-color: var(--accent);
    flex-shrink: 0;
  }
  .preferences-form p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .preferences-form input[type='number'] {
    width: 100px;
    margin: 0;
    padding: 6px 8px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 5px;
    font: inherit;
    color: var(--ink);
  }
  .save-row {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--muted);
  }
  .menu-button {
    width: fit-content;
    padding: 6px 12px;
    background: var(--surface-muted);
    border: 1px solid var(--line);
    border-radius: 6px;
    font: inherit;
    font-weight: 500;
    color: var(--ink);
    cursor: pointer;
  }
  .menu-button:hover:enabled {
    border-color: var(--control-border-hover);
  }
  .notification-error {
    margin: 0;
    padding: 10px 16px;
    font-size: 12px;
    color: var(--danger);
    border-bottom: 1px solid var(--line);
  }
  .loading {
    margin: 0;
    padding: 32px 16px;
    text-align: center;
    color: var(--muted);
  }
  @media (hover: none) {
    .read-action {
      display: inline-flex;
    }
    .unread-dot {
      display: none;
    }
  }
</style>
