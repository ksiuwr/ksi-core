<script lang="ts">
  import { UploadCloud, X } from '@lucide/svelte';
  export type AvatarRequest = { state: string; fileId: string | null; version: number };
  let {
    request,
    onchange,
    reportError
  }: {
    request: AvatarRequest | null;
    onchange: () => Promise<void>;
    reportError: (error: string) => void;
  } = $props();

  let input = $state<HTMLInputElement>(),
    busy = $state(false),
    dragging = $state(false);
  async function upload(file: File | undefined) {
    if (!file || busy) return;
    reportError('');
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      reportError('Wybierz obraz JPEG, PNG, WebP, AVIF lub GIF do 5 MiB.');
      return;
    }
    busy = true;
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/files', { method: 'POST', body });
      const text = await response.text();
      let result: any = {};
      if (text)
        try {
          result = JSON.parse(text);
        } catch {}
      if (!response.ok) throw new Error(result.code ?? 'Przesyłanie nie powiodło się');
      const proposal = await fetch('/api/users/me/avatar-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileId: result.id })
      });
      const textData = await proposal.text();
      let data: any = {};
      if (textData)
        try {
          data = JSON.parse(textData);
        } catch {}
      if (!proposal.ok) throw new Error(data.code ?? 'Żądanie nie powiodło się');
      await onchange();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Przesyłanie nie powiodło się');
    } finally {
      busy = false;
      if (input) input.value = '';
    }
  }
  async function cancel() {
    busy = true;
    try {
      const response = await fetch('/api/users/me/avatar-request', { method: 'DELETE' });
      if (!response.ok) throw new Error('Żądanie nie powiodło się');
      await onchange();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Żądanie nie powiodło się');
    } finally {
      busy = false;
    }
  }
</script>

<div class="avatar-upload">
  <h3>Zdjęcie profilowe</h3>
  {#if request?.state === 'pending' && request.fileId}<div class="avatar-pending">
      <img src={`/media/${request.fileId}`} alt={'Zdjęcie oczekujące na akceptację'} />
      <div>
        <strong>Oczekuje na akceptację</strong>
        <p>Twoje obecne zdjęcie pozostaje widoczne, dopóki administrator nie podejmie decyzji.</p>
        <button type="button" class="btn btn-outline" disabled={busy} onclick={cancel}
          ><X size={14} aria-hidden="true" />Wycofaj prośbę</button
        >
      </div>
    </div>
  {:else if request?.state === 'declined'}<p class="avatar-feedback" role="status">
      Zdjęcie zostało odrzucone. Możesz przesłać inne.
    </p>{/if}
  <input
    bind:this={input}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
    disabled={busy}
    onchange={(event) => upload(event.currentTarget.files?.[0])}
    tabindex="-1"
    aria-hidden="true"
  />
  <button
    type="button"
    class="avatar-dropzone"
    class:dragging
    disabled={busy}
    onclick={() => input?.click()}
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(event) => {
      event.preventDefault();
      dragging = false;
      void upload(event.dataTransfer?.files[0]);
    }}
    ><UploadCloud size={21} aria-hidden="true" /><span
      >{busy ? 'Przesyłanie…' : 'Przeciągnij zdjęcie lub wybierz plik'}<small
        >JPEG · PNG · WebP · AVIF · GIF · 5 MiB</small
      ></span
    ></button
  >
  <p class="avatar-help">Każde nowe zdjęcie wymaga zatwierdzenia przez administratora.</p>
</div>

<style>
  .avatar-upload {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
  .avatar-upload h3 {
    font-size: 14px;
    margin-bottom: 16px;
  }
  .avatar-upload input {
    display: none;
  }
  .avatar-dropzone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 20px 12px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-lg);
    color: var(--muted);
    background: transparent;
    text-align: left;
    font-size: 12px;
    cursor: pointer;
  }
  .avatar-dropzone:hover,
  .avatar-dropzone.dragging {
    border-color: var(--accent);
    background: var(--surface-muted);
  }
  .avatar-dropzone small {
    display: block;
    margin-top: 6px;
    font-size: 10px;
  }
  .avatar-help,
  .avatar-feedback {
    color: var(--muted);
    font-size: 12px;
    margin-top: 12px;
  }
  .avatar-pending {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .avatar-pending img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: var(--radius-md);
    border: 1px solid var(--line);
  }
  .avatar-pending strong {
    font-size: 12px;
  }
  .avatar-pending p {
    font-size: 12px;
    color: var(--muted);
    margin: 8px 0;
  }
</style>
