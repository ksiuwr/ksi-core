<script lang="ts">
  import { onMount } from 'svelte';
  let { language = 'en' }: { language?: 'pl' | 'en' } = $props();
  type Notification = {
    id: string;
    title: string;
    href: string;
    reason: string;
    createdAt: string;
    readAt: string | null;
  };
  let items = $state<Notification[]>([]),
    error = $state(''),
    busy = $state(false);
  let emailEnabled = $state(false),
    emailDelayMinutes = $state(60);
  const unread = $derived(items.filter((item) => !item.readAt).length);
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
    } catch (cause) {
      error = (cause as Error).message;
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
</script>

<details
  class="notifications"
  ontoggle={(event) => {
    if (event.currentTarget.open) void load();
  }}
>
  <summary
    >{language === 'pl' ? 'Powiadomienia' : 'Notifications'}
    {#if unread}<span class="tag">{unread}</span>{/if}</summary
  >
  <div class="notification-panel">
    <button type="button" class="btn btn-outline" disabled={busy || !unread} onclick={() => read()}
      >{language === 'pl' ? 'Oznacz wszystkie jako przeczytane' : 'Mark all as read'}</button
    >
    <div class="notification-list">
      {#each items as item (item.id)}<article class:unread={!item.readAt}>
          <a
            href={item.href}
            onclick={() => {
              if (!item.readAt) void read(item.id);
            }}>{item.title}</a
          >
          <span
            >{item.reason === 'mention'
              ? language === 'pl'
                ? 'Wzmianka'
                : 'Mention'
              : item.reason === 'assignment'
                ? language === 'pl'
                  ? 'Przypisanie'
                  : 'Assignment'
                : language === 'pl'
                  ? 'Aktualizacja'
                  : 'Update'}</span
          >
          <time datetime={item.createdAt}
            >{new Date(item.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-GB')}</time
          >
          {#if !item.readAt}<button type="button" disabled={busy} onclick={() => read(item.id)}
              >{language === 'pl' ? 'Oznacz jako przeczytane' : 'Mark as read'}</button
            >{/if}
        </article>{:else}<p>
          {language === 'pl' ? 'Brak powiadomień.' : 'No notifications.'}
        </p>{/each}
    </div>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        void savePreferences();
      }}
    >
      <label
        ><input type="checkbox" bind:checked={emailEnabled} />{language === 'pl'
          ? 'E-mail o nieprzeczytanych powiadomieniach'
          : 'Email unread notifications'}</label
      >
      <label
        >{language === 'pl' ? 'Opóźnienie (minuty)' : 'Delay (minutes)'}<input
          type="number"
          bind:value={emailDelayMinutes}
          min="1"
          max="10080"
          required
        /></label
      >
      <button class="btn" disabled={busy}
        >{language === 'pl' ? 'Zapisz ustawienia' : 'Save preferences'}</button
      >
    </form>
    {#if error}<p role="alert">{error}</p>{/if}
  </div>
</details>

<style>
  .notifications {
    position: relative;
  }
  summary {
    cursor: pointer;
  }
  .notification-panel {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 50;
    width: min(420px, calc(100vw - 32px));
    max-height: 80dvh;
    overflow: auto;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
    padding: 16px;
    box-shadow: 0 8px 24px #0002;
  }
  article,
  form {
    display: grid;
    gap: 8px;
    border-bottom: 1px solid var(--line);
    padding: 12px 0;
  }
  article.unread {
    border-left: 3px solid var(--accent);
    padding-left: 10px;
  }
  article span,
  time {
    font-size: 12px;
    color: var(--muted);
  }
  label {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  input[type='checkbox'] {
    width: auto;
  }
</style>
