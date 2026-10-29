<script lang="ts">
  import { untrack } from 'svelte';
  import { Check, ChevronDown, Eye, Languages, Save, Trash2, X } from '@lucide/svelte';
  import Dropdown, { type DropdownOption } from '@ksi-core/ui/platform/Dropdown.svelte';
  import {
    contentLocaleName,
    contentLocales,
    type ContentLocale,
    type ContentTranslations
  } from 'shared/content-locales';
  import { preferences } from './preferences.svelte';

  let {
    kind,
    id,
    version,
    translations = {},
    baseline,
    selected = $bindable<ContentLocale>('en'),
    draft = $bindable<Record<string, string>>({}),
    onsaved
  }: {
    kind: 'profile' | 'project' | 'article' | 'alert';
    id: string;
    version?: number;
    translations?: ContentTranslations;
    baseline: Record<string, string | string[] | null>;
    selected?: ContentLocale;
    draft?: Record<string, string>;
    onsaved: (result: any) => void | Promise<void>;
  } = $props();

  const labels: Record<string, string> = {
    firstName: 'First name',
    lastName: 'Last name',
    nickname: 'Nickname',
    bio: 'Biography',
    name: 'Name',
    description: 'Description',
    tags: 'Tags',
    title: 'Title',
    link: 'Link',
    markdown: 'Article content'
  };
  const uiLanguage = $derived(preferences.language);
  const localeLabel = (locale: ContentLocale) => contentLocaleName(locale, uiLanguage);
  const localeAutonym = (locale: ContentLocale) => contentLocaleName(locale, locale);
  const hasFields = (fields?: Record<string, string | string[]>) =>
    Boolean(fields && Object.keys(fields).length);
  const toDraft = (fields: Record<string, string | string[]> = {}) =>
    Object.fromEntries(
      Object.keys(baseline).map((key) => [
        key,
        Array.isArray(fields[key]) ? fields[key].join(', ') : ((fields[key] as string) ?? '')
      ])
    );

  const initial = untrack(() => ({ translations, version }));
  const initialDrafts = untrack(
    () =>
      Object.fromEntries(
        contentLocales.map((locale) => [locale, toDraft(initial.translations[locale])])
      ) as Record<ContentLocale, Record<string, string>>
  );
  let workingTranslations = $state<ContentTranslations>({ ...initial.translations });
  let drafts = $state<Record<ContentLocale, Record<string, string>>>({ ...initialDrafts });
  let savedDrafts = $state<Record<ContentLocale, Record<string, string>>>({ ...initialDrafts });
  let savedDraft = $state<Record<string, string>>({ ...initialDrafts[selected] });
  if (!Object.keys(draft).length) draft = drafts[selected];
  let currentVersion = $state(initial.version);
  let busy = $state(false);
  let error = $state('');
  let notice = $state<'saved' | 'removed' | ''>('');
  let confirmingRemoval = $state(false);
  let referenceOpen = $state(false);

  const hasTranslation = (locale: ContentLocale) =>
    locale !== 'en' && hasFields(workingTranslations[locale]);
  const translationExists = $derived(hasTranslation(selected));
  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(savedDraft));
  const hasDraftContent = $derived(Object.values(draft).some((value) => value.trim()));
  const languageOptions = $derived<DropdownOption[]>(
    contentLocales.map((locale) => ({
      value: locale,
      label: localeAutonym(locale),
      description:
        locale === 'en'
          ? 'Primary language'
          : hasTranslation(locale)
            ? 'Translation added'
            : 'Not added',
      indicator: locale === 'en' ? 'Primary' : hasTranslation(locale) ? 'Added' : undefined
    }))
  );

  $effect(() => {
    if (version !== undefined && version !== currentVersion) currentVersion = version;
  });

  function selectLanguage(value: string) {
    const next = value as ContentLocale;
    if (next === selected) return;
    drafts[selected] = draft;
    selected = next;
    const nextDraft = drafts[selected] ?? toDraft(workingTranslations[selected]);
    drafts[selected] = nextDraft;
    savedDraft = savedDrafts[selected] ?? { ...nextDraft };
    draft = nextDraft;
    confirmingRemoval = false;
    error = '';
    notice = '';
  }

  function fieldsFromDraft() {
    return Object.fromEntries(
      Object.entries(draft)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => [
          key,
          key === 'tags'
            ? value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : value
        ])
    );
  }

  export async function saveTranslation() {
    if (!busy && dirty && hasDraftContent) await save();
  }

  async function save(remove = false) {
    if (selected === 'en') return;
    busy = true;
    error = '';
    notice = '';
    try {
      const fields = remove ? {} : fieldsFromDraft();
      if (!remove && !Object.keys(fields).length) {
        error = 'Add at least one translated field before saving.';
        return;
      }
      const response = await fetch(
        `/api/platform/translations/${kind}/${encodeURIComponent(id)}/${selected}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: currentVersion, fields })
        }
      );
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          ENGLISH_CONTENT_REQUIRED: 'Save the English content before adding its translation.',
          REVISION_CONFLICT: 'This content changed. Reload before saving.',
          TRANSLATED_TAG_COUNT: 'Translate every tag in the same order as the English tags.'
        };
        throw new Error(messages[result.code] ?? result.code ?? 'Request failed');
      }

      workingTranslations = { ...((result.translations ?? {}) as ContentTranslations) };
      if (typeof result.version === 'number') currentVersion = result.version;
      drafts[selected] = draft;
      savedDraft = { ...draft };
      savedDrafts[selected] = { ...draft };
      if (remove) {
        drafts[selected] = toDraft();
        draft = { ...drafts[selected] };
        savedDraft = { ...drafts[selected] };
        savedDrafts[selected] = { ...drafts[selected] };
        confirmingRemoval = false;
        notice = 'removed';
      } else {
        notice = 'saved';
      }
      await onsaved(result);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Request failed';
    } finally {
      busy = false;
    }
  }
</script>

<div class="localization">
  <div class="language-bar">
    <div class="language-title">
      <Languages size={17} aria-hidden="true" />
      <strong>Content language</strong>
    </div>

    <div class="language-actions">
      <div
        class="translation-tools-reveal"
        class:open={selected !== 'en'}
        aria-hidden={selected === 'en'}
        inert={selected === 'en'}
      >
        <div class="translation-tools">
          <button
            type="button"
            class="btn btn-outline reference-button"
            aria-expanded={referenceOpen}
            onclick={() => (referenceOpen = !referenceOpen)}
          >
            <Eye size={15} aria-hidden="true" />{'English reference'}
            <ChevronDown size={14} aria-hidden="true" class={referenceOpen ? 'open' : ''} />
          </button>
          {#if confirmingRemoval}
            <button
              type="button"
              class="btn danger-button"
              disabled={busy}
              onclick={() => save(true)}
            >
              <Trash2 size={15} aria-hidden="true" />{'Confirm remove'}
            </button>
            <button
              type="button"
              class="btn btn-outline"
              disabled={busy}
              onclick={() => (confirmingRemoval = false)}
              ><X size={15} aria-hidden="true" />{'Cancel'}</button
            >
          {:else}
            {#if translationExists}
              <button
                type="button"
                class="btn btn-outline remove-button"
                disabled={busy}
                aria-label={`Remove ${localeLabel(selected)} translation`}
                title={`Remove ${localeLabel(selected)} translation`}
                onclick={() => (confirmingRemoval = true)}
                ><Trash2 size={15} aria-hidden="true" /></button
              >
            {/if}
            <button
              type="button"
              class="btn"
              disabled={busy || !dirty || !hasDraftContent}
              onclick={() => save()}
              ><Save size={15} aria-hidden="true" />{'Save translation'}</button
            >
          {/if}
        </div>
      </div>

      <Dropdown
        label={'Content language'}
        value={selected}
        options={languageOptions}
        onselect={selectLanguage}
        disabled={busy}
        variant="compact"
      />
    </div>
  </div>

  <div
    class="translation-context-reveal"
    class:open={selected !== 'en'}
    aria-hidden={selected === 'en'}
  >
    <div>
      <div class="translation-context">
        <span class="tag">{translationExists ? 'Added' : 'New'}</span>
        <p>
          You are editing the {localeLabel(selected)} translation. Blank fields use the English value
          shown in the reference.
        </p>
        {#if dirty}<span class="dirty"><span></span>{'Unsaved changes'}</span>{/if}
      </div>
    </div>
  </div>

  {#if error}<p class="message error" role="alert">{error}</p>{/if}
  {#if notice}<p class="message success" role="status">
      <Check size={14} />{#if notice === 'saved'}{localeLabel(selected)} translation saved.{:else}{localeLabel(
          selected
        )} was removed. Visitors will now see English.{/if}
    </p>{/if}

  <div
    class="reference-reveal"
    class:open={selected !== 'en' && referenceOpen}
    aria-hidden={selected === 'en' || !referenceOpen}
    inert={selected === 'en' || !referenceOpen}
  >
    <div>
      <div class="reference-panel">
        <header>
          <div><strong>English reference</strong><span>Read only</span></div>
          <p>Use this as context while writing the translation.</p>
        </header>
        <div class="reference-grid">
          {#each Object.keys(baseline) as key}
            <div>
              <span>{labels[key]}</span>
              <p>
                {Array.isArray(baseline[key])
                  ? (baseline[key] as string[]).join(', ')
                  : baseline[key] || 'No content'}
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .localization {
    margin-bottom: 16px;
    container-type: inline-size;
  }
  .language-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 16px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }
  .language-title,
  .language-actions {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .language-title > :global(svg) {
    color: var(--muted);
    flex-shrink: 0;
  }
  .language-title strong {
    font-size: 12px;
    white-space: nowrap;
  }
  .language-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .language-actions :global(.dropdown) {
    flex: 0 0 165px;
    width: 165px;
  }
  .translation-tools-reveal {
    flex: 0 0 auto;
    max-width: 0;
    max-height: 60px;
    margin-inline-end: -9px;
    overflow: hidden;
    opacity: 0;
    transform: translateX(-7px);
    transition:
      max-width var(--dur, 180ms) var(--ease-out),
      max-height var(--dur, 180ms) var(--ease-out),
      margin var(--dur, 180ms) var(--ease-out),
      opacity var(--dur-fast, 140ms) ease,
      transform var(--dur, 180ms) var(--ease-out);
  }
  .translation-tools-reveal.open {
    max-width: 650px;
    margin-inline-end: 0;
    opacity: 1;
    transform: translateX(0);
  }
  .translation-tools {
    display: flex;
    align-items: center;
    gap: 9px;
    width: max-content;
  }
  .reference-button :global(svg:last-child) {
    transition: transform var(--dur-fast, 140ms) var(--ease-out);
  }
  .reference-button :global(svg:last-child.open) {
    transform: rotate(180deg);
  }
  .remove-button {
    width: 34px;
    padding: 0;
    color: var(--danger);
  }
  .translation-context-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transform: translateY(-4px);
    transition:
      grid-template-rows var(--dur, 180ms) var(--ease-out),
      opacity var(--dur-fast, 140ms) ease,
      transform var(--dur, 180ms) var(--ease-out);
  }
  .translation-context-reveal.open {
    grid-template-rows: 1fr;
    opacity: 1;
    transform: translateY(0);
  }
  .translation-context-reveal > div {
    min-height: 0;
    overflow: hidden;
  }
  .translation-context {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px 0;
  }
  .translation-context p {
    flex: 1;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .dirty {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--muted);
    font-size: 11px;
  }
  .dirty > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .message {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 0 0;
    padding: 9px 11px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 12px;
  }
  .message.error {
    border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
    color: var(--danger);
  }
  .message.success {
    background: var(--surface-muted);
  }
  .reference-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transform: translateY(-5px);
    transition:
      grid-template-rows var(--dur, 180ms) var(--ease-out),
      opacity var(--dur-fast, 140ms) ease,
      transform var(--dur, 180ms) var(--ease-out);
  }
  .reference-reveal.open {
    grid-template-rows: 1fr;
    opacity: 1;
    transform: translateY(0);
  }
  .reference-reveal > div {
    min-height: 0;
    overflow: hidden;
  }
  .reference-panel {
    margin-top: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }
  .reference-panel > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  .reference-panel header div {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .reference-panel header span,
  .reference-panel header p {
    color: var(--muted);
    font-size: 11px;
  }
  .reference-panel header p {
    margin: 0;
  }
  .reference-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    background: var(--border);
  }
  .reference-grid > div {
    min-width: 0;
    padding: 11px 12px;
    background: var(--surface);
  }
  .reference-grid > div > span {
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .reference-grid p {
    max-height: 190px;
    margin: 5px 0 0;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
  }
  @container (max-width: 700px) {
    .language-bar,
    .language-actions {
      align-items: stretch;
      flex-direction: column;
    }
    .language-actions :global(.dropdown) {
      order: -1;
      flex: none;
      width: 100%;
    }
    .language-actions .btn {
      width: 100%;
    }
    .translation-tools-reveal,
    .translation-tools-reveal.open {
      width: 100%;
      max-width: none;
      margin: 0;
      transform: translateY(-4px);
    }
    .translation-tools-reveal {
      max-height: 0;
    }
    .translation-tools-reveal.open {
      max-height: 220px;
      transform: translateY(0);
    }
    .translation-tools {
      flex-direction: column;
      width: 100%;
    }
    .translation-context {
      align-items: flex-start;
      flex-wrap: wrap;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reference-reveal,
    .translation-context-reveal,
    .translation-tools-reveal,
    .reference-button :global(svg:last-child) {
      transition: none;
    }
  }
</style>
