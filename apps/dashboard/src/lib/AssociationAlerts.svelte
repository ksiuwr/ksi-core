<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import {
    ArrowUpRight,
    Check,
    Info,
    Megaphone,
    OctagonAlert,
    Pencil,
    Plus,
    Save,
    Trash2,
    TriangleAlert
  } from '@lucide/svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import DateTimeRangePicker from '@ksi-core/ui/platform/DateTimeRangePicker.svelte';
  import type { AssociationAlert } from 'shared/types';
  import { preferences } from './preferences.svelte';
  import { api, errorMessage } from './api';
  import SettingsNav from './SettingsNav.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import {
    localizeContent,
    type ContentLocale,
    type ContentTranslations as TranslationData
  } from 'shared/content-locales';

  let {
    alerts,
    page,
    websiteOrigin
  }: {
    alerts: { results: AssociationAlert[]; pages: number };
    page: number;
    websiteOrigin: string;
  } = $props();

  let editing = $state(false);
  let editingId = $state<string | null>(null);
  let contentLocale = $state<ContentLocale>('en');
  let translationDraft = $state<Record<string, string>>({});
  let translations = $state<TranslationData>({});
  let version = $state<number>();
  let translationEditor = $state<ContentTranslations>();
  let title = $state('');
  let description = $state('');
  let link = $state('');
  let color = $state<AssociationAlert['color']>('info');
  let priority = $state(0);
  let start = $state('');
  let end = $state('');
  let busy = $state(false);
  let error = $state('');
  let saved = $state(false);
  let removing = $state<AssociationAlert | null>(null);
  let now = $state(Date.now());
  const uid = $props.id();
  const Icon = $derived(
    { info: Info, danger: OctagonAlert, warning: TriangleAlert, neutral: Megaphone }[color]
  );
  const preview = $derived(
    localizeContent(
      {
        title,
        description,
        link,
        translations: contentLocale === 'en' ? {} : { [contentLocale]: translationDraft }
      },
      contentLocale
    )
  );

  type AlertTextField = 'title' | 'description' | 'link';
  function localized(key: AlertTextField) {
    const english = { title, description, link }[key];
    return contentLocale === 'en' ? english : (translationDraft[key] ?? '');
  }
  function setLocalized(key: AlertTextField, value: string) {
    if (contentLocale !== 'en') translationDraft[key] = value;
    else if (key === 'title') title = value;
    else if (key === 'description') description = value;
    else link = value;
  }
  async function translationSaved(result: AssociationAlert) {
    translations = result.translations;
    version = result.version;
    await invalidateAll();
  }

  const validInterval = $derived(!!start && !!end && new Date(end) > new Date(start));

  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 30000);
    return () => clearInterval(timer);
  });

  function localDate(raw: string | Date) {
    const date = new Date(raw);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function formatDate(raw: string) {
    return new Intl.DateTimeFormat(preferences.language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(raw));
  }

  async function edit(alert?: AssociationAlert) {
    editingId = alert?.id ?? null;
    contentLocale = 'en';
    translationDraft = {};
    translations = alert?.translations ?? {};
    version = alert?.version;
    title = alert?.title ?? '';
    description = alert?.description ?? '';
    link = alert?.link ?? '';
    color = alert?.color ?? 'info';
    priority = alert?.priority ?? 0;
    start = localDate(alert?.startDate ?? new Date());
    end = localDate(alert?.endDate ?? new Date(Date.now() + 7 * 86400000));
    error = '';
    saved = false;
    editing = true;
    await tick();
    document.getElementById(`${uid}-title`)?.focus();
  }

  function saveShortcut(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !event.ctrlKey || event.isComposing) return;
    const form = event.target instanceof Element ? event.target.closest('form.alert-editor') : null;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (busy || event.repeat) return;
    if (contentLocale === 'en') form.requestSubmit();
    else void translationEditor?.saveTranslation();
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (contentLocale !== 'en' || busy || !validInterval || !title.trim()) return;
    busy = true;
    error = '';
    saved = false;
    try {
      await api(
        `/dashboard/admin/alerts${editingId ? `/${encodeURIComponent(editingId)}` : ''}`,
        editingId ? 'PUT' : 'POST',
        {
          version,
          title: title.trim(),
          description: description.trim(),
          link: link.trim(),
          color,
          priority,
          startDate: new Date(start).toISOString(),
          endDate: new Date(end).toISOString()
        }
      );
      editing = false;
      saved = true;
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!removing || busy) return;
    busy = true;
    error = '';
    saved = false;
    try {
      await api(`/dashboard/admin/alerts/${encodeURIComponent(removing.id)}`, 'DELETE');
      if (editingId === removing.id) editing = false;
      removing = null;
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:window onkeydown={saveShortcut} />

<div class="workspace-header">
  <div>
    <h1>Association settings</h1>
    <p>Manage announcements on the public website.</p>
  </div>
  <a class="btn btn-outline" href={websiteOrigin} target="_blank" rel="noopener noreferrer">
    <ArrowUpRight size={15} aria-hidden="true" />{'View website'}
  </a>
</div>

<div class="settings-layout">
  <SettingsNav
    label="Association settings"
    items={[{ id: 'alerts', label: 'Website alerts', icon: Megaphone }]}
  />
  <div class="settings-main">
    <section id="alerts" class="settings-section" aria-labelledby={`${uid}-heading`}>
      <header class="alerts-heading">
        <div>
          <h2 id={`${uid}-heading`}>Website alerts</h2>
          <p class="muted">
            Alerts appear only during their display interval. When intervals overlap, the highest
            priority wins; ties show the most recently started alert.
          </p>
        </div>
        <button class="btn" disabled={busy} onclick={() => void edit()}
          ><Plus size={15} aria-hidden="true" />{'New alert'}</button
        >
      </header>

      {#if error}
        <p class="error" role="alert">
          {#if error === 'INVALID_ALERT_INTERVAL'}The end must be after the start.
          {:else if error === 'REVISION_CONFLICT'}This content changed. Reload before saving.
          {:else}Could not save the changes. Check the link and try again.{/if}
        </p>
      {/if}
      {#if saved}
        <p class="save-notice" role="status">
          <Check size={16} aria-hidden="true" />{'Alert saved.'}
        </p>
      {/if}

      {#if editing}
        <form class="card settings-card alert-editor" onsubmit={save}>
          <h3>
            {#if editingId}Edit alert{:else}Create alert{/if}
          </h3>
          {#if editingId}
            {#key editingId}
              <ContentTranslations
                bind:this={translationEditor}
                kind="alert"
                id={editingId}
                {version}
                {translations}
                baseline={{ title, description, link }}
                bind:selected={contentLocale}
                bind:draft={translationDraft}
                onsaved={translationSaved}
              />
            {/key}
          {:else}
            <p class="muted field-help">Save the English alert before adding translations.</p>
          {/if}
          <fieldset disabled={busy} class="editor-fields">
            <label for={`${uid}-title`}>Title</label>
            <input
              id={`${uid}-title`}
              bind:value={() => localized('title'), (value) => setLocalized('title', value)}
              required={contentLocale === 'en'}
              maxlength="200"
            />
            <label for={`${uid}-content`}>Content</label>
            <textarea
              id={`${uid}-content`}
              bind:value={
                () => localized('description'), (value) => setLocalized('description', value)
              }
              maxlength="2000"
              rows="3"
            ></textarea>
            {#if contentLocale === 'en'}
              <div class="editor-row">
                <div>
                  <label for={`${uid}-style`}>Style</label>
                  <Dropdown
                    id={`${uid}-style`}
                    label="Style"
                    value={color}
                    options={[
                      { value: 'info', label: 'Info' },
                      { value: 'danger', label: 'Danger' },
                      { value: 'warning', label: 'Warning' },
                      { value: 'neutral', label: 'Neutral' }
                    ]}
                    disabled={busy}
                    onselect={(value) => (color = value as AssociationAlert['color'])}
                  />
                </div>
                <div>
                  <label for={`${uid}-priority`}>Priority</label>
                  <input
                    id={`${uid}-priority`}
                    type="number"
                    bind:value={priority}
                    required
                    min="-2147483648"
                    max="2147483647"
                    step="1"
                  />
                </div>
              </div>
            {/if}
            <label for={`${uid}-link`}>Link (optional)</label>
            <input
              id={`${uid}-link`}
              bind:value={() => localized('link'), (value) => setLocalized('link', value)}
              maxlength="2000"
              placeholder="https://… or /projects"
              aria-describedby={`${uid}-link-help`}
            />
            <p id={`${uid}-link-help`} class="muted field-help">
              {#if contentLocale === 'en'}
                Use a website path, an HTTP(S) URL, or a mailto link. Leave empty for a banner
                without a link.
              {:else}
                Leave blank to use the English link.
              {/if}
            </p>
            {#if contentLocale === 'en'}
              <DateTimeRangePicker bind:start bind:end disabled={busy} />
              <p class="muted field-help">
                Dates use your local time zone. They are saved as absolute instants.
              </p>
            {/if}
            <div class="preview-label">Preview</div>
            <div class="alert-preview" data-color={color}>
              <Icon size={18} class="preview-icon" aria-hidden="true" />
              <p>
                <strong
                  >{#if preview.title.trim()}{preview.title}{:else}Your alert title{/if}</strong
                ><span>{preview.description}</span>
              </p>
              {#if preview.link.trim()}<ArrowUpRight size={17} aria-hidden="true" />{/if}
            </div>
          </fieldset>
          <div class="editor-actions">
            <button
              type="button"
              class="btn btn-outline"
              disabled={busy}
              onclick={() => (editing = false)}>Cancel</button
            >
            {#if contentLocale === 'en'}
              <button
                class="btn"
                aria-keyshortcuts="Control+Enter"
                disabled={busy || !validInterval || !title.trim()}
                ><Save size={15} aria-hidden="true" />{#if busy}Saving…{:else}Save alert{/if}</button
              >
            {/if}
          </div>
        </form>
      {/if}

      <div class="card alert-list">
        {#each alerts.results as alert (alert.id)}
          <article class="alert-row">
            <div class="alert-details">
              <div class="alert-title">
                <h3>{alert.title}</h3>
                <span class="tag"
                  >{#if new Date(alert.startDate).getTime() > now}Scheduled{:else if new Date(alert.endDate).getTime() <= now}Expired{:else}Active
                    interval{/if}</span
                >
                <span class="tag"
                  >{#if alert.color === 'info'}Info{:else if alert.color === 'danger'}Danger{:else if alert.color === 'warning'}Warning{:else}Neutral{/if}</span
                >
              </div>
              {#if alert.description}<p class="alert-description">{alert.description}</p>{/if}
              <p class="muted interval-summary">
                <time datetime={alert.startDate}>{formatDate(alert.startDate)}</time><span
                  aria-hidden="true"
                >
                  →
                </span><time datetime={alert.endDate}>{formatDate(alert.endDate)}</time>
              </p>
              <p class="muted alert-meta">
                <span>Priority: {alert.priority ?? 0}</span>{#if alert.link}<span
                    aria-hidden="true"
                  >
                    ·
                  </span><span class="alert-link">{alert.link}</span>{/if}
              </p>
            </div>
            <div class="alert-actions">
              <button class="btn btn-outline" disabled={busy} onclick={() => void edit(alert)}
                ><Pencil size={14} aria-hidden="true" />{'Edit'}</button
              >
              <button
                class="btn btn-outline"
                disabled={busy}
                aria-label="Delete alert"
                onclick={() => (removing = alert)}><Trash2 size={14} aria-hidden="true" /></button
              >
            </div>
          </article>
        {:else}
          <div class="empty-alerts">
            <Megaphone size={24} aria-hidden="true" />
            <h3>No alerts yet</h3>
            <p class="muted">Create an announcement and choose when it appears on the website.</p>
          </div>
        {/each}
      </div>
      {#if alerts.pages > 1}
        <nav class="pagination" aria-label="Alert pages">
          {#if page > 0}<a class="btn btn-outline" href={`?page=${page - 1}`}>Previous</a>{/if}
          <span>{page + 1} / {alerts.pages}</span>
          {#if page + 1 < alerts.pages}<a class="btn btn-outline" href={`?page=${page + 1}`}>Next</a
            >{/if}
        </nav>
      {/if}
    </section>
  </div>
</div>

<ConfirmDialog
  open={!!removing}
  title="Delete alert?"
  message="This removes the announcement from the schedule and the public website."
  {busy}
  onconfirm={() => void remove()}
  onclose={() => (removing = null)}
/>

<style>
  .alerts-heading,
  .alert-title,
  .alert-actions,
  .editor-actions,
  .pagination {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .alerts-heading {
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }
  .alerts-heading p {
    max-width: 640px;
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.6;
  }
  .alerts-heading > button {
    flex-shrink: 0;
  }
  .save-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--mint);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.5;
  }
  .save-notice :global(svg) {
    flex-shrink: 0;
  }
  .alert-editor {
    margin-bottom: 20px;
  }
  .alert-editor h3 {
    margin-top: 0;
  }
  .editor-fields {
    display: flex;
    flex-direction: column;
    gap: 9px;
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .editor-fields label,
  .preview-label {
    font-size: 13px;
    font-weight: 600;
  }
  .editor-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 8px 0;
  }
  .editor-row > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field-help {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.6;
  }
  .editor-actions {
    justify-content: flex-end;
    margin-top: 20px;
  }
  .alert-preview {
    --alert-tone: var(--muted);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid color-mix(in oklch, var(--alert-tone) 26%, var(--line));
    border-radius: var(--radius-md);
    background: color-mix(in oklch, var(--alert-tone) 9%, var(--paper));
  }
  .alert-preview[data-color='info'] {
    --alert-tone: oklch(0.6 0.14 250);
  }
  .alert-preview[data-color='danger'] {
    --alert-tone: var(--danger);
  }
  .alert-preview[data-color='warning'] {
    --alert-tone: oklch(0.7 0.14 70);
  }
  .alert-preview :global(.preview-icon) {
    color: var(--alert-tone);
    flex-shrink: 0;
  }
  .alert-preview p {
    flex: 1;
    margin: 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .alert-preview span {
    color: var(--muted);
    margin-left: 6px;
    white-space: pre-line;
  }
  .alert-list {
    padding: 0;
    overflow: hidden;
  }
  .alert-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px;
    gap: 16px;
  }
  .alert-row + .alert-row {
    border-top: 1px solid var(--line);
  }
  .alert-details {
    min-width: 0;
  }
  .alert-title {
    flex-wrap: wrap;
  }
  .alert-title h3 {
    margin: 0;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .alert-description {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  .alert-row p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
  }
  .interval-summary,
  .alert-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .alert-link {
    overflow-wrap: anywhere;
  }
  .empty-alerts {
    display: grid;
    justify-items: center;
    padding: 40px 24px;
    text-align: center;
  }
  .empty-alerts h3 {
    margin: 12px 0 0;
    font-size: 15px;
  }
  .pagination {
    justify-content: flex-end;
    margin-top: 16px;
    font-size: 13px;
  }
  @media (max-width: 600px) {
    .alerts-heading,
    .alert-row {
      flex-direction: column;
    }
    .editor-row {
      grid-template-columns: 1fr;
    }
    .alert-actions {
      align-self: flex-end;
    }
  }
</style>
