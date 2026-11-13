<script lang="ts">
  import { untrack } from 'svelte';
  import { Banner, MetadataList, MetadataListItem } from '@astryx-sv/core';
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
    {#if error}
      <Banner status="error" title={error} role="alert" />
    {:else if notice}
      <Banner
        status="success"
        title={notice === 'saved'
          ? `Zapisano tłumaczenie: ${localeLabel(selected)}.`
          : `Usunięto tłumaczenie: ${localeLabel(selected)}. Odwiedzający zobaczą teraz wersję polską.`}
        role="status"
      />
    {/if}
  {/snippet}
  {#snippet reference()}
    <MetadataList>
      {#each Object.keys(baseline) as key}
        <MetadataListItem label={labels[key] ?? key}>
          {Array.isArray(baseline[key])
            ? (baseline[key] as string[]).join(', ')
            : baseline[key] || 'Brak treści'}
        </MetadataListItem>
      {/each}
    </MetadataList>
  {/snippet}
</ContentLocaleEditor>
