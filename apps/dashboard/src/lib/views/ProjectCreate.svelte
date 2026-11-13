<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import UserSelect from '$lib/UserSelect.svelte';
  import { api, errorMessage } from '$lib/api';
  import {
    Banner,
    Button,
    Heading,
    HStack,
    Section,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft } from '@lucide/svelte';
  import type { Project } from '$lib/types';

  const language = $derived(preferences.language);

  let title = $state('');
  let slug = $state('');
  let markdown = $state('');
  let leaderIds = $state<string[]>([]);
  let busy = $state(false);
  let error = $state('');

  async function create() {
    if (busy || !title.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Project>('/platform/projects', 'POST', {
        slug,
        name: title,
        description: markdown,
        tags: [],
        fields: ['engineering'],
        leaderIds
      });
      await goto(`/projects/${encodeURIComponent(result.slug || result.id)}`);
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={4}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <Heading level={1}>Nowy projekt</Heading>
    <Button href="/projects" variant="secondary" label="Wróć">
      {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      void create();
    }}
  >
    <Section padding={5} maxWidth={600}>
      <VStack gap={4}>
        <TextInput
          id="cp-title"
          label="Nazwa"
          value={title}
          onChange={(value) => (title = value)}
          isRequired
        />
        <TextInput id="cp-slug" label="Slug" value={slug} onChange={(value) => (slug = value)} />
        <VStack gap={2}>
          <Text type="label" weight="semibold">Liderzy</Text>
          <UserSelect bind:userIds={leaderIds} {api} />
        </VStack>
        <VStack gap={2}>
          <Text type="label" weight="semibold">Opis</Text>
          <Editor bind:value={markdown} />
        </VStack>
        <HStack>
          <Button
            type="submit"
            variant="primary"
            label="Utwórz projekt"
            isDisabled={busy || !title.trim()}
          />
        </HStack>
      </VStack>
    </Section>
  </form>
</VStack>
