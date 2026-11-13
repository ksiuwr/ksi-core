<script lang="ts">
  import { onDestroy } from 'svelte';
  import { UploadCloud, X } from '@lucide/svelte';
  import { Button, FileInput, HStack, Text, VStack } from '@astryx-sv/core';

  let {
    fileId = $bindable<string | null>(null),
    uploading = $bindable(false),
    disabled = false
  }: { fileId?: string | null; uploading?: boolean; disabled?: boolean } = $props();
  let error = $state('');
  let active = true;
  onDestroy(() => {
    active = false;
  });

  async function upload(file: File | undefined) {
    if (!file || uploading || disabled) return;
    error = '';
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      error = 'Wybierz obraz JPEG, PNG, WebP, AVIF lub GIF o rozmiarze do 20 MiB.';
      return;
    }
    uploading = true;
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/files', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.code ?? 'Nie udało się przesłać pliku.');
      if (active) fileId = result.id;
    } catch (e) {
      if (active) error = e instanceof Error ? e.message : 'Nie udało się przesłać pliku.';
    } finally {
      if (active) uploading = false;
    }
  }
</script>

<VStack gap={3} class="article-thumbnail">
  {#if fileId}
    <img src={`/media/${encodeURIComponent(fileId)}`} alt="Podgląd miniatury" />
  {/if}
  {#if !disabled}
    <FileInput
      label="Miniatura (opcjonalnie)"
      isOptional
      description="Wyświetlana na listach artykułów. Wybierz obraz niezależnie od treści artykułu."
      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
      mode="dropzone"
      placeholder="Wybierz miniaturę"
      value={null}
      isLoading={uploading}
      status={error ? { type: 'error', message: error } : undefined}
      onChange={(files) => {
        if (files instanceof File) void upload(files);
      }}
    />
    <HStack gap={2} wrap="wrap">
      {#if fileId}
        <Button
          variant="secondary"
          label="Usuń miniaturę"
          isDisabled={uploading}
          onclick={() => (fileId = null)}
        >
          {#snippet icon()}<X size={16} aria-hidden="true" />{/snippet}
        </Button>
      {/if}
    </HStack>
  {:else if error}
    <Text role="alert" class="error-text">{error}</Text>
  {/if}
</VStack>

<style>
  :global(.article-thumbnail) {
    margin-block: var(--spacing-5);
  }
  img {
    display: block;
    width: 100%;
    max-width: 420px;
    max-height: 240px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: var(--radius-element);
  }
  :global(.error-text) {
    color: var(--color-error);
  }
</style>
