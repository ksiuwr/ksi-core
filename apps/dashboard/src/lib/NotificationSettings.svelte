<script lang="ts">
  import { onMount } from 'svelte';
  import { Bell, Check } from '@lucide/svelte';

  let { language }: { language: 'pl' | 'en' } = $props();
  const uid = $props.id();
  let emailEnabled = $state(false);
  let emailDelayMinutes = $state(60);
  let loading = $state(true);
  let loaded = $state(false);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');
  let lastSaved = $state<string>('');
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let savedFlash: ReturnType<typeof setTimeout> | undefined;

  async function request(method = 'GET') {
    const response = await fetch('/api/notifications/preferences', {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'PUT' ? JSON.stringify({ emailEnabled, emailDelayMinutes }) : undefined
    });
    if (!response.ok)
      throw new Error(
        language === 'pl'
          ? 'Nie udało się zaktualizować ustawień powiadomień.'
          : 'Unable to update notification settings.'
      );
    return response.json();
  }
  function snapshot() {
    return JSON.stringify({ emailEnabled, emailDelayMinutes });
  }
  async function load() {
    loading = true;
    error = '';
    try {
      const preferences = await request();
      emailEnabled = preferences.emailEnabled;
      emailDelayMinutes = preferences.emailDelayMinutes;
      lastSaved = snapshot();
      loaded = true;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      loading = false;
    }
  }
  async function save() {
    saving = true;
    saved = false;
    error = '';
    clearTimeout(savedFlash);
    try {
      await request('PUT');
      lastSaved = snapshot();
      saved = true;
      savedFlash = setTimeout(() => (saved = false), 2000);
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      saving = false;
    }
  }
  $effect(() => {
    const current = snapshot();
    lastSaved;
    clearTimeout(debounce);
    if (!loaded || loading) return;
    if (!Number.isFinite(emailDelayMinutes) || emailDelayMinutes < 1 || emailDelayMinutes > 10080)
      return;
    if (current === lastSaved) return;
    debounce = setTimeout(() => void save(), 800);
    return () => clearTimeout(debounce);
  });
  onMount(() => {
    void load();
    return () => {
      clearTimeout(savedFlash);
    };
  });
</script>

<form id="notifications" class="card settings-card">
  <div class="section-heading">
    <Bell size={18} aria-hidden="true" />
    <h2>{language === 'pl' ? 'Powiadomienia' : 'Notifications'}</h2>
  </div>
  {#if saving}<span role="status" class="save-state"
      >{language === 'pl' ? 'Zapisywanie…' : 'Saving…'}</span
    >{:else if saved}<span role="status" class="save-state"
      ><Check size={14} aria-hidden="true" />{language === 'pl' ? 'Zapisano' : 'Saved'}</span
    >{/if}
  {#if error}<p role="alert" class="error">{error}</p>{/if}
  {#if loading}<p role="status">
      {language === 'pl' ? 'Ładowanie ustawień…' : 'Loading settings…'}
    </p>
  {:else if !loaded}<button class="btn btn-outline" type="button" onclick={load}
      >{language === 'pl' ? 'Spróbuj ponownie' : 'Try again'}</button
    >
  {:else}
    <fieldset disabled={saving}>
      <label class="email-toggle"
        ><input type="checkbox" bind:checked={emailEnabled} />{language === 'pl'
          ? 'E-mail o nieprzeczytanych powiadomieniach'
          : 'Email me about unread notifications'}</label
      >
      <p class="field-help">
        {language === 'pl'
          ? 'Otrzymuj przypomnienia o powiadomieniach, których jeszcze nie przeczytano.'
          : 'Get a reminder for notifications you haven’t read yet.'}
      </p>
      <div class="delay-field">
        <label for={`${uid}-delay`}
          >{language === 'pl'
            ? 'Przypomnienie e-mail po (minuty)'
            : 'Email reminder after (minutes)'}</label
        >
        <input
          id={`${uid}-delay`}
          aria-describedby={`${uid}-delay-help`}
          type="number"
          value={emailDelayMinutes}
          onchange={(event) => (emailDelayMinutes = event.currentTarget.valueAsNumber)}
          min="1"
          max="10080"
          step="1"
          required
        />
        <p id={`${uid}-delay-help`} class="field-help">
          {language === 'pl'
            ? 'Na przykład: 60 oznacza, że przypomnienie e-mail może zostać wysłane, jeśli powiadomienie pozostaje nieprzeczytane przez godzinę. Powiadomienia w aplikacji pojawiają się od razu.'
            : 'For example, 60 means an email reminder can be sent if a notification stays unread for an hour. In-app notifications appear immediately.'}
        </p>
      </div>
    </fieldset>
  {/if}
</form>

<style>
  .settings-card {
    padding: 24px;
    position: relative;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .email-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font);
    font-size: 13px;
    color: var(--ink);
    text-transform: none;
    letter-spacing: normal;
  }
  .email-toggle input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--accent);
    flex-shrink: 0;
  }
  .delay-field {
    margin-top: 24px;
  }
  .delay-field input {
    max-width: 140px;
    margin-bottom: 0;
  }
  .save-state {
    position: absolute;
    top: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 13px;
    text-transform: none;
    letter-spacing: normal;
  }
</style>
