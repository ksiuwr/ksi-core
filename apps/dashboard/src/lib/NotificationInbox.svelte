<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime, formatRelativeTime } from 'shared/format';
  import { onMount } from 'svelte';
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
  import {
    Avatar,
    Divider,
    EmptyState,
    HStack,
    IconButton,
    Link,
    List,
    ListItem,
    SegmentedControl,
    SegmentedControlItem,
    Text,
    Thumbnail,
    VStack
  } from '@astryx-sv/core';
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
  let panel = $state<HTMLElement>();
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

  function close() {
    open = false;
  }
  function positionPanel(node: HTMLElement) {
    if (fullPage) return;
    const position = () => {
      const trigger = document.getElementById(`${uid}-trigger`);
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
    if (!open || !(event.target instanceof Node)) return;
    const trigger = document.getElementById(`${uid}-trigger`);
    if (!panel?.contains(event.target) && !trigger?.contains(event.target)) close();
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
    if (!response.ok) throw new Error('Nie udało się pobrać powiadomień.');
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
      if (!response.ok) throw new Error(result.code ?? 'Żądanie nie powiodło się');
      await refresh?.();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Żądanie nie powiodło się';
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
    if (reason === 'mention') return 'Wzmianka';
    if (reason === 'assignment') return 'Przypisanie';
    return 'Aktualizacja';
  }
</script>

<svelte:window
  onpointerdown={outside}
  onfocusin={outside}
  onkeydown={(event) => {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }}
/>

{#snippet bellIcon()}
  <span class="bell-wrap">
    <Bell size={18} aria-hidden="true" />
    {#if totalUnread}<span class="notification-dot" aria-hidden="true"></span>{/if}
  </span>
{/snippet}

{#if !fullPage}
  <IconButton
    id={`${uid}-trigger`}
    label={`Powiadomienia${totalUnread ? ` (${totalUnread})` : ''}`}
    tooltip="Powiadomienia"
    variant={open ? 'secondary' : 'ghost'}
    size="sm"
    aria-expanded={open}
    aria-controls={open ? `${uid}-panel` : undefined}
    aria-haspopup="dialog"
    icon={bellIcon}
    onclick={() => {
      open = !open;
      if (open) {
        error = '';
        void load();
      }
    }}
  />
{/if}

{#if open || fullPage}
  <section
    bind:this={panel}
    use:positionPanel
    id={`${uid}-panel`}
    class="notification-panel"
    class:full-page={fullPage}
    role={fullPage ? 'region' : 'dialog'}
    aria-label="Powiadomienia"
    tabindex="-1"
  >
    <VStack gap={0}>
      <HStack gap={2} vAlign="center" padding={3}>
        <Text type="label" weight="semibold">Powiadomienia</Text>
        <HStack gap={0} justify="end" class="header-actions">
          <IconButton
            label="Oznacz wszystkie jako przeczytane"
            tooltip="Oznacz wszystkie jako przeczytane"
            variant="ghost"
            size="sm"
            isDisabled={busy || !unread}
            onclick={() => void read()}
          >
            {#snippet icon()}<CheckCheck size={17} aria-hidden="true" />{/snippet}
          </IconButton>
        </HStack>
      </HStack>
      {#if error}
        <Text role="alert" class="notification-error">{error}</Text>
      {/if}
      <HStack paddingInline={3} paddingBlock={2}>
        <SegmentedControl
          value={filter}
          onChange={(value) => (filter = value as 'all' | 'unread')}
          label="Filtr powiadomień"
          size="sm"
        >
          <SegmentedControlItem value="unread" label={`Nieprzeczytane (${totalUnread})`} />
          <SegmentedControlItem value="all" label="Wszystkie" />
        </SegmentedControl>
      </HStack>
      <Divider />
      <VStack gap={0} class="notification-content" aria-busy={busy}>
        {#if preview.length}
          <List hasDividers>
            {#each preview as entry (`${entry.kind}-${entry.id}`)}
              <ListItem>
                {#snippet startContent()}
                  <span class="entry-icon" aria-hidden="true">
                    {#if entry.kind === 'members'}<UserPlus size={18} />
                    {:else if entry.kind === 'avatars'}<Image size={18} />
                    {:else if entry.notification.ownerType === 'item'}<CircleDot size={18} />
                    {:else}<MessageSquare size={18} />{/if}
                  </span>
                {/snippet}
                {#snippet label()}
                  <VStack gap={0.5}>
                    <Text type="supporting" color="secondary">
                      {entry.kind === 'activity'
                        ? entry.notification.projectName || 'KSI'
                        : 'KSI'}<span aria-hidden="true"> · </span><time
                        datetime={entry.createdAt}
                        title={formatDateTime(entry.createdAt, language)}
                        >{relativeTime(entry.createdAt)}</time
                      >
                    </Text>
                    <Link
                      href={entry.kind === 'activity' ? entry.notification.href : '/inbox'}
                      color="primary"
                      weight={entry.unread ? 'semibold' : 'normal'}
                      onclick={() => {
                        if (entry.kind === 'activity' && entry.unread) void read(entry.id);
                        close();
                      }}
                    >
                      {entry.title}
                    </Link>
                    <Text type="supporting" color="secondary">
                      {#if entry.kind === 'activity'}
                        {notificationAction(
                          entry.notification,
                          language
                        )}{#if entry.notification.reason === 'mention'}<span aria-hidden="true">
                            ·
                          </span>{reasonLabel(entry.notification.reason)}{/if}
                      {:else}
                        {entry.kind === 'members'
                          ? 'Prośba o aktywację konta'
                          : 'Nowe zdjęcie profilowe'}
                      {/if}
                    </Text>
                  </VStack>
                {/snippet}
                {#snippet endContent()}
                  <HStack gap={1} vAlign="center">
                    {#if entry.kind === 'activity'}
                      {#if entry.unread}
                        <span class="unread-dot" title="Nieprzeczytane"></span>
                        <IconButton
                          label="Oznacz jako przeczytane"
                          tooltip="Oznacz jako przeczytane"
                          variant="ghost"
                          size="sm"
                          isDisabled={busy}
                          onclick={() => void read(entry.id)}
                        >
                          {#snippet icon()}<Check size={16} aria-hidden="true" />{/snippet}
                        </IconButton>
                      {/if}
                    {:else}
                      {#if entry.kind === 'avatars'}
                        <Thumbnail
                          src={`/media/${entry.fileId}`}
                          alt="Proponowane zdjęcie profilowe"
                          label="Proponowane zdjęcie profilowe"
                        />
                      {:else}
                        <Avatar name={entry.title} size="sm" alt="" />
                      {/if}
                      <IconButton
                        label="Zatwierdź"
                        tooltip="Zatwierdź"
                        variant="ghost"
                        size="sm"
                        isDisabled={busy}
                        onclick={() =>
                          reviewAdmin(
                            entry.kind,
                            entry.id,
                            true,
                            entry.kind === 'avatars' ? entry.version : undefined
                          )}
                      >
                        {#snippet icon()}<Check size={16} aria-hidden="true" />{/snippet}
                      </IconButton>
                      {#if entry.kind === 'avatars' || administrator}
                        <IconButton
                          label="Odrzuć"
                          tooltip="Odrzuć"
                          variant="ghost"
                          size="sm"
                          isDisabled={busy}
                          onclick={() =>
                            reviewAdmin(
                              entry.kind,
                              entry.id,
                              false,
                              entry.kind === 'avatars' ? entry.version : undefined
                            )}
                        >
                          {#snippet icon()}<X size={16} aria-hidden="true" />{/snippet}
                        </IconButton>
                      {/if}
                    {/if}
                  </HStack>
                {/snippet}
              </ListItem>
            {/each}
          </List>
        {:else if !loaded && !error}
          <Text type="supporting" color="secondary" role="status">Ładowanie powiadomień…</Text>
        {:else if !error}
          <EmptyState
            title="Wszystko na bieżąco"
            description="Nowe wzmianki, przypisania i prośby pojawią się tutaj."
          >
            {#snippet icon()}<Inbox size={32} strokeWidth={1.5} aria-hidden="true" />{/snippet}
          </EmptyState>
        {/if}
      </VStack>
      {#if !fullPage}
        <Divider />
        <Link href="/inbox" onclick={() => close()} class="inbox-footer">
          <HStack gap={2} vAlign="center" justify="center" padding={3}>
            <span>Zobacz wszystkie powiadomienia</span>
            {#if filtered.length > preview.length}
              <Text type="supporting" color="secondary">+{filtered.length - preview.length}</Text>
            {/if}
            <ArrowRight size={16} aria-hidden="true" />
          </HStack>
        </Link>
      {/if}
    </VStack>
  </section>
{/if}

<style>
  .bell-wrap {
    position: relative;
    display: inline-flex;
  }
  .notification-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 10px;
    height: 10px;
    box-sizing: content-box;
    border: 2px solid var(--color-background-surface);
    border-radius: 50%;
    background: var(--color-accent);
  }
  .notification-panel {
    position: fixed;
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-container);
    background: var(--color-background-surface);
    box-shadow: var(--shadow-high);
    outline: none;
    color: var(--color-text-primary);
    font-family: var(--font-family-body);
    font-size: var(--text-supporting-size);
  }
  .notification-panel > :global(*) {
    min-height: 0;
  }
  .notification-panel.full-page {
    position: static;
    width: 100%;
    border-radius: var(--radius-container);
    box-shadow: var(--shadow-low);
  }
  :global(.header-actions) {
    margin-left: auto;
  }
  :global(.notification-content) {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }
  .entry-icon {
    display: inline-flex;
    margin-top: var(--spacing-1);
    color: var(--color-text-secondary);
  }
  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent);
  }
  :global(.notification-error) {
    padding-inline: var(--spacing-4);
    padding-block: var(--spacing-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-error);
    font-size: var(--text-supporting-size);
  }
  :global(.inbox-footer) {
    display: block;
    text-decoration: none;
  }
</style>
