<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { ArrowLeft, Pencil } from '@lucide/svelte';

  let {
    backHref,
    backLabel,
    title,
    referenceNumber = null,
    canEditTitle = false,
    busy = false,
    onSaveTitle,
    children,
    aside
  }: {
    backHref: string;
    backLabel: string;
    title: string;
    referenceNumber?: number | null;
    canEditTitle?: boolean;
    busy?: boolean;
    onSaveTitle: (title: string) => void | Promise<void>;
    children: Snippet;
    aside: Snippet;
  } = $props();

  let editing = $state(false);
  let draft = $state('');
  let input = $state<HTMLInputElement>();

  function startEditing() {
    if (!canEditTitle || busy) return;
    draft = title;
    editing = true;
    void tick().then(() => {
      input?.focus();
      input?.select();
    });
  }

  function commit() {
    if (!editing) return;
    const next = draft.trim();
    editing = false;
    if (!next || next === title) return;
    void onSaveTitle(next);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editing = false;
    }
  }
</script>

<a class="btn btn-outline detail-back" href={backHref}
  ><ArrowLeft size={15} aria-hidden="true" />{backLabel}</a
>

<header class="detail-heading">
  <div class="detail-heading-main">
    {#if editing}
      <input
        bind:this={input}
        class="detail-title-input"
        bind:value={draft}
        maxlength="200"
        aria-label={'Title'}
        disabled={busy}
        onkeydown={onKeydown}
        onblur={commit}
      />
    {:else}
      <h1 class="detail-title">
        {title}{#if referenceNumber}<span class="detail-reference">&nbsp;#{referenceNumber}</span
          >{/if}{#if canEditTitle}<button
            type="button"
            class="icon-button title-edit"
            aria-label={'Edit title'}
            title={'Edit title'}
            disabled={busy}
            onclick={startEditing}><Pencil size={14} aria-hidden="true" /></button
          >{/if}
      </h1>
    {/if}
  </div>
</header>

<div class="detail-layout">
  <div class="detail-main">
    {@render children()}
  </div>
  {@render aside()}
</div>
