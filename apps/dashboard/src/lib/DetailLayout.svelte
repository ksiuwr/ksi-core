<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { ArrowLeft, Pencil } from '@lucide/svelte';
  import { Button, Heading, HStack, IconButton, Text, TextInput, VStack } from '@astryx-sv/core';

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

  function startEditing() {
    if (!canEditTitle || busy) return;
    draft = title;
    editing = true;
    void tick().then(() => {
      const input = document.getElementById('detail-title-input') as HTMLInputElement | null;
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

<Button href={backHref} variant="secondary" label={backLabel}>
  {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
</Button>

{#if editing}
  <TextInput
    id="detail-title-input"
    label="Tytuł"
    isLabelHidden
    value={draft}
    onChange={(value) => (draft = value.slice(0, 200))}
    isDisabled={busy}
    hasAutoFocus
    onkeydown={onKeydown}
    onblur={commit}
  />
{:else}
  <HStack gap={2} vAlign="center" wrap="wrap" class="detail-heading">
    <Heading level={1}>
      {title}{#if referenceNumber}<Text type="large" color="secondary" as="span"
          >&nbsp;#{referenceNumber}</Text
        >{/if}
    </Heading>
    {#if canEditTitle}
      <IconButton
        label="Edytuj tytuł"
        tooltip="Edytuj tytuł"
        variant="ghost"
        size="sm"
        isDisabled={busy}
        onclick={startEditing}
      >
        {#snippet icon()}<Pencil size={14} aria-hidden="true" />{/snippet}
      </IconButton>
    {/if}
  </HStack>
{/if}

<VStack gap={0} class="detail-layout">
  <VStack gap={4} class="detail-main">
    {@render children()}
  </VStack>
  {@render aside()}
</VStack>

<style>
  :global(.detail-heading) {
    margin-bottom: var(--spacing-6);
  }
  :global(.detail-layout) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: var(--spacing-8);
    align-items: start;
  }
  :global(.detail-main) {
    min-width: 0;
  }
  @media (max-width: 900px) {
    :global(.detail-layout) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
</style>
