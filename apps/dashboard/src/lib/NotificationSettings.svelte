<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Bell, Check, Save } from '@lucide/svelte';

  let { language }: { language: 'pl' | 'en' } = $props();
  const uid = $props.id();
  let emailEnabled = $state(false);
  let emailDelayMinutes = $state(60);
  let loading = $state(true);
  let loaded = $state(false);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');

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
  async function load() {
    loading = true;
    error = '';
    try {
      const preferences = await request();
      emailEnabled = preferences.emailEnabled;
      emailDelayMinutes = preferences.emailDelayMinutes;
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
    try {
      await request('PUT');
      saved = true;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      saving = false;
    }
  }
  onMount(() => {
    void load();
  });
</script>

<a class="back-link" href="/inbox"
  ><ArrowLeft size={15} aria-hidden="true" />{language === 'pl'
    ? 'Powiadomienia'
    : 'Notifications'}</a
>
<div class="workspace-header">
  <div>
    <h1>{language === 'pl' ? 'Ustawienia powiadomień' : 'Notification settings'}</h1>
    <p class="workspace-description">
      {language === 'pl'
        ? 'Wybierz, kiedy otrzymywać przypomnienia e-mail.'
        : 'Choose when to receive email reminders.'}
    </p>
  </div>
</div>
<form
  class="card settings-card"
  onsubmit={(event) => {
    event.preventDefault();
    void save();
  }}
  oninput={() => (saved = false)}
>
  <div class="section-heading">
    <Bell size={18} aria-hidden="true" />
    <h2>{language === 'pl' ? 'Powiadomienia e-mail' : 'Email notifications'}</h2>
  </div>
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
          >{language === 'pl' ? 'Opóźnienie (minuty)' : 'Delay (minutes)'}</label
        >
        <input
          id={`${uid}-delay`}
          type="number"
          bind:value={emailDelayMinutes}
          min="1"
          max="10080"
          step="1"
          required
        />
      </div>
      <div class="save-row">
        <button class="btn" type="submit"
          ><Save size={16} aria-hidden="true" />{language === 'pl'
            ? 'Zapisz ustawienia'
            : 'Save preferences'}</button
        >{#if saved}<span role="status"
            ><Check size={16} aria-hidden="true" />{language === 'pl' ? 'Zapisano' : 'Saved'}</span
          >{/if}
      </div>
    </fieldset>
  {/if}
</form>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 24px;
    text-decoration: none;
  }
  .back-link:hover {
    color: var(--ink);
  }
  .settings-card {
    max-width: 720px;
    padding: 24px;
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
  .save-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }
  .save-row span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
