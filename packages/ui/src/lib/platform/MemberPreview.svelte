<script lang="ts">
  import { Avatar, Button, HStack, HoverCard, Link, Text, VStack } from '@astryx-sv/core';

  let {
    member,
    href,
    role = '',
    avatarOnly = false,
    size = 36,
    inline = false
  }: {
    member: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      nickname?: string | null;
      image?: string | null;
      bio?: string | null;
    };
    href: string;
    role?: string;
    avatarOnly?: boolean;
    size?: number;
    inline?: boolean;
  } = $props();

  const name = $derived(
    [member.firstName || member.name, member.lastName].filter(Boolean).join(' ')
  );
  const avatarSize = $derived(size <= 24 ? 'sm' : size <= 40 ? 'md' : 'lg');
</script>

<HoverCard
  label={name}
  placement="below"
  alignment="start"
  hasHoverIndication={false}
  content={preview}
>
  <Link
    {href}
    label={avatarOnly ? name : undefined}
    color="primary"
    class={inline ? 'inline-flex items-center gap-1 align-middle' : 'inline-flex'}
  >
    <HStack gap={avatarOnly ? 0 : 2} vAlign="center">
      <Avatar src={member.image ?? undefined} {name} size={avatarSize} />
      {#if !avatarOnly}
        <VStack gap={0}>
          <Text as="span" type="body" weight="medium" maxLines={1}>{name}</Text>
          {#if member.nickname}
            <Text as="span" type="supporting" color="secondary" maxLines={1}>
              aka. {member.nickname}
            </Text>
          {/if}
        </VStack>
      {/if}
    </HStack>
  </Link>
</HoverCard>

{#snippet preview()}
  <VStack gap={3} width={260}>
    <HStack gap={2} vAlign="center">
      <Avatar src={member.image ?? undefined} {name} size="lg" />
      <VStack gap={0}>
        <Text type="body" weight="semibold">{name}</Text>
        {#if member.nickname}
          <Text type="supporting" color="secondary">aka. {member.nickname}</Text>
        {/if}
        {#if role}
          <Text type="supporting" color="secondary">{role}</Text>
        {/if}
      </VStack>
    </HStack>
    <Text type="supporting" color="secondary">
      {member.bio || 'Brak biografii.'}
    </Text>
    <Button {href} variant="secondary" size="sm" label="Zobacz profil" />
  </VStack>
{/snippet}
