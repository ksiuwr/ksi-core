<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime, formatRelativeTime } from 'shared/format';
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade, fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { notificationAction, type NotificationContext } from 'shared/notifications';
  import {
    Bell,
    Inbox,
    UserPlus,
    Image,
    Check,
    CheckCheck,
    X,
    ArrowRight,
    CircleDot,
    MessageSquare
  } from '@lucide/svelte';
  import type { InboxData } from './types';
  let {
    fullPage = false,
    admin,
    administrator,
    refresh,
    reportError
  }: {
    fullPage?: boolean;
    admin?: InboxData;
    administrator?: boolean;
    refresh?: () => Promise<void>;
    reportError?: (message: string) => void;
  } = $props();
  const language = $derived(preferences.language);
  type Notification = NotificationContext & {
    id: string;
    title: string;
    href: string;
    reason: string;
    createdAt: string;
    readAt: string | null;
  };
  const uid = $props.id();
  let open = $state(false);
  let filter = $state<'all' | 'unread'>('unread');
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let loaded = $state(false);
  let now = $state(Date.now());
  let items = $state<Notification[]>([]),
    error = $state(''),
    busy = $state(false);
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
  const preview = $derived(fullPage ? filtered : filtered.slice(0, 8));

  function filterIndicator(node: HTMLDivElement, selected: 'all' | 'unread') {
    let selection = selected;
    const measure = () => {
      const button = node.querySelector<HTMLButtonElement>(`[data-filter="${selection}"]`);
      if (!button) return;
      node.style.setProperty('--filter-left', `${button.offsetLeft}px`);
      node.style.setProperty('--filter-width', `${button.offsetWidth}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const button of node.querySelectorAll('button')) observer.observe(button);
    measure();
    return {
      update(next: 'all' | 'unread') {
        selection = next;
        measure();
      },
      destroy() {
        observer.disconnect();
      }
    };
  }

  function resizePanel(node: HTMLDivElement) {
    if (fullPage) return;
    const measure = () => {
      const content = node.querySelector<HTMLElement>('.notification-content');
      if (!content) return;
      const contentHeight = Array.from(content.children).reduce(
        (height, child) => height + (child as HTMLElement).offsetHeight,
        0
      );
      const fixedHeight = Array.from(node.children).reduce(
        (height, child) => height + (child === content ? 0 : (child as HTMLElement).offsetHeight),
        0
      );
      const style = getComputedStyle(node);
      const naturalHeight =
        contentHeight +
        fixedHeight +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth);
      node.style.height = `${Math.min(naturalHeight, parseFloat(style.maxHeight) || naturalHeight)}px`;
    };
    const observer = new ResizeObserver(measure);
    const observe = () => {
      observer.disconnect();
      for (const child of node.children) {
        if (child.classList.contains('notification-content')) {
          for (const body of child.children) observer.observe(body);
        } else observer.observe(child);
      }
      measure();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(node, { childList: true, subtree: true });
    observe();
    window.addEventListener('resize', measure);
    return {
      destroy() {
        observer.disconnect();
        mutations.disconnect();
        window.removeEventListener('resize', measure);
      }
    };
  }

  function close(restoreFocus = false) {
    open = false;
    if (restoreFocus) trigger?.focus();
  }
  function positionPanel(node: HTMLDivElement) {
    if (fullPage) return;
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
    return formatRelativeTime(date, language, now, 'short');
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
      await request(id ? `/${encodeURIComponent(id)}/read` : '/read-all', 'POST');
      window.dispatchEvent(new Event('notifications-updated'));
      await refresh?.();
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
    const timer = setInterval(() => void load(), 30000);
    window.addEventListener('focus', load);
    window.addEventListener('notifications-updated', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener('notifications-updated', load);
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

{#if !fullPage}
  <button
    bind:this={trigger}
    type="button"
    class="topbar-control notification-trigger"
    class:active={open}
    aria-label={`${language === 'pl' ? 'Powiadomienia' : 'Notifications'}${totalUnread ? ` (${totalUnread})` : ''}`}
    title={language === 'pl' ? 'Powiadomienia' : 'Notifications'}
    aria-expanded={open}
    aria-controls={open ? `${uid}-panel` : undefined}
    aria-haspopup="dialog"
    onclick={() => {
      open = !open;
      if (open) {
        error = '';
        void load();
      }
    }}
  >
    <Bell size={18} aria-hidden="true" />
    {#if totalUnread}<span class="notification-dot" aria-hidden="true"></span>{/if}
  </button>
{/if}

{#if open || fullPage}
  <div
    bind:this={panel}
    use:positionPanel
    use:resizePanel
    transition:scale={{
      start: 0.98,
      duration: fullPage || prefersReducedMotion.current ? 0 : 180,
      easing: backOut
    }}
    id={`${uid}-panel`}
    class="notification-panel"
    class:full-page={fullPage}
    role={fullPage ? 'region' : 'dialog'}
    aria-label={language === 'pl' ? 'Powiadomienia' : 'Notifications'}
    tabindex="-1"
  >
    <header class="panel-header">
      <h2>{language === 'pl' ? 'Powiadomienia' : 'Notifications'}</h2>
      <div class="header-actions">
        <button
          class="menu-icon"
          type="button"
          disabled={busy || !unread}
          onclick={() => read()}
          aria-label={language === 'pl' ? 'Oznacz wszystkie jako przeczytane' : 'Mark all as read'}
          title={language === 'pl' ? 'Oznacz wszystkie jako przeczytane' : 'Mark all as read'}
          ><CheckCheck size={17} /></button
        >
      </div>
    </header>
    {#if error}<p role="alert" class="notification-error">{error}</p>{/if}
    <div
      class="filter-bar"
      use:filterIndicator={filter}
      role="group"
      aria-label={language === 'pl' ? 'Filtr powiadomień' : 'Filter notifications'}
    >
      <button
        type="button"
        data-filter="unread"
        class:selected={filter === 'unread'}
        aria-pressed={filter === 'unread'}
        onclick={() => (filter = 'unread')}
        >{language === 'pl' ? 'Nieprzeczytane' : 'Unread'}<span class="count">{totalUnread}</span
        ></button
      >
      <button
        type="button"
        data-filter="all"
        class:selected={filter === 'all'}
        aria-pressed={filter === 'all'}
        onclick={() => (filter = 'all')}>{language === 'pl' ? 'Wszystkie' : 'All'}</button
      >
      <span class="filter-indicator" aria-hidden="true"></span>
    </div>
    <div class="notification-content" aria-busy={busy}>
      {#if preview.length}
        <ul class="notification-list">
          {#each preview as entry (`${entry.kind}-${entry.id}`)}
            <li
              class:unread={entry.unread}
              animate:flip={{ duration: prefersReducedMotion.current ? 0 : 180 }}
              transition:fly|global={{ y: 6, duration: prefersReducedMotion.current ? 0 : 180 }}
            >
              <span class="entry-icon" aria-hidden="true">
                {#if entry.kind === 'members'}<UserPlus size={18} />
                {:else if entry.kind === 'avatars'}<Image size={18} />
                {:else if entry.notification.ownerType === 'item'}<CircleDot size={18} />
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
                    ? entry.notification.projectName || 'KSI'
                    : 'KSI'}<span aria-hidden="true"> · </span><time
                    datetime={entry.createdAt}
                    title={formatDateTime(entry.createdAt, language)}
                    >{relativeTime(entry.createdAt)}</time
                  ></span
                >
                <span class="entry-title">{entry.title}</span>
                {#if entry.kind === 'activity'}
                  <span class="entry-description"
                    >{notificationAction(
                      entry.notification,
                      language
                    )}{#if entry.notification.reason === 'mention'}<span aria-hidden="true">
                        ·
                      </span>{reasonLabel(entry.notification.reason)}{/if}</span
                  >
                {:else}<span class="entry-description"
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
                    <span class="unread-dot" title={language === 'pl' ? 'Nieprzeczytane' : 'Unread'}
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
        <div
          class="inbox-empty"
          transition:fly|global={{ y: 6, duration: prefersReducedMotion.current ? 0 : 180 }}
        >
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
    {#if !fullPage}
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
  }
  .notification-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 10px;
    height: 10px;
    border: 2px solid var(--surface);
    border-radius: 50%;
    background: var(--accent);
    box-sizing: content-box;
  }
  .notification-panel {
    transition: height 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    transform-origin: top right;
    position: fixed;
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    font-family: var(--font);
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  }
  .notification-panel.full-page {
    transition: none;
    position: static;
    z-index: auto;
    width: 100%;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xs);
  }
  .full-page .entry-title {
    display: block;
    overflow: visible;
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
    border-radius: var(--radius-md);
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }
  .menu-icon:hover:not(:disabled) {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .menu-icon:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .notification-panel :global(:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .filter-bar {
    position: relative;
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
  .filter-indicator {
    position: absolute;
    bottom: -1px;
    left: 0;
    width: var(--filter-width, 0px);
    transform: translateX(var(--filter-left, 16px));
    transition:
      transform 180ms ease,
      width 180ms ease;
    pointer-events: none;
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
    background: color-mix(in srgb, var(--accent) 4%, var(--surface));
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
    overflow-wrap: anywhere;
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
    overflow-wrap: anywhere;
    color: var(--muted);
    font-size: 12px;
  }
  .entry-description > span {
    margin-inline: 4px;
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
    background: var(--accent);
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
    border-radius: var(--radius-md);
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
  @media (prefers-reduced-motion: reduce) {
    .filter-indicator,
    .notification-panel {
      transition: none;
    }
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
