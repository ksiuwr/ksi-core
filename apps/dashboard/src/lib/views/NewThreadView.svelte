<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import Assignees from '$lib/Assignees.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, threadPath, type Workspace } from '$lib/navigation';
  import type { Thread } from '$lib/types';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import {
    Banner,
    Button,
    Divider,
    Heading,
    HStack,
    Section,
    Selector,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft, MessageSquarePlus } from '@lucide/svelte';
  import { untrack } from 'svelte';

  let {
    workspace,
    projectSlug,
    projectId
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
  } = $props();
  const language = $derived(preferences.language);

  let title = $state('');
  let markdown = $state('');
  let visibility = $state(untrack(() => (projectId ? 'members' : 'association')));
  let assignees = $state<string[]>([]);
  let busy = $state(false);
  let error = $state('');

  async function create() {
    if (busy || !title.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Thread>('/platform/threads', 'POST', {
        assigneeIds: assignees,
        title: title.trim(),
        markdown,
        visibility,
        invitedIds: [],
        ...(projectId ? { projectId } : {})
      });
      await goto(threadPath(workspace, projectSlug, result.referenceNumber ?? result.id));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={4}>
  <Button href={dashboardPath(workspace, projectSlug, 'forum')} variant="secondary" label="Forum">
    {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
  </Button>

  <VStack as="header" gap={1}>
    <Heading level={1}>Nowy wątek</Heading>
    <Text as="p" class="workspace-description">
      Rozpocznij dyskusję i wybierz, kto może ją zobaczyć.
    </Text>
  </VStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      void create();
    }}
  >
    <HStack vAlign="start" gap={5} wrap="wrap">
      <Section padding={5} class="form-main">
        <VStack gap={5}>
          <TextInput
            id="new-thread-title"
            label="Temat"
            value={title}
            onChange={(value) => (title = value)}
            isRequired
          />
          <VStack gap={2}>
            <Text type="label" weight="semibold">Pierwszy post</Text>
            <Editor bind:value={markdown} rows={18} allowReferences />
          </VStack>
        </VStack>
      </Section>

      <Section padding={5} class="form-aside">
        <VStack gap={4}>
          <Selector
            id="new-thread-visibility"
            label="Widoczność"
            value={visibility}
            options={[
              { value: 'association', label: 'Członkowie koła' },
              ...(projectId ? [{ value: 'members', label: 'Członkowie projektu' }] : []),
              { value: 'leaders', label: 'Liderzy' }
            ]}
            width="100%"
            onChange={(value: string | null) => {
              if (value !== null) visibility = value;
            }}
          />
          <Divider />
          <Assignees {projectId} bind:value={assignees} disabled={busy} />
          <Divider />
          <VStack gap={2}>
            <Button
              type="submit"
              variant="primary"
              width="100%"
              label={busy ? 'Tworzenie…' : 'Utwórz wątek'}
              isDisabled={busy || !title.trim()}
            >
              {#snippet icon()}<MessageSquarePlus size={15} aria-hidden="true" />{/snippet}
            </Button>
            <Button
              href={dashboardPath(workspace, projectSlug, 'forum')}
              variant="secondary"
              width="100%"
              label="Anuluj"
            />
          </VStack>
        </VStack>
      </Section>
    </HStack>
  </form>
</VStack>

<style>
  :global(.form-main) {
    flex: 1 1 32rem;
    min-width: 0;
  }
  :global(.form-aside) {
    flex: 0 1 20rem;
    min-width: 0;
    position: sticky;
    top: 5.625rem;
  }
  @media (max-width: 61.25rem) {
    :global(.form-aside) {
      flex-basis: 100%;
      position: static;
    }
  }
</style>
