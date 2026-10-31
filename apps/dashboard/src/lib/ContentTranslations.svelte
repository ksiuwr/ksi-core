<script lang="ts">
  import { untrack } from 'svelte';
  import { Check } from '@lucide/svelte';
  import ContentLocaleEditor from './ContentLocaleEditor.svelte';
  import {
    contentLocaleName,
    contentLocales,
    primaryContentLocale,
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
    selected = $bindable<ContentLocale>(primaryContentLocale),
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
    firstName: 'Imię',
    lastName: 'Nazwisko',
    nickname: 'Pseudonim',
    bio: 'Biografia',
    name: 'Nazwa',
    description: 'Opis',
    tags: 'Tagi',
    title: 'Tytuł',
    link: 'Link',
    markdown: 'Treść artykułu'
  };
  const uiLanguage = $derived(preferences.language);
  const localeLabel = (locale: ContentLocale) => contentLocaleName(locale, uiLanguage);
  const fieldsIn = (source: ContentTranslations, locale: ContentLocale) =>
    locale === primaryContentLocale ? undefined : source[locale];
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
        contentLocales.map((locale) => [locale, toDraft(fieldsIn(initial.translations, locale))])
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

  const hasTranslation = (locale: ContentLocale) =>
    hasFields(fieldsIn(workingTranslations, locale));
  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(savedDraft));
  const hasDraftContent = $derived(Object.values(draft).some((value) => value.trim()));
  $effect(() => {
    if (version !== undefined && version !== currentVersion) currentVersion = version;
  });

  function selectLanguage(value: string) {
    const next = value as ContentLocale;
    if (next === selected) return;
    drafts[selected] = draft;
    selected = next;
    const nextDraft = drafts[selected] ?? toDraft(fieldsIn(workingTranslations, selected));
    drafts[selected] = nextDraft;
    savedDraft = savedDrafts[selected] ?? { ...nextDraft };
    draft = nextDraft;
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
    if (selected === primaryContentLocale) return;
    busy = true;
    error = '';
    notice = '';
    try {
      const fields = remove ? {} : fieldsFromDraft();
      if (!remove && !Object.keys(fields).length) {
        error = 'Przed zapisaniem przetłumacz co najmniej jedno pole.';
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
          PRIMARY_CONTENT_REQUIRED: 'Zapisz treść polską przed dodaniem tłumaczenia.',
          REVISION_CONFLICT: 'Treść została zmieniona. Odśwież przed zapisaniem.',
          TRANSLATED_TAG_COUNT: 'Przetłumacz wszystkie tagi w kolejności tagów polskich.'
        };
        throw new Error(messages[result.code] ?? result.code ?? 'Żądanie nie powiodło się');
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
        notice = 'removed';
      } else {
        notice = 'saved';
      }
      await onsaved(result);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Żądanie nie powiodło się';
    } finally {
      busy = false;
    }
  }
</script>

<ContentLocaleEditor
  {selected}
  added={contentLocales.filter(hasTranslation)}
  {busy}
  {dirty}
  canSave={dirty && hasDraftContent}
  onselect={selectLanguage}
  onsave={() => save()}
  onremove={() => save(true)}
>
  {#snippet messages()}
    {#if error}<p class="message error" role="alert">{error}</p>{/if}
    {#if notice}<p class="message success" role="status">
        <Check size={14} />{#if notice === 'saved'}Zapisano tłumaczenie: {localeLabel(
            selected
          )}.{:else}Usunięto tłumaczenie: {localeLabel(selected)}. Odwiedzający zobaczą teraz wersję
          polską.{/if}
      </p>{/if}
  {/snippet}
  {#snippet reference()}
    <div class="reference-grid">
      {#each Object.keys(baseline) as key}
        <div>
          <span>{labels[key]}</span>
          <p>
            {Array.isArray(baseline[key])
              ? (baseline[key] as string[]).join(', ')
              : baseline[key] || 'Brak treści'}
          </p>
        </div>
      {/each}
    </div>
  {/snippet}
</ContentLocaleEditor>

<style>
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
</style>
