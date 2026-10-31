<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown, Eye, Languages, Save, Trash2, X } from '@lucide/svelte';
  import Dropdown, { type DropdownOption } from '@ksi-core/ui/platform/Dropdown.svelte';
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
  const languageOptions = $derived<DropdownOption[]>(
    contentLocales.map((locale) => ({
      value: locale,
      label: contentLocaleName(locale, locale),
      description:
        locale === primaryContentLocale
          ? 'Primary language'
          : added.includes(locale)
            ? 'Translation added'
            : 'Not added',
      indicator:
        locale === primaryContentLocale ? 'Primary' : added.includes(locale) ? 'Added' : undefined
    }))
  );
  function selectLanguage(value: string) {
    if (value === selected) return;
    confirmingRemoval = false;
    if (onselect) onselect(value);
    else selected = value as ContentLocale;
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
        class:open={selected !== primaryContentLocale}
        aria-hidden={selected === primaryContentLocale}
        inert={selected === primaryContentLocale}
      >
        <div class="translation-tools">
          <button
            type="button"
            class="btn btn-outline reference-button"
            aria-expanded={referenceOpen}
            onclick={() => (referenceOpen = !referenceOpen)}
          >
            <Eye size={15} aria-hidden="true" />{'Polish reference'}
            <ChevronDown size={14} aria-hidden="true" class={referenceOpen ? 'open' : ''} />
          </button>
          {#if confirmingRemoval}
            <button
              type="button"
              class="btn danger-button"
              disabled={busy}
              onclick={async () => {
                await onremove?.();
                confirmingRemoval = false;
              }}
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
            {#if translationExists && onremove}
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
            {#if onsave}
              <button
                type="button"
                class="btn"
                disabled={busy || !canSave}
                onclick={() => onsave?.()}
                ><Save size={15} aria-hidden="true" />{'Save translation'}</button
              >
            {/if}
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
    class:open={selected !== primaryContentLocale}
    aria-hidden={selected === primaryContentLocale}
  >
    <div>
      <div class="translation-context">
        <span class="tag">{translationExists ? 'Added' : 'New'}</span>
        <p>
          You are editing the {localeLabel(selected)} translation. Blank fields use the Polish value shown
          in the reference.
        </p>
        {#if dirty}<span class="dirty"><span></span>{'Unsaved changes'}</span>{/if}
      </div>
      {#if saveHint}<p class="save-hint">{saveHint}</p>{/if}
    </div>
  </div>

  {#if messages}{@render messages()}{/if}

  <div
    class="reference-reveal"
    class:open={selected !== primaryContentLocale && referenceOpen}
    aria-hidden={selected === primaryContentLocale || !referenceOpen}
    inert={selected === primaryContentLocale || !referenceOpen}
  >
    <div>
      <div class="reference-panel">
        <header>
          <div><strong>Polish reference</strong><span>Read only</span></div>
          <p>Use this as context while writing the translation.</p>
        </header>
        {@render reference()}
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
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
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
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }
  .reference-panel > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
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
  .save-hint {
    margin: 8px 12px 0;
    color: var(--muted);
    font-size: 12px;
  }
  @container (max-width: 460px) {
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
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
    }
    .translation-context > .tag {
      justify-self: start;
    }
    .translation-context p {
      grid-column: 1 / -1;
      grid-row: 2;
    }
    .reference-panel > header {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
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
