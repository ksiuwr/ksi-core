<script lang="ts">
  import { X } from '@lucide/svelte';
  import {
    Avatar,
    Button,
    Divider,
    FileInput,
    Heading,
    HStack,
    Text,
    VStack
  } from '@astryx-sv/core';
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

  let busy = $state(false);
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

<VStack gap={4}>
  <Divider />
  <VStack gap={3}>
    <Heading level={3}>Zdjęcie profilowe</Heading>
    {#if request?.state === 'pending' && request.fileId}
      <HStack gap={3} vAlign="start">
        <Avatar
          src={`/media/${request.fileId}`}
          name="Oczekujące zdjęcie"
          size={64}
          shape="rounded"
        />
        <VStack gap={1} hAlign="start">
          <Text weight="semibold">Oczekuje na akceptację</Text>
          <Text type="supporting" color="secondary">
            Twoje obecne zdjęcie pozostaje widoczne, dopóki administrator nie podejmie decyzji.
          </Text>
          <Button
            variant="secondary"
            size="sm"
            label="Wycofaj prośbę"
            isDisabled={busy}
            onclick={() => void cancel()}
          >
            {#snippet icon()}<X size={14} aria-hidden="true" />{/snippet}
          </Button>
        </VStack>
      </HStack>
    {:else if request?.state === 'declined'}
      <Text role="status" type="supporting" color="secondary">
        Zdjęcie zostało odrzucone. Możesz przesłać inne.
      </Text>
    {/if}
    <FileInput
      label="Przeciągnij zdjęcie lub wybierz plik"
      isLabelHidden
      description="JPEG · PNG · WebP · AVIF · GIF · 5 MiB"
      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
      mode="dropzone"
      placeholder="Przeciągnij zdjęcie lub wybierz plik"
      value={null}
      isLoading={busy}
      isDisabled={busy}
      onChange={(files) => {
        if (files instanceof File) void upload(files);
      }}
    />
    <Text type="supporting" color="secondary">
      Każde nowe zdjęcie wymaga zatwierdzenia przez administratora.
    </Text>
  </VStack>
</VStack>
