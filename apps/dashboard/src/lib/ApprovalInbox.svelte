<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { Check, X, UserPlus, Image, Inbox } from '@lucide/svelte';
  import {
    Badge,
    Button,
    EmptyState,
    Heading,
    HStack,
    List,
    ListItem,
    Text,
    Thumbnail,
    VStack
  } from '@astryx-sv/core';
  import type { InboxData } from './types';
  export type { InboxData } from './types';
  let {
    inbox,
    administrator,
    refresh,
    reportError
  }: {
    inbox: InboxData;
    administrator: boolean;
    refresh: () => Promise<void>;
    reportError: (message: string) => void;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  async function review(
    kind: 'members' | 'avatars',
    id: string,
    approved: boolean,
    version?: number
  ) {
    busy = true;
    reportError('');
    try {
      const response = await fetch(`/api/users/inbox/${kind}/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved, ...(version ? { version } : {}) })
      });
      const text = await response.text();
      let result: any = {};
      if (text)
        try {
          result = JSON.parse(text);
        } catch {}
      if (!response.ok) throw new Error(result.code ?? 'Żądanie nie powiodło się');
      await refresh();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Żądanie nie powiodło się');
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={1}>
  <Heading level={1}>Skrzynka akceptacji</Heading>
  <Text color="secondary">Nowe konta i zdjęcia profilowe oczekujące na decyzję.</Text>
</VStack>

{#if inbox.memberships.length}
  <VStack gap={3}>
    <HStack gap={2} vAlign="center">
      <UserPlus size={19} aria-hidden="true" />
      <Heading level={2}>Nowe konta</Heading>
      <Badge label={String(inbox.memberships.length)} variant="neutral" />
    </HStack>
    <List hasDividers edge="bleed">
      {#each inbox.memberships as member (member.id)}
        <ListItem label={member.name || member.email}>
          {#snippet description()}
            <VStack gap={0}>
              <Text type="supporting" color="secondary">{member.email}</Text>
              <Text type="supporting" color="secondary">
                <time datetime={member.createdAt}>{formatDate(member.createdAt, language)}</time>
              </Text>
            </VStack>
          {/snippet}
          {#snippet endContent()}
            <HStack gap={2} wrap="wrap">
              <Button
                label="Aktywuj"
                isDisabled={busy}
                onclick={() => review('members', member.id, true)}
              >
                {#snippet icon()}<Check size={15} aria-hidden="true" />{/snippet}
              </Button>
              {#if administrator}
                <Button
                  variant="secondary"
                  label="Odrzuć"
                  isDisabled={busy}
                  onclick={() => review('members', member.id, false)}
                >
                  {#snippet icon()}<X size={15} aria-hidden="true" />{/snippet}
                </Button>
              {/if}
            </HStack>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  </VStack>
{/if}

{#if inbox.avatars.length}
  <VStack gap={3}>
    <HStack gap={2} vAlign="center">
      <Image size={19} aria-hidden="true" />
      <Heading level={2}>Zdjęcia profilowe</Heading>
      <Badge label={String(inbox.avatars.length)} variant="neutral" />
    </HStack>
    <List hasDividers edge="bleed">
      {#each inbox.avatars as avatar (avatar.userId)}
        <ListItem
          label={avatar.name}
          description="Nowe zdjęcie staje się publiczne po zatwierdzeniu."
        >
          {#snippet startContent()}
            <Thumbnail
              src={`/media/${avatar.fileId}`}
              alt={`Zaproponowany awatar: ${avatar.name}`}
              label={`Zaproponowany awatar: ${avatar.name}`}
            />
          {/snippet}
          {#snippet endContent()}
            <HStack gap={2} wrap="wrap">
              <Button
                label="Zatwierdź"
                isDisabled={busy}
                onclick={() => review('avatars', avatar.userId, true, avatar.version)}
              >
                {#snippet icon()}<Check size={15} aria-hidden="true" />{/snippet}
              </Button>
              <Button
                variant="secondary"
                label="Odrzuć"
                isDisabled={busy}
                onclick={() => review('avatars', avatar.userId, false, avatar.version)}
              >
                {#snippet icon()}<X size={15} aria-hidden="true" />{/snippet}
              </Button>
            </HStack>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  </VStack>
{/if}

{#if !inbox.memberships.length && !inbox.avatars.length}
  <EmptyState title="Wszystko sprawdzone" description="Nowe prośby pojawią się tu automatycznie.">
    {#snippet icon()}<Inbox size={30} aria-hidden="true" />{/snippet}
  </EmptyState>
{/if}
