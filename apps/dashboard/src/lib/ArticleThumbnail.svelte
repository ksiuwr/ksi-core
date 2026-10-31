<script lang="ts">
  import { onDestroy } from 'svelte';
  import { UploadCloud, X } from '@lucide/svelte';

  let {
    fileId = $bindable<string | null>(null),
    uploading = $bindable(false),
    disabled = false
  }: { fileId?: string | null; uploading?: boolean; disabled?: boolean } = $props();
  const uid = $props.id();
  let error = $state('');
  let active = true;
  onDestroy(() => {
    active = false;
  });

  async function upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file || uploading || disabled) return;
    error = '';
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      error = 'Wybierz obraz JPEG, PNG, WebP, AVIF lub GIF o rozmiarze do 20 MiB.';
      input.value = '';
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
      input.value = '';
    }
  }
</script>

<div class="article-thumbnail">
  <label for={uid}>Miniatura (opcjonalnie)</label>
  <p class="muted">
    Wyświetlana na listach artykułów. Wybierz obraz niezależnie od treści artykułu.
  </p>
  {#if fileId}<img src={`/media/${encodeURIComponent(fileId)}`} alt={'Podgląd miniatury'} />{/if}
  {#if !disabled}
    <div class="controls">
      <label class="btn btn-outline upload" class:disabled={uploading}>
        <UploadCloud size={16} aria-hidden="true" />{uploading
          ? 'Przesyłanie…'
          : 'Wybierz miniaturę'}
        <input
          id={uid}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          disabled={uploading}
          onchange={(event) => void upload(event.currentTarget)}
        />
      </label>
      {#if fileId}<button
          type="button"
          class="btn btn-outline"
          disabled={uploading}
          onclick={() => (fileId = null)}><X size={16} aria-hidden="true" />Usuń miniaturę</button
        >{/if}
    </div>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .article-thumbnail {
    margin: 20px 0;
  }
  p {
    margin: 8px 0 12px;
    font-size: 12px;
  }
  img {
    display: block;
    width: 100%;
    max-width: 420px;
    max-height: 240px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: var(--radius-md);
    margin-bottom: 12px;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .upload {
    position: relative;
    overflow: hidden;
    text-transform: none;
    letter-spacing: normal;
  }
  .upload input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    margin: 0;
  }
  .upload:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .disabled {
    opacity: 0.5;
  }
</style>
