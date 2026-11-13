<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown, Eye, Languages, Save, Trash2, X } from '@lucide/svelte';
  import {
    Badge,
    Button,
    Card,
    Heading,
    HStack,
    IconButton,
    Selector,
    StatusDot,
    Text,
    VStack
  } from '@astryx-sv/core';
  import {
    contentLocaleName,
    contentLocales,
    primaryContentLocale,
    type ContentLocale
  } from 'shared/content-locales';
  import { preferences } from './preferences.svelte';

  let {
    selected = $bindable<ContentLocale>(primaryContentLocale),
    added = [],
    busy = false,
    dirty = false,
    canSave = false,
    saveHint = '',
    onselect,
    onsave,
    onremove,
    reference,
    messages
  }: {
    selected?: ContentLocale;
    added?: ContentLocale[];
    busy?: boolean;
    dirty?: boolean;
    canSave?: boolean;
    saveHint?: string;
    onselect?: (value: string) => void;
    onsave?: () => void | Promise<void>;
    onremove?: () => void | Promise<void>;
    reference: Snippet;
    messages?: Snippet;
  } = $props();
  let referenceOpen = $state(false);
  let confirmingRemoval = $state(false);
  const uiLanguage = $derived(preferences.language);
  const localeLabel = (locale: ContentLocale) => contentLocaleName(locale, uiLanguage);
  const translationExists = $derived(added.includes(selected));
  const translating = $derived(selected !== primaryContentLocale);
  const languageOptions = $derived(
    contentLocales.map((locale) => ({
      value: locale,
      label: contentLocaleName(locale, locale),
      description:
        locale === primaryContentLocale
          ? 'Język główny'
          : added.includes(locale)
            ? 'Tłumaczenie dodane'
            : 'Nie dodano'
    }))
  );
  function selectLanguage(value: string) {
    if (value === selected) return;
    confirmingRemoval = false;
    if (onselect) onselect(value);
    else selected = value as ContentLocale;
  }
</script>

<VStack gap={3} class="localization">
  <Card>
    <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
      <HStack gap={2} vAlign="center">
        <Languages size={17} aria-hidden="true" />
        <Text type="label" weight="semibold">Język treści</Text>
      </HStack>

      <HStack gap={2} vAlign="center" wrap="wrap">
        {#if translating}
          <Button
            variant="secondary"
            label="Polski tekst źródłowy"
            aria-expanded={referenceOpen}
            onclick={() => (referenceOpen = !referenceOpen)}
          >
            {#snippet icon()}<Eye size={15} aria-hidden="true" />{/snippet}
            {#snippet endContent()}
              <ChevronDown
                size={14}
                aria-hidden="true"
                class={referenceOpen ? 'chevron open' : 'chevron'}
              />
            {/snippet}
          </Button>
          {#if confirmingRemoval}
            <Button
              variant="destructive"
              label="Usuń trwale"
              isDisabled={busy}
              onclick={async () => {
                await onremove?.();
                confirmingRemoval = false;
              }}
            >
              {#snippet icon()}<Trash2 size={15} aria-hidden="true" />{/snippet}
            </Button>
            <Button
              variant="secondary"
              label="Anuluj"
              isDisabled={busy}
              onclick={() => (confirmingRemoval = false)}
            >
              {#snippet icon()}<X size={15} aria-hidden="true" />{/snippet}
            </Button>
          {:else}
            {#if translationExists && onremove}
              <IconButton
                label={`Usuń tłumaczenie: ${localeLabel(selected)}`}
                tooltip={`Usuń tłumaczenie: ${localeLabel(selected)}`}
                variant="secondary"
                isDisabled={busy}
                onclick={() => (confirmingRemoval = true)}
              >
                {#snippet icon()}<Trash2 size={15} aria-hidden="true" />{/snippet}
              </IconButton>
            {/if}
            {#if onsave}
              <Button
                label="Zapisz tłumaczenie"
                isDisabled={busy || !canSave}
                isLoading={busy}
                onclick={() => onsave?.()}
              >
                {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
              </Button>
            {/if}
          {/if}
        {/if}
        <VStack class="language-selector" gap={0}>
          <Selector
            label="Język treści"
            isLabelHidden
            value={selected}
            options={languageOptions}
            isDisabled={busy}
            onChange={selectLanguage}
          />
        </VStack>
      </HStack>
    </HStack>
  </Card>

  {#if translating}
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Badge
        label={translationExists ? 'Dodano' : 'Nowe'}
        variant={translationExists ? 'success' : 'neutral'}
      />
      <Text type="supporting" color="secondary">
        Edytujesz tłumaczenie: {localeLabel(selected)}. Puste pola użyją polskiej wartości widocznej
        w podglądzie.
      </Text>
      {#if dirty}
        <HStack gap={1} vAlign="center">
          <StatusDot variant="warning" label="Niezapisane zmiany" />
          <Text type="supporting" color="secondary">Niezapisane zmiany</Text>
        </HStack>
      {/if}
    </HStack>
    {#if saveHint}<Text type="supporting" color="secondary">{saveHint}</Text>{/if}
  {/if}

  {#if messages}{@render messages()}{/if}

  {#if translating && referenceOpen}
    <Card variant="muted">
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
          <VStack gap={0}>
            <Heading level={3}>Polski tekst źródłowy</Heading>
            <Text type="supporting" color="secondary">Tylko do odczytu</Text>
          </VStack>
          <Text type="supporting" color="secondary">
            Użyj tego tekstu jako kontekstu podczas pisania tłumaczenia.
          </Text>
        </HStack>
        {@render reference()}
      </VStack>
    </Card>
  {/if}
</VStack>

<style>
  :global(.language-selector) {
    width: 165px;
    min-width: 0;
  }
  :global(.chevron) {
    transition: transform var(--duration-fast) ease;
  }
  :global(.chevron.open) {
    transform: rotate(180deg);
  }
  @media (max-width: 460px) {
    :global(.language-selector) {
      width: 100%;
    }
  }
</style>
